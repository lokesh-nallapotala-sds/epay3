using Epay3Service.Clients.Interfaces;
using Epay3Service.Clients.Models;
using Epay3Service.Managers;
using Epay3Service.Managers.Interfaces;
using Epay3Service.Models;
using Moq;
using WebAR.Service.Services.API.Models;

namespace Epay3Service.Tests.Managers;

public class InvoicesManagerTests
{
    private readonly Mock<ISalesforceHttpClient> _mockSfClient = new();
    private readonly Mock<ISapHttpClient> _mockSapClient = new();
    private readonly Mock<IAccountManager> _mockAccountManager = new();
    private readonly Mock<ILanguageManager> _mockLanguageManager = new();
    private readonly InvoicesManager _invoicesManager;

    public InvoicesManagerTests()
    {
        _mockLanguageManager
            .Setup(m => m.GetMessage(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()))
            .Returns((string _, string _, string message) => message);

        _invoicesManager = new InvoicesManager(
            _mockSfClient.Object,
            _mockSapClient.Object,
            _mockAccountManager.Object,
            _mockLanguageManager.Object);
    }

    [Fact]
    public async Task Search_ReturnsAllowedInvoices_WhenUserIsPayer()
    {
        var user = new User { PrimaryAccountType = "Payer" };
        var selectedAccount = new Account { PrimaryAcct = "000100", CompanyCode = "3000" };
        var relatedAccounts = new List<RelatedAccount>
        {
            new() { PrimaryAccount = "000200", CompanyCode = "1000" },
            new() { PrimaryAccount = "000300", CompanyCode = "2000" }
        };
        var searchRequest = CreateSearchRequest();
        var invoices = new List<Invoice>
        {
            new() { BillingDocumentNumber = "INV1", BillingDocumentType = "F2", SoldtoNumber = "100" },
            new() { BillingDocumentNumber = "INV2", BillingDocumentType = "F2", SoldtoNumber = "000200" },
            new() { BillingDocumentNumber = "INV3", BillingDocumentType = "F2", SoldtoNumber = "300" }
        };

        _mockAccountManager
            .Setup(m => m.GetRelatedAccounts(user, selectedAccount, "en"))
            .ReturnsAsync(relatedAccounts);
        _mockSfClient
            .Setup(c => c.Get<List<Invoice>>(
                "CNBS_INVOICE_LIST_PATH",
                It.Is<Dictionary<string, string?>>(d =>
                    d["payer_number"] == selectedAccount.PrimaryAcct.TrimStart('0') &&
                    d["company_code"] == "1000" &&
                    d["document_type"] == "F2" &&
                    d["document_search_status"] == "Open" &&
                    d["filter_type_1"] == "reference" &&
                    d["filter_value_1"] == "INV"),
                "en",
                true))
            .ReturnsAsync(new SapHttpData<List<Invoice>?> { Data = invoices });

        List<Invoice>? result = await _invoicesManager.Search(user, selectedAccount, searchRequest, ["200"], "en");

        Assert.NotNull(result);
        Assert.Equal(2, result.Count);
        Assert.Contains(result, invoice => invoice.BillingDocumentNumber == "INV1");
        Assert.Contains(result, invoice => invoice.BillingDocumentNumber == "INV2");
        Assert.DoesNotContain(result, invoice => invoice.BillingDocumentNumber == "INV3");
    }

    [Fact]
    public async Task Search_PopulatesSalesOrganization_InSfQueryParams_WhenUserIsPayer()
    {
        var user = new User { PrimaryAccountType = "Payer" };
        var selectedAccount = new Account
        {
            PrimaryAcct = "0003000",
            CompanyCode = "3000",
            SalesOrganization = "3000"
        };
        var searchRequest = CreateSearchRequest();
        var invoices = new List<Invoice>
        {
            new() { BillingDocumentNumber = "INV3000", BillingDocumentType = "F2", SalesOrganization = "3000", PayerNumber = "3000" }
        };

        _mockAccountManager
            .Setup(m => m.GetRelatedAccounts(user, selectedAccount, "en"))
            .ReturnsAsync(new List<RelatedAccount>());
        _mockSfClient
            .Setup(c => c.Get<List<Invoice>>(
                "CNBS_INVOICE_LIST_PATH",
                It.Is<Dictionary<string, string?>>(d =>
                    d["payer_number"] == "3000" &&
                    d["sales_organization"] == "3000"),
                "en",
                true))
            .ReturnsAsync(new SapHttpData<List<Invoice>?> { Data = invoices });

        List<Invoice>? result = await _invoicesManager.Search(user, selectedAccount, searchRequest, null, "en");

        Assert.NotNull(result);
        var invoice = Assert.Single(result);
        Assert.Equal("INV3000", invoice.BillingDocumentNumber);
    }

