using Epay3Net.Authorization;
using Epay3Net.Custom;
using Epay3Net.Custom.ActionResult;
using Epay3Net.Models;
using Epay3Net.RateLimiting;
using Epay3Service.Configuration;
using Epay3Service.Extensions;
using Epay3Service.Helpers;
using Epay3Service.Managers.Interfaces;
using Epay3Service.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Net.Http.Headers;
using PdfSharpCore.Pdf.IO;
using System.Globalization;
using System.IO.Compression;
using System.Net.Mime;
using System.Linq;

namespace Epay3Net.Controllers;

[Route("api/[controller]")]
[ApiController]
[Authorize]
public class InvoicesController(
    IInvoicesManager manager,
    IAccountManager accountManager,
    IUserManager userManager,
    IApplicationConfigurationManager appConfigurationManager,
    ILanguageManager languageManager,
    IAuthorizationService authorizationService,
    ApplicationSecrets appSecrets
    ) : ControllerBase
{
    private readonly IInvoicesManager manager = manager;
    private readonly IAccountManager accountManager = accountManager;
    private readonly IUserManager userManager = userManager;
    private readonly IApplicationConfigurationManager appConfigurationManager = appConfigurationManager;
    private readonly ILanguageManager languageManager = languageManager;
    private readonly IAuthorizationService authorizationService = authorizationService;
    private readonly ApplicationSecrets appSecrets = appSecrets;
    private readonly IUserClaimsPrincipalFactory<User> claimsPrincipalFactory = new EpayClaimsPrincipalFactory();

    [HttpPost]
    public async Task<IActionResult> Search([FromBody] InvoiceSearchRequest request, [FromQuery] string? lang = null)
    {
        try
        {
            var language = lang ?? CultureInfo.CurrentCulture.Name;

            if (!this.User.TryResolveRequestedUserId(request.UserId, out var userId))
            {
                return this.Unauthorized(this.languageManager.GetMessage("error.user.tokenfaliure", language, "User not found"));
            }

            if (!this.User.CanAccessRequestedUserId(userId))
            {
                return this.Forbid();
            }

            User? user = await this.userManager.GetUserById(userId, language);
            if (user == null)
            {
                return this.Unauthorized(this.languageManager.GetMessage("error.user.tokenfaliure", language, "User not found"));
            }

            List<Account>? accounts = await this.accountManager.GetLinkedAccountsByUser(user, language);
            if (accounts == null || accounts.Count == 0 ||
                !accounts.Any(x => x.PrimaryAcct == request.SelectedAccount &&
                    (request.CompanyCode.IsNullOrWhiteSpace() || x.CompanyCode == request.CompanyCode) &&
                    (request.SalesOrganization.IsNullOrWhiteSpace() || x.SalesOrganization == request.SalesOrganization)))
            {
                return this.Unauthorized(this.languageManager.GetMessage("error.user.accountnotallowed", language, "Account not allowed"));
            }

            Account? account = this.accountManager.FindLinkedAccount(
                accounts,
                request.SelectedAccount,
                request.CompanyCode,
                request.SalesOrganization);
            if (account == null)
            {
                return this.Unauthorized(this.languageManager.GetMessage("error.user.accountnotallowed", language, "Account not allowed"));
            }

            user.Accounts = accounts;

            System.Security.Claims.ClaimsPrincipal userPrincipal = await this.claimsPrincipalFactory.CreateAsync(user);
            AuthorizationResult authorizationResult = await this.authorizationService.AuthorizeAsync(userPrincipal, request.SelectedAccount, UserOperations.UserAccount);
            if (!authorizationResult.Succeeded)
            {
                return this.Unauthorized(this.languageManager.GetMessage("error.user.accountnotallowed", language, "Account not allowed"));
            }

            var searchRequest = new InvoicesSearch
            {
                InvoicesSearchParameters = new InvoicesSearchParameters
                {
                    DateFrom = request.From == null ? "01-01-1900" : request.From?.ToString("MM-dd-yyyy"),
                    DateTo = request.To == null ? DateTime.Now.ToString("MM-dd-yyyy") : request.To?.ToString("MM-dd-yyyy"),
                    Filter = request.Filters?
                           .Select(f => new InvoicesFilter
                           {
                               FilterType = f.FilterType,
                               Value = f.Value
                           })
                                 .ToList()
                               ?? new List<InvoicesFilter>(),
                    DocumentType = request.documentType,
                    Status = request.Status,
                    DueDateFrom = request.DueDateFrom == null ? "" : request.DueDateFrom?.ToString("MM-dd-yyyy"),
                    DueDateTo = request.DueDateTo == null ? "" : request.DueDateTo?.ToString("MM-dd-yyyy"),
                    CurrencyKey = request.CurrencyKey == "All" ? null : request.CurrencyKey,
                }
            };

            List<Invoice>? data = await this.manager.Search(user, account, searchRequest, request.SubAccounts, language);

            if (request.ExcludePayments)
            {
                data = data?.Where(invoice => invoice.ItemIsAPayment != "X").ToList();
            }

            if (request.ExcludeCredits)
            {
                data = data?
                        .Where(invoice =>
                            invoice.TotalAmount.HasValue &&
                            (invoice.TotalAmount.Value - (invoice.PaidAmount ?? 0)) >= 0
                        )
                        .ToList();
            }

            EncryptScheduledPaymentDetails(data, this.appSecrets.EncryptionKey);

            return this.Ok(data ?? new List<Invoice>());
        }
        catch (Exception ex)
        {
            return new ExceptionResult(ex);
        }
    }

    private static void EncryptScheduledPaymentDetails(
        List<Invoice>? invoices,
        string encryptionKey)
    {
        if (invoices == null || invoices.Count == 0)
        {
            return;
        }

        foreach (var invoice in invoices)
        {
            var paymentDetail = invoice.scheduledIdDetails?.PaymentDetail;
            if (paymentDetail == null || string.IsNullOrWhiteSpace(paymentDetail.PaymentCardToken))
            {
                continue;
            }

            paymentDetail.PaymentCardToken = EncryptToken(paymentDetail.PaymentCardToken, encryptionKey);
        }
    }

    private static string? EncryptToken(string? token, string encryptionKey)
    {
        if (string.IsNullOrEmpty(token))
        {
            return token;
        }

        return Encryption.Encrypt(token, encryptionKey);
    }

    [HttpPost("pdf/request")]
    public async Task<IActionResult> GetInvoicePdf([FromBody] InvoicePdfDownloadRequest request, [FromQuery] string? lang = null)
    {
        try
        {
            var language = lang ?? CultureInfo.CurrentCulture.Name;

            if (!this.User.TryResolveRequestedUserId(request.UserId, out var userId))
            {
                return this.Unauthorized(this.languageManager.GetMessage("error.user.tokenfaliure", language, "User not found"));
            }

            if (!this.User.CanAccessRequestedUserId(userId))
            {
                return this.Forbid();
            }

            User? user = await this.userManager.GetUserById(userId, language);
            if (user == null)
            {
                return this.Unauthorized(this.languageManager.GetMessage("error.user.tokenfaliure", language, "User not found"));
            }

            List<Account>? accounts = await this.accountManager.GetLinkedAccountsByUser(user, language);
            if (accounts == null || accounts.Count == 0 ||
                !accounts.Any(x => x.PrimaryAcct == request.PrimaryAccount &&
                    (request.CompanyCode.IsNullOrWhiteSpace() || x.CompanyCode == request.CompanyCode)))
            {
                return this.Unauthorized(this.languageManager.GetMessage("error.user.accountnotallowed", language, "Account not allowed"));
            }
            user.Accounts = accounts;

            Account? account = this.accountManager.FindLinkedAccount(
               accounts,
               request.PrimaryAccount,
               request.CompanyCode);
            if (account == null)
            {
                return this.Unauthorized(this.languageManager.GetMessage("error.user.accountnotallowed", language, "Account not allowed"));
            }

            System.Security.Claims.ClaimsPrincipal userPrincipal = await this.claimsPrincipalFactory.CreateAsync(user);
            AuthorizationResult authorizationResult = await this.authorizationService.AuthorizeAsync(userPrincipal, request.PrimaryAccount, UserOperations.UserAccount);
            if (!authorizationResult.Succeeded)
            {
                return this.Unauthorized(this.languageManager.GetMessage("error.user.accountnotallowed", language, "Account not allowed"));
            }

            var payload = new DocumentDetail
            {
                CustomerNumber = request.CustomerNumber.TrimStart('0'),
                DocumentNumber = request.DocumentNumber,
                DocumentType = "01",
            };

            var token = JwtTokenHelper.GetPayloadToken(payload, this.appSecrets.RequestsTokenKey, DateTime.UtcNow.AddHours(1));

            return this.Ok(new { token });

        }
        catch (Exception ex)
        {
            return new ExceptionResult(ex);
        }
    }

    [HttpGet("{language}/pdf")]
    [AllowAnonymous]
    [EnableRateLimiting(RateLimitPolicyNames.PublicConfig)]
    public async Task<IActionResult> GetPdf([FromRoute] string language, [FromQuery] string token)
    {
        try
        {
            DocumentDetail? documentDetails = JwtTokenHelper.GetPayloadFromToken<DocumentDetail>(token, this.appSecrets.RequestsTokenKey);

            if (documentDetails == null)
            {
                return this.BadRequest(this.languageManager.GetMessage("error.pdfnotfound", language, "PDF not found."));
            }

            var pdf = await this.manager.GetInvoicePdf(documentDetails, language);

            if (pdf == null)
            {
                return this.BadRequest(this.languageManager.GetMessage("error.pdfnotfound", language, "PDF not found."));
            }

            pdf = SetPdfMetadata(pdf, "PDF");

            var cd = new ContentDisposition
            {
                FileName = $"{documentDetails.DocumentNumber}.pdf",
                Inline = true,
            };
            this.Response.Headers.Append("Content-Disposition", cd.ToString());
            this.Response.Headers.Append("X-Content-Type-Options", "nosniff");

            return this.File(pdf, "application/pdf");
        }
        catch (Exception ex)
        {
            return new ExceptionResult(ex);
        }

    }

    [HttpPost("bulk-pdf")]
    [EnableRateLimiting(RateLimitPolicyNames.PublicConfig)]
    public async Task<IActionResult> GetBulkPdf([FromBody] List<InvoiceBulkPdfRequest> requests, [FromQuery] string? lang = null)
    {
        try
        {
            var language = lang ?? CultureInfo.CurrentCulture.Name;
            var bulkPdfs = new List<byte[]>();
            string tempDirectory = Path.Combine(Path.GetTempPath(), Path.GetRandomFileName());
            Directory.CreateDirectory(tempDirectory);
            string zipPath = Path.Combine(Path.GetTempPath(), Path.GetRandomFileName());

            foreach (InvoiceBulkPdfRequest request in requests)
            {
                // Construct payload and retrieve PDF data
                var documentDetails = new DocumentDetail
                {
                    CustomerNumber = request.CustomerNumber.TrimStart('0'),
                    DocumentNumber = request.DocumentNumber,
                    DocumentType = "01",
                };

                var token = JwtTokenHelper.GetPayloadToken(documentDetails, this.appSecrets.RequestsTokenKey, DateTime.UtcNow.AddHours(1));

                if (documentDetails == null)
                {
                    return this.BadRequest(this.languageManager.GetMessage("error.pdfnotfound", language, "PDF not found."));
                }

                var pdf = await this.manager.GetInvoicePdf(documentDetails, language);
                if (pdf != null)
                {
                    bulkPdfs.Add(pdf);
                }
            }

            // Create a ZIP file containing the PDFs
            var zipFileBytes = await this.CreateZipFile(bulkPdfs);

            // Return the ZIP file
            return this.File(zipFileBytes, "application/octet-stream", "bulk_invoices.zip");
        }
        catch (Exception ex)
        {
            return new ExceptionResult(ex);
        }
    }

    [HttpPost("GetInvoiceSearch")]
    [AllowAnonymous]
    [EnableRateLimiting(RateLimitPolicyNames.GuestPayment)]
    public async Task<IActionResult> InvoicesSearch([FromBody] InvoiceRequestBody request)
    {
        try
        {
            if (!this.User.Identity?.IsAuthenticated == true && request.PayerData != null)
            {
                var validatedAccounts = request.ValidatedAccounts ?? new List<ValidateInvoiceAccount>();

                var isAuthorized = validatedAccounts.Any(a =>
                    a.AccountNumber?.TrimStart('0') == request.PayerData.CustomerNumber?.TrimStart('0') &&
                    a.InvoiceDetail?.HeaderData?.CompanyCode?.TrimStart('0') == request.PayerData.CompanyCode?.TrimStart('0'));

                if (!isAuthorized)
                {
                    var language = this.Request.Headers["Accept-Language"].ToString() ?? "en";
                    return this.Unauthorized(this.languageManager.GetMessage("error.guest.validation_required_search", language, "You must validate an invoice for this account before searching."));
                }
            }

            var searchRequest = new InvoicesSearch
            {
                Payer = new Payer
                {
                    CustomerNumber = request.PayerData.CustomerNumber,
                    CompanyCode = request.PayerData.CompanyCode,
                },
                InvoicesSearchParameters = new InvoicesSearchParameters
                {
                    DocumentType = "01",
                    Status = request.SearchParameters.Status,
                    DateFrom = request.SearchParameters.DateFrom == null ? "01-01-1990" : request.SearchParameters.DateFrom?.ToString("MM-dd-yyyy"),
                    DateTo = request.SearchParameters.DateTo == null ? DateTime.Now.ToString("MM-dd-yyyy") : request.SearchParameters.DateTo?.ToString("MM-dd-yyyy"),
                    DueDateFrom = request.SearchParameters.DueDateFrom == null ? "" : request.SearchParameters.DueDateFrom?.ToString("MM-dd-yyyy"),
                    DueDateTo = request.SearchParameters.DueDateTo == null ? "" : request.SearchParameters.DueDateTo?.ToString("MM-dd-yyyy"),
                    SoldToSearchParams = request.SearchParameters.SoldToSearchParams == null ? [""] : request.SearchParameters.SoldToSearchParams,
                    CurrencyKey = request.SearchParameters.Currency == "All" ? "all" : request.SearchParameters.Currency,
                    Filter = new List<InvoicesFilter>

                    {
                        new() {
                            FilterType=request.SearchParameters.Filters[0].FilterType,
                            Value=request.SearchParameters.Filters[0].Value
                        }
                    },

                }
            };

            List<Invoice>? data = await this.manager.InvoiceSearch(searchRequest);

            // Return the data
            return this.Ok(data ?? new List<Invoice>());
        }
        catch (Exception ex)
        {
            // Return an error result
            return new ExceptionResult(ex);
        }
    }
    [HttpPost]
    [Route("GetPaymentsHistory")]
    public async Task<IActionResult> GetPaymentHistory([FromBody] InvoiceSearchRequest request, [FromQuery] string? lang = null)
    {
        try
        {
            var language = lang ?? CultureInfo.CurrentCulture.Name;
            if (!this.User.TryResolveRequestedUserId(request.UserId, out var userId))
            {
                return this.Unauthorized(this.languageManager.GetMessage("error.user.tokenfaliure", language, "User not found"));
            }

            if (!this.User.CanAccessRequestedUserId(userId))
            {
                return this.Forbid();
            }

            User? user = await this.userManager.GetUserById(userId, language);
            if (user == null)
            {
                return this.Unauthorized(this.languageManager.GetMessage("error.user.tokenfaliure", language, "User not found"));
            }

            List<Account>? accounts = await this.accountManager.GetLinkedAccountsByUser(user, language);
            if (accounts == null || accounts.Count == 0 ||
                !accounts.Any(x => x.PrimaryAcct == request.SelectedAccount &&
                    (request.CompanyCode.IsNullOrWhiteSpace() || x.CompanyCode == request.CompanyCode)))
            {
                return this.Unauthorized(this.languageManager.GetMessage("error.user.accountnotallowed", language, "Account not allowed"));
            }
            user.Accounts = accounts;

            Account? account = this.accountManager.FindLinkedAccount(
                 accounts,
                 request.SelectedAccount,
                 request.CompanyCode);
            if (account == null)
            {
                return this.Unauthorized(this.languageManager.GetMessage("error.user.accountnotallowed", language, "Account not allowed"));
            }


            System.Security.Claims.ClaimsPrincipal userPrincipal = await this.claimsPrincipalFactory.CreateAsync(user);
            AuthorizationResult authorizationResult = await this.authorizationService.AuthorizeAsync(userPrincipal, request.SelectedAccount, UserOperations.UserAccount);
            if (!authorizationResult.Succeeded)
            {
                return this.Unauthorized(this.languageManager.GetMessage("error.user.accountnotallowed", language, "Account not allowed"));
            }

            var searchRequest = new InvoicesSearch
            {
                InvoicesSearchParameters = new InvoicesSearchParameters
                {
                    DateFrom = request.From == null ? "01-01-1900" : request.From?.ToString("MM-dd-yyyy"),
                    DateTo = request.To == null ? DateTime.Now.ToString("MM-dd-yyyy") : request.To?.ToString("MM-dd-yyyy"),
                    Filter = request.Filters?
                           .Select(f => new InvoicesFilter
                           {
                               FilterType = f.FilterType,
                               Value = f.Value
                           })
                                 .ToList()
                               ?? new List<InvoicesFilter>(),
                    DocumentType = request.documentType,
                    Status = request.Status,
                    DueDateFrom = request.DueDateFrom == null ? "" : request.DueDateFrom?.ToString("MM-dd-yyyy"),
                    DueDateTo = request.DueDateTo == null ? "" : request.DueDateTo?.ToString("MM-dd-yyyy"),
                    CurrencyKey = request.CurrencyKey == "All" ? null : request.CurrencyKey,
                }
            };

            WebAR.Service.Services.API.Models.PaymentInvoiceResponse data = await this.manager.GetPayments(user, account, searchRequest, request.SubAccounts, language);

            EncryptScheduledPaymentDetails(data, this.appSecrets.EncryptionKey);

            return this.Ok(data ?? new WebAR.Service.Services.API.Models.PaymentInvoiceResponse());
        }
        catch (Exception ex)
        {
            return new ExceptionResult(ex);
        }
    }

    private static void EncryptScheduledPaymentDetails(
        WebAR.Service.Services.API.Models.PaymentInvoiceResponse? paymentHistory,
        string encryptionKey)
    {
        if (paymentHistory?.PaymentList == null || paymentHistory.PaymentList.Count == 0)
        {
            return;
        }

        foreach (var payment in paymentHistory.PaymentList)
        {
            if (string.IsNullOrWhiteSpace(payment.PaymentCardToken))
            {
                continue;
            }

            payment.PaymentCardToken = EncryptToken(payment.PaymentCardToken, encryptionKey);
        }
    }

    [HttpPost("details")]
    [AllowAnonymous]
    [EnableRateLimiting(RateLimitPolicyNames.GuestPayment)]
    public async Task<IActionResult> GetInvoiceDetails([FromBody] InvoiceDetailRequest detailRequest)
    {
        try
        {
            if (!this.User.Identity?.IsAuthenticated == true)
            {
                var validatedAccounts = detailRequest.ValidatedAccounts ?? new List<ValidateInvoiceAccount>();

                var isAuthorized = validatedAccounts.Any(a =>
                    a.AccountNumber?.TrimStart('0') == detailRequest.CustomerNumber?.TrimStart('0') &&
                    a.InvoiceNumber?.TrimStart('0') == detailRequest.DocumentNumber?.TrimStart('0'));

                if (!isAuthorized)
                {
                    var language = this.Request.Headers["Accept-Language"].ToString() ?? "en";
                    return this.Unauthorized(this.languageManager.GetMessage("error.guest.validation_required_details", language, "You must validate this invoice before viewing its details."));
                }
            }

            var documentDetail = new DocumentDetail
            {
                CustomerNumber = detailRequest.CustomerNumber,
                DocumentNumber = detailRequest.DocumentNumber,
                DocumentType = "01",
            };

            InvoiceDetailResponse? invoice = await this.manager.GetInvoiceDetails(documentDetail);

            if (invoice?.Detail == null)
            {
                return this.NotFound(new { message = "Invoice details not found." });
            }

            return this.Ok(invoice);
        }
        catch (Exception)
        {
            // Log the exception for debugging
            return this.StatusCode(500, new { message = "An error occurred while processing your request." });
        }
    }

    private async Task<byte[]> CreateZipFile(List<byte[]> pdfs)
    {
        using (var memoryStream = new MemoryStream())
        {
            using (var zipArchive = new ZipArchive(memoryStream, ZipArchiveMode.Create, true))
            {
                for (int i = 0; i < pdfs.Count; i++)
                {
                    var pdfBytes = pdfs[i];
                    ZipArchiveEntry entry = zipArchive.CreateEntry($"invoice_{i}.pdf", CompressionLevel.Optimal);
                    using (Stream entryStream = entry.Open())
                    {
                        await entryStream.WriteAsync(pdfBytes, 0, pdfBytes.Length);
                    }
                }
            }
            return memoryStream.ToArray();
        }
    }

    private static byte[] SetPdfMetadata(byte[] pdfBytes, string title)
    {
        using var inputStream = new MemoryStream(pdfBytes);
        using var document = PdfReader.Open(inputStream, PdfDocumentOpenMode.Modify);

        document.Info.Title = title;

        using var outputStream = new MemoryStream();
        document.Save(outputStream);
        return outputStream.ToArray();
    }
}
public class TempPhysicalFileResult : PhysicalFileResult
{
    public TempPhysicalFileResult(string fileName, string contentType)
        : base(fileName, contentType) { }
    public TempPhysicalFileResult(string fileName, MediaTypeHeaderValue contentType)
        : base(fileName, contentType) { }

    public override async Task ExecuteResultAsync(ActionContext context)
    {
        await base.ExecuteResultAsync(context);
        File.Delete(this.FileName);
    }
}
