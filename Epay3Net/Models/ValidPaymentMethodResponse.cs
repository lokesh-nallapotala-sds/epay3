namespace Epay3Net.Models;

public class ValidPaymentMethodResponse
{
    public string? CardType { get; set; }
    public string? SapCardType { get; set; }
    public string? GatewayCardType { get; set; }
    public string? Key { get; set; }
    public bool Default { get; set; }
    public string? Name { get; set; }
    public string? Token { get; set; }
    public string? ValidTo { get; set; }
}