    [Fact]
    public async Task Search_UsesSoldToAccountAndSelectedPayer_WhenUserIsSoldTo()
    {
        var user = new User { PrimaryAccountType = "SoldTo" };
        var selectedAccount = new Account
        {
            PrimaryAcct = "000123",
            CompanyCode = "3000",
            SalesOrganization = "SO",
            DistributionChannel = "DC",
            Division = "DV"
        };
        var relatedAccounts = new List<RelatedAccount>
        {
            new() { PrimaryAccount = "000789", CompanyCode = "3000" }
        };
        var searchRequest = CreateSearchRequest();
        var invoices = new List<Invoice>
        {
            new() { BillingDocumentNumber = "INV1", BillingDocumentType = "F2", SoldtoNumber = "123" }
        };

        _mockAccountManager
            .Setup(m => m.GetRelatedAccounts(user, selectedAccount, "en"))
            .ReturnsAsync(relatedAccounts);
        _mockSfClient
            .Setup(c => c.Get<List<Invoice>>(
                "CNBS_INVOICE_LIST_PATH",
                It.Is<Dictionary<string, string?>>(d =>
                    d["payer_number"] == "789" &&
                    d["company_code"] == selectedAccount.CompanyCode &&
                    d["soldto_number"] == "123" &&
                    d["sales_organization"] == selectedAccount.SalesOrganization &&
                    d["distribution_channel"] == selectedAccount.DistributionChannel &&
                    d["division"] == selectedAccount.Division &&
                    d["document_type"] == "F2"),
                "en",
                true))
            .ReturnsAsync(new SapHttpData<List<Invoice>?> { Data = invoices });

        List<Invoice>? result = await _invoicesManager.Search(user, selectedAccount, searchRequest, ["789"], "en");

        Assert.NotNull(result);
        var invoice = Assert.Single(result);
        Assert.Equal("INV1", invoice.BillingDocumentNumber);
    }

    [Fact]
    public async Task Search_FallsBackToSap_WhenSfReturnsEmpty()
    {
        var user = new User { PrimaryAccountType = "Payer" };
        var selectedAccount = new Account { PrimaryAcct = "000100", CompanyCode = "3000" };
        var searchRequest = CreateSearchRequest();
        var sapInvoices = new List<Invoice>
        {
            new() { BillingDocumentNumber = "INV_SAP", BillingDocumentType = "01", SoldtoNumber = "000100" }
        };

        _mockAccountManager
            .Setup(m => m.GetRelatedAccounts(user, selectedAccount, "en"))
            .ReturnsAsync(new List<RelatedAccount>());

        // SF returns empty list
        _mockSfClient
            .Setup(c => c.Get<List<Invoice>>(
                "CNBS_INVOICE_LIST_PATH",
                It.IsAny<Dictionary<string, string?>>(),
                "en",
                true))
            .ReturnsAsync(new SapHttpData<List<Invoice>?> { Data = new List<Invoice>() });

        // SAP returns invoices
        _mockSapClient
            .Setup(c => c.Get<List<Invoice>>(
                "CNBS_INVOICE_LIST_PATH",
                It.IsAny<Dictionary<string, string?>>(),
                "en",
                true))
            .ReturnsAsync(new SapHttpData<List<Invoice>?> { Data = sapInvoices });

        List<Invoice>? result = await _invoicesManager.Search(user, selectedAccount, searchRequest, null, "en");

        Assert.NotNull(result);
        var invoice = Assert.Single(result);
        Assert.Equal("INV_SAP", invoice.BillingDocumentNumber);
    }

    [Fact]
    public async Task Search_ThrowsArgumentNullException_WhenSelectedAccountIsMissing()
    {
        var user = new User { PrimaryAccountType = "Payer" };

        await Assert.ThrowsAsync<ArgumentNullException>(() =>
            _invoicesManager.Search(user, null, CreateSearchRequest(), null, "en"));

        _mockSfClient.Verify(c => c.Get<List<Invoice>>(It.IsAny<string>(), It.IsAny<Dictionary<string, string?>>(), It.IsAny<string>(), It.IsAny<bool>()), Times.Never);
    }

