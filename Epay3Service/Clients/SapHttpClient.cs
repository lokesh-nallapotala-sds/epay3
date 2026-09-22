using Epay3Service.Clients.Interfaces;
using Epay3Service.Clients.Models;
using Epay3Service.Configuration;
using Epay3Service.CustomExceptions;
using Epay3Service.Services;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using System.Net;
using System.Net.Http.Headers;
using System.Text;

namespace Epay3Service.Clients;

public class SapHttpClient : ISapHttpClient
{
    private readonly HttpClient httpClient;
    private readonly SapKeys sapKeys;
    private readonly SapConfiguration configuration;
    private readonly ILogger<SapHttpClient> logger;
    private readonly IMaintenanceCacheService maintenanceCache;

    public SapHttpClient(SapConfiguration configuration, SapKeys sapKeys, ILogger<SapHttpClient> logger, IMaintenanceCacheService maintenanceCache)
    {
        this.sapKeys = sapKeys;
        this.configuration = configuration;
        this.logger = logger;
        this.maintenanceCache = maintenanceCache;

        var authHeader = Convert.ToBase64String(Encoding.ASCII.GetBytes($"{this.configuration.User}:{this.configuration.Password}"));
        var sysId = this.configuration.Headers?.CnbsSysId;

        var handler = new HttpClientHandler
        {
            AutomaticDecompression = DecompressionMethods.GZip | DecompressionMethods.Deflate
        };

        this.httpClient = new HttpClient(handler);
        // Timeouts are applied per request in SendCoreAsync so slow-by-design
        // calls (PDF generation) can get a longer budget than regular calls.
        this.httpClient.Timeout = Timeout.InfiniteTimeSpan;
        this.httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Basic", authHeader);

        if (!string.IsNullOrWhiteSpace(sysId))
        {
            this.httpClient.DefaultRequestHeaders.Add("cnbsSysId", sysId);
        }
    }

    #region helpers

    private string GetUrl(string key, Dictionary<string, string?>? parameters, string language = "")
    {
        if (string.IsNullOrEmpty(language))
        {
            language = this.configuration.DefaultLanguage;
        }

        var path = this.sapKeys.GetUrl(key);
        if (string.IsNullOrWhiteSpace(path))
        {
            throw new InvalidOperationException($"SAP route '{key}' is not configured.");
        }

        var url = $"{this.configuration.Url}{path}?sap-client={this.configuration.ClientId}&sap-language={language.ToUpper()}&apiid={this.configuration.ApiId}";

        if (parameters != null)
        {
            foreach (KeyValuePair<string, string?> parameter in parameters)
            {
                var value = string.IsNullOrEmpty(parameter.Value) ? "" : Uri.EscapeDataString(parameter.Value);

                url = $"{url}&{parameter.Key}={value}";
            }
        }

        return url;
    }

    private async Task ValidateResponse(HttpResponseMessage response)
    {
        if (!((int)response.StatusCode >= 200 && (int)response.StatusCode < 300))
        {
            var data = await response.Content.ReadAsStringAsync();
            var obj = (JObject?)JsonConvert.DeserializeObject(data!);
            var message = "";
            if (obj != null)
            {
                JToken? status = obj.First?.First;
                if (status != null && status.Type == JTokenType.Object)
                {
                    SapHttpStatus? httpStatus = status.ToObject<SapHttpStatus>();
                    message = httpStatus?.Line;
                }
            }

            throw new SapResponseException($"Sap connection error: {message}");
        }
    }

    // Bound how long an outage can stall a read; SAP availability is inferred
    // from these calls, so the framework default of 100s would delay detection.
    private static readonly TimeSpan DefaultRequestTimeout = TimeSpan.FromSeconds(30);

    // Mutations (payments) and PDF generation keep the pre-existing 100s budget:
    // aborting a non-idempotent call early risks duplicate submissions, and a
    // legitimately slow render must not be misread as an outage.
    private static readonly TimeSpan LongRunningRequestTimeout = TimeSpan.FromSeconds(100);

    /// <summary>
    /// Single send path for all SAP traffic. Every call doubles as an availability
    /// probe: transport failures and gateway errors mark SAP unavailable, any
    /// SAP-produced response marks it available again.
    /// </summary>
    private async Task<HttpResponseMessage> SendCoreAsync(HttpRequestMessage request, TimeSpan? timeout = null)
    {
        HttpResponseMessage response;
        using var cts = new CancellationTokenSource(timeout ?? DefaultRequestTimeout);
        try
        {
            response = await this.httpClient.SendAsync(request, cts.Token);
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException or OperationCanceledException)
        {
            this.maintenanceCache.MarkSapFailure();
            throw;
        }

        if (IsSapUnreachableResponse(response))
        {
            this.maintenanceCache.MarkSapFailure();
        }
        else
        {
            this.maintenanceCache.MarkSapSuccess();
        }

        return response;
    }

