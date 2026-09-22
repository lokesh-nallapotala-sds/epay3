namespace Epay3Service.Managers.Interfaces;

public interface ILocalization
{
    public Localizer GetLocalizer(string language, string country);
}