    [Fact]
    public async Task Search_ThrowsArgumentNullException_WhenSoldToHasNoPayers()
    {
        var user = new User { PrimaryAccountType = "SoldTo" };
        var selectedAccount = new Account { PrimaryAcct = "000123", CompanyCode = "3000" };

        _mockAccountManager
            .Setup(m => m.GetRelatedAccounts(user, selectedAccount, "en"))
            .ReturnsAsync(new List<RelatedAccount> { new() { PrimaryAccount = "000789" } });

        await Assert.ThrowsAsync<ArgumentNullException>(() =>
            _invoicesManager.Search(user, selectedAccount, CreateSearchRequest(), [], "en"));

        _mockSfClient.Verify(c => c.Get<List<Invoice>>(It.IsAny<string>(), It.IsAny<Dictionary<string, string?>>(), It.IsAny<string>(), It.IsAny<bool>()), Times.Never);
    }

    [Fact]
    public async Task InvoiceSearch_ReturnsDistinctInvoices_WhenSfRespondsOk()
    {
        var request = new InvoicesSearch
        {
            Payer = new Payer { CustomerNumber = "123", CompanyCode = "3000" },
            InvoicesSearchParameters = new InvoicesSearchParameters
            {
                DocumentType = "01",
                Status = "Open",
                DateFrom = "01-01-2024",
                DateTo = "01-31-2024",
                CurrencyKey = "USD",
                Filter =
                [
                    new InvoicesFilter { FilterType = "reference", Value = "INV" }
                ]
            }
        };
        var invoice = new Invoice { BillingDocumentNumber = "INV1", BillingDocumentType = "F2", SoldtoNumber = "123" };

        _mockSfClient
            .Setup(c => c.Get<List<Invoice>>(
                "CNBS_INVOICE_LIST_PATH",
                It.Is<Dictionary<string, string?>>(d =>
                    d["payer_number"] == request.Payer.CustomerNumber &&
                    d["company_code"] == request.Payer.CompanyCode &&
                    d["document_type"] == "F2" &&
                    d["document_search_status"] == request.InvoicesSearchParameters.Status),
                "fr",
                true))
            .ReturnsAsync(new SapHttpData<List<Invoice>?> { Data = [invoice, invoice] });

        List<Invoice>? result = await _invoicesManager.InvoiceSearch(request, "fr");

        Assert.NotNull(result);
        Assert.Single(result);
    }

    [Fact]
    public async Task InvoiceSearch_FallsBackToSap_WhenSfThrowsException()
    {
        var request = new InvoicesSearch
        {
            Payer = new Payer { CustomerNumber = "123", CompanyCode = "3000" },
            InvoicesSearchParameters = new InvoicesSearchParameters
            {
                Status = "Open",
                DateFrom = "01-01-2024",
                DateTo = "01-31-2024",
                Filter = []
            }
        };
        var sapInvoice = new Invoice { BillingDocumentNumber = "INV_SAP", BillingDocumentType = "01" };

        _mockSfClient
            .Setup(c => c.Get<List<Invoice>>(
                "CNBS_INVOICE_LIST_PATH",
                It.IsAny<Dictionary<string, string?>>(),
                "en",
                true))
            .ThrowsAsync(new HttpRequestException("SF unavailable"));

        _mockSapClient
            .Setup(c => c.Get<List<Invoice>>(
                "CNBS_INVOICE_LIST_PATH",
                It.IsAny<Dictionary<string, string?>>(),
                "en",
                true))
            .ReturnsAsync(new SapHttpData<List<Invoice>?> { Data = [sapInvoice] });

        List<Invoice>? result = await _invoicesManager.InvoiceSearch(request, "en");

        Assert.NotNull(result);
        Assert.Single(result);
        Assert.Equal("INV_SAP", result[0].BillingDocumentNumber);
    }