    private static bool IsSapUnreachableResponse(HttpResponseMessage response)
    {
        var status = (int)response.StatusCode;

        if (status is 502 or 503 or 504)
        {
            return true;
        }

        // 401/403 (auth layer rejected the app's service credentials — e.g. a
        // locked account) and other 5xx: SAP business errors arrive as JSON, so
        // a non-JSON body means SAP itself did not produce the response and no
        // usable SAP connection exists.
        if (status is 401 or 403 || status >= 500)
        {
            var mediaType = response.Content?.Headers.ContentType?.MediaType;
            return mediaType?.Contains("json", StringComparison.OrdinalIgnoreCase) != true;
        }

        return false;
    }

    #endregion helpers

    public async Task<SapHttpData<T?>> GetData<T>(string pathKey, Dictionary<string, string?>? parameters, string language = "en") where T : class
    {
        var url = this.GetUrl(pathKey, parameters, language);

        var request = new HttpRequestMessage(HttpMethod.Get, url);

        HttpResponseMessage response = await this.SendCoreAsync(request);

        await this.ValidateResponse(response);

        var data = await response.Content.ReadAsStringAsync();

        var httpData = new SapHttpData<T?>();
        if (!string.IsNullOrEmpty(data))
        {
            var obj = (JObject?)JsonConvert.DeserializeObject(data!);
            if (obj != null)
            {
                JToken? value = obj.First?.First;
                JToken? status = obj.Last?.First;
                if (value != null)
                {
                    httpData.Data = JsonConvert.DeserializeObject<T>(data!);
                }
                if (status != null)
                {
                    httpData.Status = status.ToObject<SapHttpStatus>();
                }
            }
        }

        return httpData;
    }

    public async Task<SapHttpData<T?>> Get<T>(string pathKey, Dictionary<string, string?>? parameters, string language = "en", bool wrapped = true) where T : class
    {
        var url = this.GetUrl(pathKey, parameters, language);

        var request = new HttpRequestMessage(HttpMethod.Get, url);

        HttpResponseMessage response = await this.SendCoreAsync(request);
        var httpData = new SapHttpData<T?>();
        if (response.StatusCode != HttpStatusCode.OK)
        {
            var errorData = await response.Content.ReadAsStringAsync();
            if (!string.IsNullOrEmpty(errorData))
            {
                var first = errorData.TrimStart();
                if (first.Length > 0 && (first[0] == '{' || first[0] == '['))
                {
                    JObject? errorObj = JsonConvert.DeserializeObject<JObject>(errorData);
                    JToken? statusToken = errorObj?["status"];
                    if (statusToken != null)
                    {
                        SapHttpStatus? errorStatus = statusToken.ToObject<SapHttpStatus>();
                        httpData.Status = errorStatus;
                    }
                    return httpData;
                }
            }
            throw new SapResponseException($"SAP connection error: {(int)response.StatusCode} {response.ReasonPhrase}.");
        }
        await this.ValidateResponse(response);

        var data = await response.Content.ReadAsStringAsync();

        if (!string.IsNullOrEmpty(data))
        {
            if (wrapped)
            {
                var obj = (JObject?)JsonConvert.DeserializeObject(data);
                if (obj != null)
                {
                    JToken? value = obj.First?.First;
                    JToken? status = obj.Last?.First;

                    if (value != null)
                    {
                        httpData.Data = value.ToObject<T>();
                    }
                    if (status != null)
                    {
                        httpData.Status = status.ToObject<SapHttpStatus>();
                    }
                }
            }
            else
            {
                httpData.Data = JsonConvert.DeserializeObject<T>(data);
            }
        }

        return httpData;
    }

    public async Task<HttpResponseMessage> GetAsync(string url, dynamic body, string action,
         Dictionary<string, string> queryParams = null, string language = "en")
    {
        url = this.GetUrl(url, queryParams, language);

        if (queryParams != null)
        {
            foreach (KeyValuePair<string, string> item in queryParams)
            {
                url = string.IsNullOrEmpty(item.Value?.ToString()) ?
                    $"{url}&{item.Key}=" :
                    $"{url}&{item.Key}={Uri.EscapeDataString(item.Value.ToString())}";
            }
        }

        var request = new HttpRequestMessage
        {
            RequestUri = new Uri(url),
            Method = HttpMethod.Get,
        };

        request.Content = new StringContent(JsonConvert.SerializeObject(body));

        request.Content.Headers.ContentType = new MediaTypeHeaderValue("application/json"); // change as necessary

        try
        {
            return await this.SendCoreAsync(request);
        }
        catch (Exception)
        {
            throw new Exception("Error's occured while API call.");
        }

    }

