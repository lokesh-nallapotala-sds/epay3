namespace Epay3Service.Managers;

public class Localizer {
    private readonly Dictionary<string, string> messages;
    private readonly string language;
    private readonly string country;
    private readonly Dictionary<string, dynamic> defaultParameters;

    public Localizer(Dictionary<string, string> messages, string language, string country) {
        this.messages = messages;
        this.language = language;
        this.country = country;
        this.defaultParameters = new Dictionary<string, dynamic> { { "language", this.language }, { "country", this.country } };
    }

    public string FormatMessage(string key) => this.FormatMessage(key, key, this.defaultParameters);

    public string FormatMessage(string key, string defaultMessage) => this.FormatMessage(key, defaultMessage, this.defaultParameters);

    public string FormatMessage(string key, Dictionary<string, dynamic> values) => this.FormatMessage(key, key, values);

    public string FormatMessage(string key, string defaultMessage, Dictionary<string, dynamic> values) {
        var message = defaultMessage;
        if (this.messages.ContainsKey(key)) {
            message = this.messages[key];
        }

        foreach (KeyValuePair<string, dynamic> set in values) {
            message = message.Replace($"{{{set.Key}}}", set.Value.ToString());
        }

        return message;
    }
}
