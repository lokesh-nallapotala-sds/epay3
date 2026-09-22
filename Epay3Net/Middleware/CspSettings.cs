namespace Epay3Net.Middleware;

public class CspSettings
{
    public string? ReportEndpoint { get; set; }
    public string[] ScriptSrcUrls { get; set; } = [];
    public string[] ScriptSrcElemUrls { get; set; } = [];
    public string[] StyleSrcUrls { get; set; } = [];
    public string[] FontSrcUrls { get; set; } = [];
    public string[] ImgSrcUrls { get; set; } = [];
    public string[] ConnectSrcUrls { get; set; } = [];
    public string[] FrameSrcUrls { get; set; } = [];
    public string[] FormActionUrls { get; set; } = [];
}