    public async Task<SapHttpData<T?>> Post<T>(string pathKey, Dictionary<string, string?>? parameters, dynamic body, string language = "en", bool wrapped = true) where T : class
    {
        var httpData = new SapHttpData<T?>();
        var url = this.GetUrl(pathKey, parameters, language);

        dynamic payload = JsonConvert.SerializeObject(body);

        var request = new HttpRequestMessage(HttpMethod.Post, url);
        request.Content = new StringContent(payload);

        HttpResponseMessage response = await this.SendCoreAsync(request, LongRunningRequestTimeout);
        if (response.StatusCode != HttpStatusCode.OK)
        {
            var errorData = await response.Content.ReadAsStringAsync();
            if (!string.IsNullOrEmpty(errorData))
            {
                // Deserialize the entire response into a JObject first
                JObject? errorObj = JsonConvert.DeserializeObject<JObject>(errorData);

                // Preserve typed error payloads for unwrapped endpoints such as manage-payment
                // so callers can still access additional sections like "pre_auth".
                if (!wrapped && errorObj != null)
                {
                    httpData.Data = errorObj.ToObject<T>();
                }

                // Check if there is a "status" property and extract it
                JToken? statusToken = errorObj?["status"];
                if (statusToken != null && statusToken.Type == JTokenType.Array)
                {
                    // Safe conversion to List<SapHttpStatus>
                    List<SapHttpStatus>? statusList = statusToken.ToObject<List<SapHttpStatus>>();

                    if (statusList != null && statusList.Count > 0)
                    {
                        httpData.Status = statusList[0];
                    }
                }
                else if ((errorObj?["status"]?["message_type"]?.ToString() == "E") ||
                         (errorObj?["SapHttpStatus"]?["message_type"]?.ToString() == "E"))
                {
                    JToken? wrappedStatusToken = errorObj?["status"] ?? errorObj?["SapHttpStatus"];
                    SapHttpStatus? sapHttpStatus = wrappedStatusToken?.ToObject<SapHttpStatus>();

                    if (sapHttpStatus != null &&
                        (!string.IsNullOrWhiteSpace(sapHttpStatus.MessageType) ||
                         !string.IsNullOrWhiteSpace(sapHttpStatus.Identifiaction) ||
                         sapHttpStatus.Number != 0 ||
                         !string.IsNullOrWhiteSpace(sapHttpStatus.Line)))
                    {
                        httpData.Status = sapHttpStatus;
                    }
                    else
                    {
                        Status? status = wrappedStatusToken?.ToObject<Status>();
                        if (status != null)
                        {
                            httpData.Status = new SapHttpStatus
                            {
                                MessageType = status.MessageType,
                                Identifiaction = status.Identifiaction,
                                Number = status.Number,
                                Line = status.Line
                            };
                        }
                    }
                }
                else if (errorObj?["message_type"]?.ToString() == "E")
                {
                    string errorString = JsonConvert.SerializeObject(errorObj, Formatting.Indented);
                    SapHttpStatus sapHttpStatus = JsonConvert.DeserializeObject<SapHttpStatus>(errorString);
                    httpData.Status = sapHttpStatus;
                }
            }
            return httpData;
        }
        await this.ValidateResponse(response);

        var data = await response.Content.ReadAsStringAsync();


        if (!string.IsNullOrEmpty(data))
        {
            if (wrapped)
            {
                var obj = (JObject?)JsonConvert.DeserializeObject(data!);
                if (obj != null)
                {
                    JToken? value = obj.First?.First;
                    JToken? status = obj.Last?.First;
                    if (value != null)
                    {
                        if (value.Type == JTokenType.Array)
                        {
                            httpData.Data = value.First?.ToObject<T>();
                        }
                        else
                        {
                            httpData.Data = value.ToObject<T>();
                        }
                    }
                    if (status != null)
                    {
                        if (status.Type == JTokenType.Array)
                        {
                            var statusArray = status.ToObject<List<SapHttpStatus>>();
                            httpData.Status = statusArray?.FirstOrDefault();
                        }
                        else
                        {
                            httpData.Status = status.ToObject<SapHttpStatus>();
                        }
                    }
                }
            }
            else
            {
                httpData.Data = JsonConvert.DeserializeObject<T>(data);
                var obj = JObject.Parse(data);

                var statusToken = obj["status"];
                if (statusToken != null)
                {
                    var statusDto = statusToken.Type == JTokenType.Array
                        ? statusToken.First?.ToObject<Status>()
                        : statusToken.ToObject<Status>();

                    if (statusDto != null)
                    {
                        httpData.Status = new SapHttpStatus
                        {
                            MessageType = statusDto.MessageType,
                            Identifiaction = statusDto.Identifiaction,
                            Number = statusDto.Number,
                            Line = statusDto.Line
                        };
                    }
                }

            }
        }

        return httpData;
    }

