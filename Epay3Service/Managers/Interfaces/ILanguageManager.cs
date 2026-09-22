namespace Epay3Service.Managers.Interfaces;

public interface ILanguageManager
{
    public string GetMessage(string key, string language, string defaultMessage);
}
