using Epay3Service.Clients.Interfaces;
using Epay3Service.Managers.Interfaces;
using Epay3Service.Models;
using WebAR.Service.Services.API.Models;
using System.Globalization;

namespace Epay3Service.Managers;

public class InvoicesManager(
    ISalesforceHttpClient sfClient,
    ISapHttpClient client,
    IAccountManager accountManager,
    ILanguageManager languageManager
    ) : IInvoicesManager
{
    private readonly ISalesforceHttpClient sfClient = sfClient;
    private readonly ISapHttpClient client = client;
    private readonly IAccountManager accountManager = accountManager;
    private readonly ILanguageManager languageManager = languageManager;

    public async Task<List<Invoice>?> Search(User user, Account? selectedAccount, InvoicesSearch searchRequest, List<string>? payers, string language = "en")
    {
        if (user == null || selectedAccount?.PrimaryAcct == null)
        {
            throw new ArgumentNullException(this.languageManager.GetMessage("error.invoice.invaliduseraccount", language, "Invalid arguments"));
        }

        List<RelatedAccount>? relatedAccounts = await this.accountManager.GetRelatedAccounts(user, selectedAccount, language);

        if (user.PrimaryAccountType.Equals("Payer", StringComparison.InvariantCultureIgnoreCase))
        {
            if (payers != null && payers.Count > 0 && relatedAccounts != null)
            {
                relatedAccounts = [.. relatedAccounts.Where(x => x.PrimaryAccount != null && payers.Contains(x.PrimaryAccount.TrimStart('0')))];
            }

            var relatedCompanyCodes = relatedAccounts?.Select(acct => acct.CompanyCode).Where(cc => !string.IsNullOrWhiteSpace(cc)).Distinct().ToArray() ?? Array.Empty<string>();
            var companyCode = relatedCompanyCodes.Length > 0 ? string.Join(",", relatedCompanyCodes) : selectedAccount.CompanyCode;
            if (string.IsNullOrWhiteSpace(companyCode))
            {
                companyCode = selectedAccount.CompanyCode;
            }

            searchRequest.Payer = new Payer
            {
                CustomerNumber = selectedAccount.PrimaryAcct,
                CompanyCode = companyCode,
            };

            searchRequest.SoldToAccount ??= selectedAccount;

            List<Invoice>? invoices = await this.SearchInvoices(searchRequest, language);


            if (invoices != null)
            {
                var allowedPrimaryAccounts = new List<string>
                {
                    selectedAccount.PrimaryAcct.TrimStart('0')
                };

                if (relatedAccounts != null)
                {
                    allowedPrimaryAccounts.AddRange(relatedAccounts
                        .Select(x => x.PrimaryAccount?.TrimStart('0'))
                        .Where(x => !string.IsNullOrEmpty(x))!);
                }

                invoices = [.. invoices.Where(x =>
                    (x.SoldtoNumber != null && allowedPrimaryAccounts.Contains(x.SoldtoNumber.TrimStart('0'))) ||
                    (x.PayerNumber != null && allowedPrimaryAccounts.Contains(x.PayerNumber.TrimStart('0')))
                )];
            }

            return invoices?.Distinct().ToList();
        }
        else
        {
            if (payers == null || payers.Count == 0 || relatedAccounts == null || relatedAccounts.Count == 0)
            {
                throw new ArgumentNullException(this.languageManager.GetMessage("error.invoice.invaliduseraccount", language, "Invalid arguments"));
            }

            RelatedAccount payer = relatedAccounts.Single(x => x.PrimaryAccount?.TrimStart('0') == payers.First());

            searchRequest.SoldToAccount = selectedAccount;

            searchRequest.Payer = new Payer
            {
                CustomerNumber = payer.PrimaryAccount?.TrimStart('0'),
                CompanyCode = selectedAccount.CompanyCode
            };

            List<Invoice>? invoices = await this.SearchInvoices(searchRequest, language);
            return invoices?.Distinct().ToList();
        }

    }

    public async Task<PaymentInvoiceResponse>? GetPayments(User user, Account? selectedAccount, InvoicesSearch searchRequest, List<string>? payers, string language = "en")
    {
        if (user == null || selectedAccount == null)
        {
            throw new ArgumentNullException(this.languageManager.GetMessage("error.invoice.invaliduseraccount", language, "Invalid arguments"));
        }

        List<RelatedAccount>? relatedAccounts = await this.accountManager.GetRelatedAccounts(user, selectedAccount, language);

        if (user.PrimaryAccountType.Equals("Payer", StringComparison.InvariantCultureIgnoreCase))
        {
            searchRequest.Payer = new Payer
            {
                CustomerNumber = selectedAccount.PrimaryAcct,
                CompanyCode = selectedAccount.CompanyCode
            };

            // Ensure GetPaymentList returns a JSON string
            PaymentInvoiceResponse invoices = await this.GetPaymentList(searchRequest, language);

            // Deserialize the JSON response to a list of Invoice objects
            //     var invoices = JsonConvert.DeserializeObject<List<PaymentInvoiceResponse>>(jsonResponse);

            // Uncomment and use the following block if you need to filter invoices by subNumbers
            // if (relatedAccounts != null && invoices != null)
            // {
            //     var subNumbers = relatedAccounts.Select(x => x.PrimaryAccount).ToList();
            //     invoices = invoices.Where(x => subNumbers.Contains(x.PrimaryAccount?.TrimStart('0'))).ToList();
            // }

            return invoices;
        }
        else
        {
            if (payers == null || payers.Count == 0 || relatedAccounts == null || relatedAccounts.Count == 0)
            {
                throw new ArgumentNullException(this.languageManager.GetMessage("error.invoice.invaliduseraccount", language, "Invalid arguments"));
            }

            RelatedAccount payer = relatedAccounts.Single(x => x.PrimaryAccount?.TrimStart('0') == payers.First());

            searchRequest.SoldToAccount = selectedAccount;

            searchRequest.Payer = new Payer
            {
                CustomerNumber = payer.PrimaryAccount?.TrimStart('0'),
                CompanyCode = selectedAccount.CompanyCode
            };

            // Ensure GetPaymentList returns a JSON string
            PaymentInvoiceResponse invoices = await this.GetPaymentList(searchRequest, language);

            // Deserialize the JSON response to a list of Invoice objects
            //       var invoices = jsonResponse.

            return invoices;
        }
    }

    public async Task<List<Invoice>?> InvoiceSearch(InvoicesSearch request, string language = "en")
    {

        // Set up search criteria based on the request data
        var searchRequest = new InvoicesSearch
        {
            InvoicesSearchParameters = new InvoicesSearchParameters
            {
                DocumentType = "01",
                Status = request.InvoicesSearchParameters.Status,
                DateFrom = request.InvoicesSearchParameters.DateFrom == null ? "01-01-1900" : request.InvoicesSearchParameters.DateFrom,
                DateTo = request.InvoicesSearchParameters.DateTo,
                DueDateFrom = request.InvoicesSearchParameters.DueDateFrom,
                DueDateTo = request.InvoicesSearchParameters.DueDateTo,

                Filter = request.InvoicesSearchParameters.Filter,
                //Status = search.,
                CurrencyKey = request.InvoicesSearchParameters.CurrencyKey,
                SoldToSearchParams = request.InvoicesSearchParameters.SoldToSearchParams,

            },
            Payer = new Payer
            {
                CustomerNumber = request.Payer.CustomerNumber,
                CompanyCode = request.Payer.CompanyCode,
            },

        };

        // Perform the invoice search using the request data
        List<Invoice>? invoices = await this.SearchInvoices(searchRequest, language);


        // Ensure the results are distinct and return them
        return invoices?.Distinct().ToList();
    }


    public async Task<byte[]?> GetInvoicePdf(DocumentDetail request, string language = "en")
    {
        var pdf = await this.client.GetPdf("CNBS_PDF_PATH", new InvoicePdfRequest { DocumentDetail = request }, language);
        return pdf;

    }

    private async Task<List<Invoice>?> SearchInvoices(InvoicesSearch request, string language)
    {
        var queryParams = new Dictionary<string, string?>();
        //Required params
        queryParams["payer_number"] = request.Payer?.CustomerNumber;
        queryParams["company_code"] = request.Payer?.CompanyCode;
        queryParams["document_type"] = request.InvoicesSearchParameters?.DocumentType;
        queryParams["document_search_status"] = request.InvoicesSearchParameters?.Status;
        queryParams["date_from"] = request.InvoicesSearchParameters?.DateFrom;
        queryParams["date_to"] = request.InvoicesSearchParameters?.DateTo;

        //Optional params           
        queryParams["soldto_number"] = request.SoldToAccount?.PrimaryAcct?.TrimStart('0');
        queryParams["sales_organization"] = request.SoldToAccount?.SalesOrganization;
        queryParams["distribution_channel"] = request.SoldToAccount?.DistributionChannel;
        queryParams["division"] = request.SoldToAccount?.Division;

        queryParams["due_date_from"] = request.InvoicesSearchParameters?.DueDateFrom;
        queryParams["due_date_to"] = request.InvoicesSearchParameters?.DueDateTo;
        queryParams["currency_key"] = request.InvoicesSearchParameters?.CurrencyKey;
        queryParams["SoldTo_SearchParams"] = request.InvoicesSearchParameters?.SoldToSearchParams?.ToString();
        int i = 1;
        if (request.InvoicesSearchParameters?.Filter != null)
        {
            foreach (InvoicesFilter filter in request.InvoicesSearchParameters.Filter)
            {
                queryParams["filter_type_" + i] = filter.FilterType;
                queryParams["filter_value_" + i] = filter.Value;
                i++;
            }
        }

        var sfInvoices = new List<Invoice>();
        bool sfSuccess = false;

        try
        {
            var rawCompanyCode = queryParams.GetValueOrDefault("company_code");
            var companyCodes = !string.IsNullOrWhiteSpace(rawCompanyCode)
                ? rawCompanyCode.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).Distinct().ToList()
                : new List<string>();

            if (companyCodes.Count == 0 && !string.IsNullOrWhiteSpace(request.SoldToAccount?.CompanyCode))
            {
                companyCodes = request.SoldToAccount.CompanyCode
                    .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                    .Distinct()
                    .ToList();
            }

            var codesToQuery = companyCodes.Count > 0 ? companyCodes : new List<string> { "" };

            foreach (var cc in codesToQuery)
            {
                var sfQueryParams = new Dictionary<string, string?>(queryParams)
                {
                    ["payer_number"] = request.Payer?.CustomerNumber?.TrimStart('0'),
                    ["soldto_number"] = request.SoldToAccount?.PrimaryAcct?.TrimStart('0')
                };

                if (!string.IsNullOrEmpty(cc))
                {
                    sfQueryParams["company_code"] = cc;
                }

                if (!string.IsNullOrEmpty(request.SoldToAccount?.SalesOrganization))
                {
                    sfQueryParams["sales_organization"] = request.SoldToAccount.SalesOrganization;
                }

                if (!sfQueryParams.TryGetValue("document_type", out var dt) || string.IsNullOrWhiteSpace(dt) || dt == "01")
                {
                    sfQueryParams["document_type"] = "F2";
                }

                if (!sfQueryParams.TryGetValue("document_search_status", out var dss) || string.IsNullOrWhiteSpace(dss))
                {
                    sfQueryParams["document_search_status"] = "01";
                }

                var sfResp = await this.sfClient.Get<List<Invoice>>("CNBS_INVOICE_LIST_PATH", sfQueryParams, language);
                if (sfResp?.Data != null)
                {
                    sfSuccess = true;
                    foreach (var inv in sfResp.Data)
                    {
                        inv.PdfDocumentAvailable ??= "X";
                        sfInvoices.Add(inv);
                    }
                }
            }
        }
        catch
        {
            // Fall back to SAP
        }

        if (sfSuccess && sfInvoices.Count > 0)
        {
            return sfInvoices.Distinct().ToList();
        }

        try
        {
            var sapResponse = await this.client.Get<List<Invoice>>("CNBS_INVOICE_LIST_PATH", queryParams, language);
            if (sapResponse?.Data != null && sapResponse.Data.Count > 0)
            {
                return sapResponse.Data;
            }
        }
        catch
        {
            // ignore
        }

        return sfInvoices.Count > 0 ? sfInvoices.Distinct().ToList() : null;
    }

    public async Task<InvoiceDetailResponse?> GetInvoiceDetails(DocumentDetail request, string language = "en")
    {
        var queryParams = new Dictionary<string, string?>
        {
            {"billing_document_number", request.DocumentNumber},
            {"document_type", request.DocumentType},
            {"customer_number", request.CustomerNumber},
        };

        var sfQueryParams = new Dictionary<string, string?>
        {
            {"billing_document_number", request.DocumentNumber?.TrimStart('0')},
            {"document_type", request.DocumentType},
            {"customer_number", request.CustomerNumber?.TrimStart('0')},
        };

        Clients.Models.SapHttpData<InvoiceDetailResponse?>? response = null;
        try
        {
            response = await this.sfClient.GetData<InvoiceDetailResponse>("CNBS_INVOICE_DETAIL_PATH", sfQueryParams, language);
        }
        catch
        {
            // Fall back to SAP
        }

        if (response?.Data?.Detail == null)
        {
            try
            {
                response = await this.client.GetData<InvoiceDetailResponse>("CNBS_INVOICE_DETAIL_PATH", queryParams, language);
            }
            catch
            {
                // ignore
            }
        }

        return response?.Data;
    }

    //public async Task<List<Invoice>?> GetPaymentHistory(InvoicesSearch request, string language = "en")
    //{
    //    var documentLists = new List<dynamic>();
    //    List<Invoice>? response;

    //    if (request.SoldToAccount == null)
    //    {
    //        response = await GetPaymentList(request, language);

    //        return response;
    //    }

    //    response = await GetPaymentList(request, language);
    //    //if (!IsSearchQuery(request) || response.DocumentList.Any()) return response;
    //    ////Research with different filter type
    //    //request = SwapSearchFilterType(request);
    //    //response = await paymentSearch(request, documentLists, language);

    //return response;

    //    //var response = await _client.Get<Invoice>("CNBS_GET_PAYMENT_INVOICE_LIST_URL", queryParams, language);

    //    return response?.Distinct().ToList();
    //}

    private async Task<PaymentInvoiceResponse> GetPaymentList(InvoicesSearch request, string language)
    {
        var queryParams = new Dictionary<string, string?>();

        //Required params
        queryParams["payer_number"] = request.Payer?.CustomerNumber;
        queryParams["company_code"] = request.Payer?.CompanyCode;
        queryParams["document_type"] = request.InvoicesSearchParameters?.DocumentType;

        queryParams["date_from"] = request.InvoicesSearchParameters?.DateFrom;
        queryParams["date_to"] = request.InvoicesSearchParameters?.DateTo;

        //Optional params           
        queryParams["soldto_number"] = request.SoldToAccount?.PrimaryAcct?.TrimStart('0');
        queryParams["sales_organization"] = request.SoldToAccount?.SalesOrganization;
        queryParams["distribution_channel"] = request.SoldToAccount?.DistributionChannel;
        queryParams["division"] = request.SoldToAccount?.Division;

        queryParams["due_date_from"] = request.InvoicesSearchParameters?.DueDateFrom;
        queryParams["due_date_to"] = request.InvoicesSearchParameters?.DueDateTo;
        queryParams["currency_key"] = request.InvoicesSearchParameters?.CurrencyKey;
        queryParams["SoldTo_SearchParams"] = request.InvoicesSearchParameters?.SoldToSearchParams?.ToString();
        int i = 1;
        foreach (InvoicesFilter filter in request.InvoicesSearchParameters?.Filter)
        {
            queryParams["filter_type_" + i] = filter.FilterType;
            queryParams["filter_value_" + i] = filter.Value;
            i++;
        }
        Clients.Models.SapHttpData<PaymentInvoiceResponse?> response = await this.client.GetData<PaymentInvoiceResponse>("CNBS_PAYMENT_PATH", queryParams, language);
        ApplyAppliedCreditAmounts(response?.Data);

        return response?.Data;
    }

    private static void ApplyAppliedCreditAmounts(PaymentInvoiceResponse? response)
    {
        if (response?.PaymentList == null)
        {
            return;
        }

        foreach (PaymentList payment in response.PaymentList)
        {
            payment.AppliedCreditAmount = CalculateAppliedCreditAmount(payment);
        }
    }

    private static decimal CalculateAppliedCreditAmount(PaymentList payment)
    {
        if (payment.SdInvoices == null || payment.SdInvoices.Count == 0)
        {
            return 0m;
        }

        decimal totalCurrentPaidAmount = payment.SdInvoices.Sum(invoice => ParseDecimal(invoice.CurrentPaidAmount));
        return totalCurrentPaidAmount - (payment.PaidAmount ?? 0m);
    }

    private static decimal ParseDecimal(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return 0m;
        }

        return decimal.TryParse(value, NumberStyles.Number, CultureInfo.InvariantCulture, out decimal parsedValue)
            ? parsedValue
            : 0m;
    }
}
