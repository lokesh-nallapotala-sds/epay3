namespace Epay3Service.Models;

public class InvoiceAccountRequest
{
    public string AccountNumber { get; set; }
    public string InvoiceNumber { get; set; }
    public decimal InvoiceAmount { get; set; }

    public InvoiceDetail? InvoiceDetail { get; set; }

    public override bool Equals(Object? obj)
    {
        if ((obj == null) || !this.GetType().Equals(obj.GetType()))
        {
            return false;
        }
        else
        {
            InvoiceAccountRequest p = (InvoiceAccountRequest)obj;
            InvoicePartnerData? p1 = p.InvoiceDetail?.PartnerData.FirstOrDefault(_ => _.PartnerFunction == "RG");
            InvoicePartnerData? p2 = p.InvoiceDetail?.PartnerData.FirstOrDefault(_ => _.PartnerFunction == "RG");
            return this.InvoiceDetail?.HeaderData.Division == p.InvoiceDetail?.HeaderData.Division &&
                   this.InvoiceDetail?.HeaderData.SalesOrganization == p.InvoiceDetail?.HeaderData.SalesOrganization &&
                   this.InvoiceDetail?.HeaderData.DistributionChannel == p.InvoiceDetail?.HeaderData.DistributionChannel &&
                   p1?.PartnerNumber == p2?.PartnerNumber;
        }
    }

    public override int GetHashCode()
    {
        //TODO: fix potential null references
        InvoicePartnerData? p = this.InvoiceDetail?.PartnerData.FirstOrDefault(_ => _.PartnerFunction == "RG");
        var pNumber = p?.PartnerNumber;
        return this.InvoiceDetail.HeaderData.Division.GetHashCode() ^
               this.InvoiceDetail.HeaderData.SalesOrganization.GetHashCode() ^
               this.InvoiceDetail.HeaderData.DistributionChannel.GetHashCode() ^ pNumber.GetHashCode();
    }
}

