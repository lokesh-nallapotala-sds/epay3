using Epay3Service.Models;
using WebAR.Service.Services.API.Models;

namespace Epay3Service.Managers.Interfaces;

public interface IInvoicesManager
{
    public Task<List<Invoice>?> Search(User user, Account? selectedAccount, InvoicesSearch searchRequest, List<string>? payers, string language = "en");

    public Task<InvoiceDetailResponse?> GetInvoiceDetails(DocumentDetail request, string language = "en");

    public Task<byte[]?> GetInvoicePdf(DocumentDetail request, string language = "en");

    public Task<PaymentInvoiceResponse>? GetPayments(User user, Account? selectedAccount, InvoicesSearch searchRequest, List<string>? payers, string language = "en");

    public Task<List<Invoice>?> InvoiceSearch(InvoicesSearch request, string language = "en");
}
