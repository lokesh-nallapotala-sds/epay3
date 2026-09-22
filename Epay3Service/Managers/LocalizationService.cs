using Epay3Service.Managers.Interfaces;

namespace Epay3Service.Managers;

public class LocalizationService(FrontendConfig frontendConfig) : ILocalization {
    private readonly FrontendConfig frontendConfig = frontendConfig;

    public Localizer GetLocalizer(string language, string country) {
        Dictionary<string, Dictionary<string, string>> allMessages = this.frontendConfig.GetLanguageMessages();

        Dictionary<string, string> defaultMessages = allMessages.ContainsKey("xx") ? allMessages["xx"] : new Dictionary<string, string>();
        Dictionary<string, string> languageMessages = allMessages.ContainsKey(language) ? allMessages[language] : new Dictionary<string, string>();
        var countryMessages = new Dictionary<string, string>();
        var languageCountry = new Dictionary<string, string>();
        if (country != "") {
            countryMessages = allMessages.ContainsKey($"xx-{country}") ? allMessages[$"xx-{country}"] : new Dictionary<string, string>();
            languageCountry = allMessages.ContainsKey($"{language}-{country}") ? allMessages[$"{language}-{country}"] : new Dictionary<string, string>();
        }

        var messages = defaultMessages.Concat(languageMessages).Concat(countryMessages).Concat(languageCountry).GroupBy(d => d.Key)
            .ToDictionary(d => d.Key, d => d.First().Value);

        return new Localizer(messages, language, country);
    }
}
