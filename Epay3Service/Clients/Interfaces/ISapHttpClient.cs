using Epay3Service.Clients.Models;
namespace Epay3Service.Clients.Interfaces;

public interface ISapHttpClient {
    public Task<SapHttpData<T?>> Get<T>(string pathKey, Dictionary<string, string?>? parameters, string language = "en", bool wrapped = true) where T : class;
    public Task<SapHttpData<T?>> Post<T>(string pathKey, Dictionary<string, string?>? parameters, dynamic body, string language = "en", bool wrapped = true) where T : class;
    public Task<SapHttpData<T?>> Delete<T>(string pathKey, Dictionary<string, string?>? parameters, dynamic body, string language = "en", bool wrapped = true) where T : class;
    //Task<SapHttpData<T?>> Put<T>(string pathKey, Dictionary<string, string?>? parameters, dynamic body, string language = "en", bool wrapped = true) where T : class;

    public Task<byte[]?> GetPdf(string pathKey, dynamic data, string language = "en");
    public Task<SapHttpData<T?>> GetData<T>(string pathKey, Dictionary<string, string?>? parameters, string language = "en") where T : class;

    public Task<HttpResponseMessage> GetAsync(string url, dynamic body, string action, Dictionary<string, string> queryParams = null, string language = "en");
}