    //public async Task<SapHttpData<T?>> Put<T>(string pathKey, Dictionary<string, string?>? parameters, dynamic body, string language = "en", bool wrapped = true) where T : class
    //{
    //    var url = GetUrl(pathKey, parameters, language);
    //
    //    var payload = JsonConvert.SerializeObject(body);
    //
    //    var request = new HttpRequestMessage(HttpMethod.Put, url);
    //    request.Content = new StringContent(payload);
    //
    //    var response = await _httpClient.SendAsync(request);
    //
    //    await ValidateResponse(response);
    //
    //    var data = await response.Content.ReadAsStringAsync();
    //
    //    var httpData = new SapHttpData<T?>();
    //    if (!string.IsNullOrEmpty(data))
    //    {
    //        if (wrapped)
    //        {
    //            var obj = (JObject?)JsonConvert.DeserializeObject(data!);
    //            if (obj != null)
    //            {
    //                var value = obj.First?.First;
    //                var status = obj.Last?.First;
    //                if (value != null)
    //                {
    //                    if (value.Type == JTokenType.Array)
    //                    {
    //                        httpData.Data = value.First?.ToObject<T>();
    //                    }
    //                    else
    //                    {
    //                        httpData.Data = value.ToObject<T>();
    //                    }
    //                }
    //                if (status != null)
    //                {
    //                    httpData.Status = status.ToObject<SapHttpStatus>();
    //                }
    //            }
    //        }
    //        else
    //        {
    //            httpData.Data = JsonConvert.DeserializeObject<T>(data);
    //        }
    //    }
    //
    //    return httpData;
    //}

    //Special case as pdf response returns content rather than data
    public async Task<byte[]?> GetPdf(string pathKey, dynamic data, string language = "en")
    {
        var url = this.GetUrl(pathKey, null, language);

        dynamic payload = JsonConvert.SerializeObject(data);

        var request = new HttpRequestMessage(HttpMethod.Post, url);
        request.Content = new StringContent(payload);

        HttpResponseMessage response = await this.SendCoreAsync(request, LongRunningRequestTimeout);

        if (response.IsSuccessStatusCode && response.Content != null)
        {
            var pdf = await response.Content.ReadAsByteArrayAsync();
            return pdf;
        }

        return null;
    }

    public async Task<SapHttpData<T?>> Delete<T>(string pathKey, Dictionary<string, string?>? parameters, dynamic body, string language = "en", bool wrapped = true) where T : class
    {
        var httpData = new SapHttpData<T?>();
        var url = this.GetUrl(pathKey, parameters, language);

        dynamic payload = JsonConvert.SerializeObject(body);

        var request = new HttpRequestMessage(HttpMethod.Delete, url);
        request.Content = new StringContent(payload, Encoding.UTF8, "application/json");

        HttpResponseMessage response = await this.SendCoreAsync(request, LongRunningRequestTimeout);

        if (response.StatusCode != HttpStatusCode.OK)
        {
            var errorData = await response.Content.ReadAsStringAsync();
            if (!string.IsNullOrEmpty(errorData))
            {
                JObject? errorObj = JsonConvert.DeserializeObject<JObject>(errorData);
                JToken? statusToken = errorObj?["status"];
                if (statusToken != null)
                {
                    if (statusToken.Type == JTokenType.Array)
                    {
                        List<SapHttpStatus>? statusList = statusToken.ToObject<List<SapHttpStatus>>();
                        if (statusList != null && statusList.Count > 0)
                        {
                            httpData.Status = statusList[0];
                        }
                    }
                    else if (errorObj?["message_type"]?.ToString() == "E")
                    {
                        string errorString = JsonConvert.SerializeObject(errorObj, Formatting.Indented);
                        SapHttpStatus sapHttpStatus = JsonConvert.DeserializeObject<SapHttpStatus>(errorString);
                        httpData.Status = sapHttpStatus;
                    }
                    else if (statusToken.Type == JTokenType.Object)
                    {
                        SapHttpStatus? sapHttpStatus =
                            statusToken.ToObject<SapHttpStatus>();

                        httpData.Status = sapHttpStatus;
                    }
                }
            }
            return httpData;
        }

        await this.ValidateResponse(response);

        var data = await response.Content.ReadAsStringAsync();
        if (!string.IsNullOrEmpty(data))
        {
            if (wrapped)
            {
                var obj = (JObject?)JsonConvert.DeserializeObject(data!);
                if (obj != null)
                {
                    JToken? value = obj.First?.First;
                    JToken? status = obj.Last?.First;

                    if (value != null)
                    {
                        httpData.Data = value.ToObject<T>();
                    }
                    if (status != null)
                    {
                        httpData.Status = status.ToObject<SapHttpStatus>();
                    }
                }
            }
            else
            {
                httpData.Data = JsonConvert.DeserializeObject<T>(data);
            }
        }

        return httpData;
    }




}
