using Epay3Service.Managers.Interfaces;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace Epay3Service.Managers;

public class LanguageManager : ILanguageManager
{
    private readonly Dictionary<string, JObject?> languages;
    public LanguageManager() => this.languages = new Dictionary<string, JObject?>();

    public string GetMessage(string key, string language, string defaultMessage)
    {
        if (!this.languages.ContainsKey(language))
        {
            var filename = Path.Join(Path.GetDirectoryName(AppContext.BaseDirectory), "Config", "Languages", $"{language}.json");
            //var filename = $"{Path.GetDirectoryName(AppContext.BaseDirectory)}\\Config\\Languages\\{language}.json";
            var text = "";

            if (File.Exists(filename))
            {
                text = File.ReadAllText(filename);

            }

            if (!string.IsNullOrEmpty(text))
            {
                var obj = JsonConvert.DeserializeObject(text) as JObject;
                this.languages.Add(language, obj);
            }

        }

        JObject? jobj = this.languages[language];

        if (jobj != null)
        {
            var message = jobj[key]?.ToString();

            if (!string.IsNullOrEmpty(message))
            {
                return message;
            }
        }

        return defaultMessage;
    }
}
