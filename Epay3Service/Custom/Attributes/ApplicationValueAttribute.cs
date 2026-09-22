namespace Epay3Service.Custom.Attributes;


public class ApplicationValueAttribute(string appValueName) : Attribute
{
    public string AppValueName { get; private set; } = appValueName;
}