    [Fact]
    public async Task InvoiceSearch_ReturnsNull_WhenBothSfAndSapReturnNull()
    {
        var request = new InvoicesSearch
        {
            Payer = new Payer { CustomerNumber = "123", CompanyCode = "3000" },
            InvoicesSearchParameters = new InvoicesSearchParameters
            {
                Status = "Open",
                DateFrom = "01-01-2024",
                DateTo = "01-31-2024",
                Filter = []
            }
        };

        _mockSfClient
            .Setup(c => c.Get<List<Invoice>>(
                "CNBS_INVOICE_LIST_PATH",
                It.IsAny<Dictionary<string, string?>>(),
                "en",
                true))
            .ReturnsAsync(new SapHttpData<List<Invoice>?> { Data = null });

        _mockSapClient
            .Setup(c => c.Get<List<Invoice>>(
                "CNBS_INVOICE_LIST_PATH",
                It.IsAny<Dictionary<string, string?>>(),
                "en",
                true))
            .ReturnsAsync(new SapHttpData<List<Invoice>?> { Data = null });

        List<Invoice>? result = await _invoicesManager.InvoiceSearch(request, "en");

        Assert.Null(result);
    }

    [Fact]
    public async Task GetPayments_PopulatesAppliedCreditAmountFromSdInvoices()
    {
        var user = new User { PrimaryAccountType = "Payer" };
        var selectedAccount = new Account { PrimaryAcct = "12345", CompanyCode = "3000" };
        var searchRequest = new InvoicesSearch
        {
            InvoicesSearchParameters = new InvoicesSearchParameters
            {
                DocumentType = "05",
                DateFrom = "01-01-2024",
                DateTo = "01-31-2024",
                Filter = []
            }
        };
        var paymentResponse = new PaymentInvoiceResponse
        {
            PaymentList =
            [
                new PaymentList
                {
                    PaidAmount = 65.50m,
                    SdInvoices =
                    [
                        new SdInvoice { CurrentPaidAmount = "100.50", PaidAmount = 60.50m },
                        new SdInvoice { CurrentPaidAmount = "20", PaidAmount = 5m }
                    ]
                },
                new PaymentList
                {
                    SdInvoices = null
                }
            ]
        };

        _mockAccountManager
            .Setup(m => m.GetRelatedAccounts(user, selectedAccount, "en"))
            .ReturnsAsync(new List<RelatedAccount>());
        _mockSapClient
            .Setup(c => c.GetData<PaymentInvoiceResponse>(
                "CNBS_PAYMENT_PATH",
                It.Is<Dictionary<string, string?>>(d =>
                    d["payer_number"] == selectedAccount.PrimaryAcct &&
                    d["company_code"] == selectedAccount.CompanyCode &&
                    d["document_type"] == searchRequest.InvoicesSearchParameters.DocumentType),
                "en"))
            .ReturnsAsync(new SapHttpData<PaymentInvoiceResponse?> { Data = paymentResponse });

        PaymentInvoiceResponse result = await _invoicesManager.GetPayments(user, selectedAccount, searchRequest, null, "en")!;

        Assert.Equal(55m, result.PaymentList[0].AppliedCreditAmount);
        Assert.Equal(0m, result.PaymentList[1].AppliedCreditAmount);
    }

    [Fact]
    public async Task GetPayments_ReturnsZeroAppliedCreditAmountWhenSdInvoicesAreEmpty()
    {
        var user = new User { PrimaryAccountType = "Payer" };
        var selectedAccount = new Account { PrimaryAcct = "12345", CompanyCode = "3000" };
        var searchRequest = new InvoicesSearch
        {
            InvoicesSearchParameters = new InvoicesSearchParameters
            {
                DocumentType = "05",
                DateFrom = "01-01-2024",
                DateTo = "01-31-2024",
                Filter = []
            }
        };
        var paymentResponse = new PaymentInvoiceResponse
        {
            PaymentList =
            [
                new PaymentList
                {
                    SdInvoices = []
                }
            ]
        };

        _mockAccountManager
            .Setup(m => m.GetRelatedAccounts(user, selectedAccount, "en"))
            .ReturnsAsync(new List<RelatedAccount>());
        _mockSapClient
            .Setup(c => c.GetData<PaymentInvoiceResponse>(
                "CNBS_PAYMENT_PATH",
                It.IsAny<Dictionary<string, string?>>(),
                "en"))
            .ReturnsAsync(new SapHttpData<PaymentInvoiceResponse?> { Data = paymentResponse });

        PaymentInvoiceResponse result = await _invoicesManager.GetPayments(user, selectedAccount, searchRequest, null, "en")!;

        Assert.Equal(0m, result.PaymentList[0].AppliedCreditAmount);
    }

