using Newtonsoft.Json;
using WebAR.Service.Services.API.Models;

namespace Epay3Service.Models
{
    public partial class AutoPayEnrollmentResponse : Status
    {
        public static PaymentCardsResponse? FromJson(string json) => JsonConvert.DeserializeObject<PaymentCardsResponse>(json, Converter.Settings);
    }
}
