using Newtonsoft.Json;

namespace Epay3Service.Models;

public class Communications
{
    [JsonProperty("phone")]
    public List<Phone>? Phones { get; set; }
}