    [Fact]
    public async Task GetPayments_ThrowsArgumentNullException_WhenSelectedAccountIsMissing()
    {
        var user = new User { PrimaryAccountType = "Payer" };

        await Assert.ThrowsAsync<ArgumentNullException>(() =>
            _invoicesManager.GetPayments(user, null, CreateSearchRequest(), null, "en")!);

        _mockSapClient.Verify(c => c.GetData<PaymentInvoiceResponse>(It.IsAny<string>(), It.IsAny<Dictionary<string, string?>>(), It.IsAny<string>()), Times.Never);
    }

    [Fact]
    public async Task GetPayments_UsesSoldToAccountAndSelectedPayer_WhenUserIsSoldTo()
    {
        var user = new User { PrimaryAccountType = "SoldTo" };
        var selectedAccount = new Account
        {
            PrimaryAcct = "000123",
            CompanyCode = "3000",
            SalesOrganization = "SO",
            DistributionChannel = "DC",
            Division = "DV"
        };
        var relatedAccounts = new List<RelatedAccount>
        {
            new() { PrimaryAccount = "000789" }
        };
        var searchRequest = CreateSearchRequest();
        var paymentResponse = new PaymentInvoiceResponse
        {
            PaymentList =
            [
                new PaymentList { DocumentNumberFinance = "PAY1" }
            ]
        };

        _mockAccountManager
            .Setup(m => m.GetRelatedAccounts(user, selectedAccount, "en"))
            .ReturnsAsync(relatedAccounts);
        _mockSapClient
            .Setup(c => c.GetData<PaymentInvoiceResponse>(
                "CNBS_PAYMENT_PATH",
                It.Is<Dictionary<string, string?>>(d =>
                    d["payer_number"] == "789" &&
                    d["company_code"] == selectedAccount.CompanyCode &&
                    d["soldto_number"] == "123" &&
                    d["sales_organization"] == selectedAccount.SalesOrganization &&
                    d["distribution_channel"] == selectedAccount.DistributionChannel &&
                    d["division"] == selectedAccount.Division),
                "en"))
            .ReturnsAsync(new SapHttpData<PaymentInvoiceResponse?> { Data = paymentResponse });

        PaymentInvoiceResponse result = await _invoicesManager.GetPayments(user, selectedAccount, searchRequest, ["789"], "en")!;

        Assert.Same(paymentResponse, result);
    }

    [Fact]
    public async Task GetInvoicePdf_ReturnsPdf_WhenSapRespondsOk()
    {
        var request = new DocumentDetail
        {
            CustomerNumber = "123",
            DocumentNumber = "INV1",
            DocumentType = "01"
        };
        byte[] pdf = [1, 2, 3];

        _mockSapClient
            .Setup(c => c.GetPdf(
                "CNBS_PDF_PATH",
                It.Is<InvoicePdfRequest>(r => r.DocumentDetail == request),
                "de"))
            .ReturnsAsync(pdf);

        byte[]? result = await _invoicesManager.GetInvoicePdf(request, "de");

        Assert.Same(pdf, result);
    }

    [Fact]
    public async Task GetInvoiceDetails_ReturnsData_WhenSfRespondsOk()
    {
        var request = new DocumentDetail
        {
            CustomerNumber = "123",
            DocumentNumber = "INV1",
            DocumentType = "01"
        };
        var invoiceResponse = new InvoiceDetailResponse
        {
            Detail = new InvoiceDetail { HeaderData = new InvoiceHeaderData { SoldtoNumber = "123" } }
        };

        _mockSfClient
            .Setup(c => c.GetData<InvoiceDetailResponse>(
                "CNBS_INVOICE_DETAIL_PATH",
                It.Is<Dictionary<string, string?>>(d =>
                    d["billing_document_number"] == request.DocumentNumber &&
                    d["document_type"] == request.DocumentType &&
                    d["customer_number"] == request.CustomerNumber),
                "es"))
            .ReturnsAsync(new SapHttpData<InvoiceDetailResponse?> { Data = invoiceResponse });

        InvoiceDetailResponse? result = await _invoicesManager.GetInvoiceDetails(request, "es");

        Assert.Same(invoiceResponse, result);
    }

