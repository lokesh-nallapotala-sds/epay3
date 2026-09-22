using System.Web;

namespace Epay3Service.Helpers;

public static class SapSafe
{
    /// <summary>
    /// SAPI messes up if there is JSON characters in a string. We use this "encoding" to avoid problems.
    /// </summary>
    /// <param name="value"></param>
    /// <returns></returns>
    public static string Encode(string value)
    {
        value = HttpUtility.UrlEncode(value);
        value = value.Replace("\\n", "___n___");
        value = value.Replace("\\r", "___r___");
        value = value.Replace("\\t", "___t___");
        return value;
    }

    public static string Decode(string value)
    {
        value = value.Replace("___n___", "\\n");
        value = value.Replace("___r___", "\\r");
        value = value.Replace("___t___", "\\t");
        value = HttpUtility.UrlDecode(value);
        return value;
    }
}