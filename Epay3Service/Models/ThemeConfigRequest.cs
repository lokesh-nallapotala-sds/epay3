namespace Epay3Service.Models;

public class ThemeConfig
{
    public string? Name { get; set; }  // Nullable properties
    public List<string>? Urls { get; set; }
    public List<Banner>? Banners { get; set; }
    public string? BrandLogo { get; set; }
    public string? BrandIcon { get; set; }
    public string? BrandTitle { get; set; }
    public string? BackgroundColor { get; set; }
    public string? HeaderBackgroundColor { get; set; }
    public string? PrimaryColor { get; set; }
    public string? ContrastColor { get; set; }
    public string? HoverColor { get; set; }
    public string? ButtonColor { get; set; }
    public string? ButtonTextColor { get; set; }
    public string? ButtonHoverColor { get; set; }
    public string? HighlightColor { get; set; }
    public string? ButtonHoverTextColor { get; set; }
    public string? ApplicationName { get; set; }
    public string? ButtonBorderColor { get; set; }
    public string? ButtonBorderHoverColor { get; set; }
    public string? BannerColor { get; set; }
}

public class Banner
{
    // Initialize properties with default values to ensure they are never null
    public string Language { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public string? Text1 { get; set; }
    public string? Text2 { get; set; }
}
