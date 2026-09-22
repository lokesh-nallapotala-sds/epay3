using System.Text.Json;
using System.Text.Json.Serialization;

namespace Epay3Service.Models;

// Reads either shape for HelpScreenConfig.HelpText: the current per-language object
// ({"en": "...", "fr": "..."}), or a bare string — the shape stored before per-language
// support existed. A bare string is migrated into { "en": <value> } so pre-existing
// SAP data isn't silently dropped by the base64/JSON round-trip the first time it's
// read after this upgrade. Only affects reading; writes always emit the object shape.
public class HelpTextConverter : JsonConverter<Dictionary<string, string>>
{
    public override Dictionary<string, string> Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        if (reader.TokenType == JsonTokenType.String)
        {
            var legacyValue = reader.GetString();
            return string.IsNullOrEmpty(legacyValue)
                ? new Dictionary<string, string>()
                : new Dictionary<string, string> { ["en"] = legacyValue };
        }

        if (reader.TokenType == JsonTokenType.Null)
        {
            return new Dictionary<string, string>();
        }

        if (reader.TokenType != JsonTokenType.StartObject)
        {
            throw new JsonException("Expected an object or string for HelpText.");
        }

        var result = new Dictionary<string, string>();
        while (reader.Read())
        {
            if (reader.TokenType == JsonTokenType.EndObject) break;

            var key = reader.GetString() ?? string.Empty;
            reader.Read();
            if (reader.TokenType == JsonTokenType.String)
            {
                result[key] = reader.GetString() ?? string.Empty;
            }
            else
            {
                // Non-string value (nested object/array/number/...): record it as
                // empty, and Skip() past its tokens — without this, a nested
                // structure would misalign the reader and abort the whole parse,
                // silently dropping every screen in the stored config.
                reader.Skip();
                result[key] = string.Empty;
            }
        }

        return result;
    }

    public override void Write(Utf8JsonWriter writer, Dictionary<string, string> value, JsonSerializerOptions options)
    {
        JsonSerializer.Serialize(writer, value, options);
    }
}

public class HelpScreenConfig
{
    // Friendly label shown in the admin Screen dropdown, e.g. "Home".
    public string Name { get; set; } = string.Empty;

    // The screen's route, e.g. "/home" — the client's route-match key, kept separate
    // from Name so a typo/format mismatch in the display label can't silently break
    // which screen the help button appears on.
    public string Path { get; set; } = string.Empty;

    // Keyed by language code (e.g. "en", "fr") matching the app's SUPPORTED_LANGUAGES
    // (Epay3Client/src/constants/languages.ts) — the client resolves the entry for its
    // current locale, falling back to "en" if that screen hasn't been translated yet.
    [JsonConverter(typeof(HelpTextConverter))]
    public Dictionary<string, string> HelpText { get; set; } = new();
}

public class HelpConfigRequest
{
    public bool IsHelpEnabled { get; set; }
    public List<HelpScreenConfig> Screens { get; set; } = new();

    // True when the config could not be read (e.g. SAP unavailable) and this is an
    // empty placeholder rather than the real state. The end-user widget treats it
    // the same as "disabled", but the admin tab must NOT treat it as an empty
    // config — saving over it would wipe the stored data.
    public bool LoadFailed { get; set; }
}