    [Fact]
    public async Task GetInvoiceDetails_FallsBackToSap_WhenSfReturnsNullOrEmptyDetail()
    {
        var request = new DocumentDetail
        {
            CustomerNumber = "123",
            DocumentNumber = "INV1",
            DocumentType = "01"
        };
        var sapInvoiceResponse = new InvoiceDetailResponse
        {
            Detail = new InvoiceDetail { HeaderData = new InvoiceHeaderData { SoldtoNumber = "123" } }
        };

        // SF returns response with null Detail
        _mockSfClient
            .Setup(c => c.GetData<InvoiceDetailResponse>(
                "CNBS_INVOICE_DETAIL_PATH",
                It.IsAny<Dictionary<string, string?>>(),
                "en"))
            .ReturnsAsync(new SapHttpData<InvoiceDetailResponse?> { Data = new InvoiceDetailResponse { Detail = null } });

        // SAP returns valid response
        _mockSapClient
            .Setup(c => c.GetData<InvoiceDetailResponse>(
                "CNBS_INVOICE_DETAIL_PATH",
                It.IsAny<Dictionary<string, string?>>(),
                "en"))
            .ReturnsAsync(new SapHttpData<InvoiceDetailResponse?> { Data = sapInvoiceResponse });

        InvoiceDetailResponse? result = await _invoicesManager.GetInvoiceDetails(request, "en");

        Assert.Same(sapInvoiceResponse, result);
    }

    [Fact]
    public async Task GetInvoiceDetails_ReturnsNull_WhenBothSfAndSapReturnNull()
    {
        var request = new DocumentDetail
        {
            CustomerNumber = "123",
            DocumentNumber = "INV1",
            DocumentType = "01"
        };

        _mockSfClient
            .Setup(c => c.GetData<InvoiceDetailResponse>(
                "CNBS_INVOICE_DETAIL_PATH",
                It.IsAny<Dictionary<string, string?>>(),
                "en"))
            .ReturnsAsync(new SapHttpData<InvoiceDetailResponse?> { Data = null });

        _mockSapClient
            .Setup(c => c.GetData<InvoiceDetailResponse>(
                "CNBS_INVOICE_DETAIL_PATH",
                It.IsAny<Dictionary<string, string?>>(),
                "en"))
            .ReturnsAsync(new SapHttpData<InvoiceDetailResponse?> { Data = null });

        InvoiceDetailResponse? result = await _invoicesManager.GetInvoiceDetails(request, "en");

        Assert.Null(result);
    }

    [Fact]
    public void Invoice_DeserializesCorrectly_FromSalesforceJson()
    {
        string json = """
        {
            "total_amount": 13000.00,
            "soldto_number": "3000",
            "sales_organization": "3000",
            "reference_number": "90041034",
            "posting_date": null,
            "pdf_document_available": null,
            "payer_number": "3000",
            "paid_amount": 190.00,
            "open_amount": 12810.00,
            "line_item_in_the_relevant_invoice": 1,
            "fiscal_year_of_the_relevant_invoice": null,
            "finance_document_type": null,
            "due_date": "07-30-2026",
            "document_number_finance": null,
            "document_date": "07-28-2026",
            "division": "00",
            "distribution_channel": "10",
            "discount_amount": null,
            "days_in_arrears": null,
            "currency_key": "USD",
            "billing_document_type": "F2",
            "billing_document_number": "90041034"
        }
        """;
        var inv = Newtonsoft.Json.JsonConvert.DeserializeObject<Invoice>(json);
        Assert.NotNull(inv);
        Assert.Equal("90041034", inv.BillingDocumentNumber);
        Assert.Equal(13000.00m, inv.TotalAmount);
        Assert.NotNull(inv.DueDateInternal);
        Assert.NotNull(inv.DocumentDate);
    }

    private static InvoicesSearch CreateSearchRequest() =>
        new()
        {
            InvoicesSearchParameters = new InvoicesSearchParameters
            {
                DocumentType = "01",
                Status = "Open",
                DateFrom = "01-01-2024",
                DateTo = "01-31-2024",
                DueDateFrom = "",
                DueDateTo = "",
                CurrencyKey = "USD",
                Filter =
                [
                    new InvoicesFilter { FilterType = "reference", Value = "INV" }
                ]
            }
        };
}