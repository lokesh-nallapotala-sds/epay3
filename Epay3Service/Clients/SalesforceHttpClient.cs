using System.Net;
using System.Net.Http.Headers;
using System.Text;
using Epay3Service.Clients.Interfaces;
using Epay3Service.Clients.Models;
using Epay3Service.Configuration;
using Epay3Service.CustomExceptions;
using Epay3Service.Services;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace Epay3Service.Clients;

public class SalesforceHttpClient : ISalesforceHttpClient, IDisposable
{
    private readonly HttpClient httpClient;
    private readonly SalesforceConfiguration configuration;
    private readonly SalesforceKeys salesforceKeys;
    private readonly ILogger<SalesforceHttpClient> logger;
    private readonly IMaintenanceCacheService? maintenanceCache;
    private readonly SemaphoreSlim tokenSemaphore = new(1, 1);

    private string? cachedAccessToken;
    private string? cachedInstanceUrl;
    private DateTimeOffset tokenExpiration = DateTimeOffset.MinValue;
    private bool disposed;

    public SalesforceHttpClient(
        SalesforceConfiguration configuration,
        SalesforceKeys salesforceKeys,
        ILogger<SalesforceHttpClient> logger,
        IMaintenanceCacheService? maintenanceCache = null)
    {
        this.configuration = configuration ?? throw new ArgumentNullException(nameof(configuration));
        this.salesforceKeys = salesforceKeys ?? new SalesforceKeys();
        this.logger = logger ?? throw new ArgumentNullException(nameof(logger));
        this.maintenanceCache = maintenanceCache;

        var handler = new HttpClientHandler
        {
            AutomaticDecompression = DecompressionMethods.GZip | DecompressionMethods.Deflate
        };

        this.httpClient = new HttpClient(handler)
        {
            Timeout = TimeSpan.FromSeconds(Math.Max(5, configuration.TimeoutSeconds))
        };
    }

    #region Token Management

    public async Task<string> GetAccessTokenAsync(bool forceRefresh = false, CancellationToken cancellationToken = default)
    {
        if (!forceRefresh && !string.IsNullOrEmpty(this.cachedAccessToken) && DateTimeOffset.UtcNow < this.tokenExpiration)
        {
            return this.cachedAccessToken;
        }

        await this.tokenSemaphore.WaitAsync(cancellationToken);
        try
        {
            if (!forceRefresh && !string.IsNullOrEmpty(this.cachedAccessToken) && DateTimeOffset.UtcNow < this.tokenExpiration)
            {
                return this.cachedAccessToken;
            }

            this.logger.LogInformation("Requesting new Salesforce OAuth token from {TokenUrl}", this.configuration.TokenUrl);

            Dictionary<string, string> tokenRequestParams;

            if (!string.IsNullOrWhiteSpace(this.configuration.Username) && !string.IsNullOrWhiteSpace(this.configuration.Password))
            {
                var password = this.configuration.Password;
                if (!string.IsNullOrEmpty(this.configuration.SecurityToken))
                {
                    password += this.configuration.SecurityToken;
                }

                tokenRequestParams = new Dictionary<string, string>
                {
                    { "grant_type", "password" },
                    { "client_id", this.configuration.ClientId },
                    { "client_secret", this.configuration.ClientSecret },
                    { "username", this.configuration.Username },
                    { "password", password }
                };
            }
            else
            {
                tokenRequestParams = new Dictionary<string, string>
                {
                    { "grant_type", "client_credentials" },
                    { "client_id", this.configuration.ClientId },
                    { "client_secret", this.configuration.ClientSecret }
                };
            }

            using var tokenRequest = new HttpRequestMessage(HttpMethod.Post, this.configuration.TokenUrl)
            {
                Content = new FormUrlEncodedContent(tokenRequestParams)
            };

            using var response = await this.httpClient.SendAsync(tokenRequest, cancellationToken);
            var responseContent = await response.Content.ReadAsStringAsync(cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                this.logger.LogError("Salesforce token request failed: {StatusCode} - {Content}", response.StatusCode, responseContent);
                var errorList = TryParseErrors(responseContent);
                var message = errorList != null && errorList.Count > 0
                    ? string.Join("; ", errorList.Select(e => e.ToString()))
                    : $"Token request failed with status {response.StatusCode}. Content: {responseContent}";

                this.maintenanceCache?.MarkSapFailure();
                throw new SalesforceResponseException(message, response.StatusCode, errorList);
            }

            var tokenData = JsonConvert.DeserializeObject<SalesforceTokenResponse>(responseContent);
            if (tokenData == null || string.IsNullOrWhiteSpace(tokenData.AccessToken))
            {
                this.maintenanceCache?.MarkSapFailure();
                throw new SalesforceResponseException("Salesforce OAuth response did not contain a valid access token.");
            }

            this.cachedAccessToken = tokenData.AccessToken;
            this.cachedInstanceUrl = !string.IsNullOrWhiteSpace(tokenData.InstanceUrl)
                ? tokenData.InstanceUrl
                : this.configuration.InstanceUrl;

            this.tokenExpiration = DateTimeOffset.UtcNow.AddMinutes(55);

            this.maintenanceCache?.MarkSapSuccess();
            this.logger.LogInformation("Successfully obtained Salesforce OAuth token. Target instance: {InstanceUrl}", this.cachedInstanceUrl);
            return this.cachedAccessToken;
        }
        catch (Exception)
        {
            this.maintenanceCache?.MarkSapFailure();
            throw;
        }
        finally
        {
            this.tokenSemaphore.Release();
        }
    }

    #endregion

    #region URL Resolution

    private string ResolveEndpoint(string pathKey)
    {
        var resolved = this.salesforceKeys.GetUrl(pathKey) ?? pathKey;
        if (resolved.Equals("applicationUsers", StringComparison.OrdinalIgnoreCase))
        {
            return "getApplicationUserList";
        }
        return resolved;
    }

    private string BuildUrl(string endpointOrKey, Dictionary<string, string?>? queryParams)
    {
        var resolvedPath = this.ResolveEndpoint(endpointOrKey);
        var baseInstance = (this.cachedInstanceUrl ?? this.configuration.InstanceUrl).TrimEnd('/');
        var apiVersion = (this.configuration.ApiVersion ?? "v59.0").TrimStart('v');
        if (!apiVersion.StartsWith("v", StringComparison.OrdinalIgnoreCase))
        {
            apiVersion = "v" + apiVersion;
        }

        string fullUrl;

        if (resolvedPath.StartsWith("http://", StringComparison.OrdinalIgnoreCase) ||
            resolvedPath.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
        {
            fullUrl = resolvedPath;
        }
        else if (resolvedPath.StartsWith("/services/", StringComparison.OrdinalIgnoreCase))
        {
            fullUrl = $"{baseInstance}{resolvedPath}";
        }
        else if (resolvedPath.StartsWith("apexrest/", StringComparison.OrdinalIgnoreCase))
        {
            fullUrl = $"{baseInstance}/services/{resolvedPath}";
        }
        else if (resolvedPath.StartsWith("sobjects/", StringComparison.OrdinalIgnoreCase) ||
                 resolvedPath.Equals("query", StringComparison.OrdinalIgnoreCase))
        {
            fullUrl = $"{baseInstance}/services/data/{apiVersion}/{resolvedPath}";
        }
        else
        {
            var path = resolvedPath.TrimStart('/');
            if (path.Equals("getInvoicesDetailsAPI", StringComparison.OrdinalIgnoreCase))
            {
                path = "getInvoicesDetailsAPI/";
            }
            fullUrl = $"{baseInstance}/services/apexrest/{path}";
        }

        if (queryParams != null && queryParams.Count > 0)
        {
            var queryString = new StringBuilder();
            var hasExistingQuery = fullUrl.Contains('?');

            var normalizedParams = new Dictionary<string, string?>(StringComparer.OrdinalIgnoreCase);
            foreach (var kvp in queryParams)
            {
                var trimmedKey = kvp.Key?.Trim();
                if (!string.IsNullOrEmpty(trimmedKey))
                {
                    normalizedParams[trimmedKey] = kvp.Value;
                }
            }

            // Defense-in-depth: support both camelCase and snake_case for user_id/userId required by different Apex endpoints
            if (normalizedParams.TryGetValue("user_id", out var userIdVal) && !normalizedParams.ContainsKey("userId"))
            {
                normalizedParams["userId"] = userIdVal;
            }
            else if (normalizedParams.TryGetValue("userId", out var uIdVal) && !normalizedParams.ContainsKey("user_id"))
            {
                normalizedParams["user_id"] = uIdVal;
            }

            foreach (var kvp in normalizedParams)
            {
                if (kvp.Value == null) continue;
                queryString.Append(hasExistingQuery ? '&' : '?');
                hasExistingQuery = true;
                queryString.Append(Uri.EscapeDataString(kvp.Key));
                queryString.Append('=');
                queryString.Append(Uri.EscapeDataString(kvp.Value));
            }

            fullUrl += queryString.ToString();
        }

        return fullUrl;
    }

    #endregion

    #region Core Request Execution

    private async Task<HttpResponseMessage> SendWithRetryAsync(
        HttpMethod method,
        string endpointOrKey,
        object? body,
        Dictionary<string, string?>? queryParams,
        CancellationToken cancellationToken = default)
    {
        var token = await this.GetAccessTokenAsync(forceRefresh: false, cancellationToken);
        var url = this.BuildUrl(endpointOrKey, queryParams);

        HttpRequestMessage CreateRequest(string authToken)
        {
            var req = new HttpRequestMessage(method, url);
            req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", authToken);
            req.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));

            if (body != null)
            {
                var json = body is string strBody ? strBody : JsonConvert.SerializeObject(body);
                req.Content = new StringContent(json, Encoding.UTF8, "application/json");
            }

            return req;
        }

        try
        {
            using var initialRequest = CreateRequest(token);
            var response = await this.httpClient.SendAsync(initialRequest, cancellationToken);

            if (response.StatusCode == HttpStatusCode.Unauthorized)
            {
                this.logger.LogWarning("Salesforce returned 401 Unauthorized for {Url}. Refreshing token and retrying...", url);
                response.Dispose();

                var freshToken = await this.GetAccessTokenAsync(forceRefresh: true, cancellationToken);
                using var retryRequest = CreateRequest(freshToken);
                response = await this.httpClient.SendAsync(retryRequest, cancellationToken);
            }

            if (response.IsSuccessStatusCode)
            {
                this.maintenanceCache?.MarkSapSuccess();
            }

            return response;
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException or OperationCanceledException)
        {
            this.maintenanceCache?.MarkSapFailure();
            throw;
        }
    }

    private static List<SalesforceErrorResponse>? TryParseErrors(string responseBody)
    {
        if (string.IsNullOrWhiteSpace(responseBody)) return null;

        var trimmed = responseBody.Trim();
        try
        {
            if (trimmed.StartsWith("["))
            {
                return JsonConvert.DeserializeObject<List<SalesforceErrorResponse>>(trimmed);
            }
            if (trimmed.StartsWith("{"))
            {
                var single = JsonConvert.DeserializeObject<SalesforceErrorResponse>(trimmed);
                if (single != null && (!string.IsNullOrEmpty(single.ErrorCode) || !string.IsNullOrEmpty(single.Message) || !string.IsNullOrEmpty(single.Error)))
                {
                    return new List<SalesforceErrorResponse> { single };
                }
            }
        }
        catch
        {
            // Fall back to plain exception message
        }

        return null;
    }

    private async Task ValidateResponse(HttpResponseMessage response)
    {
        if (!((int)response.StatusCode >= 200 && (int)response.StatusCode < 300))
        {
            var data = await response.Content.ReadAsStringAsync();
            var message = "";
            try
            {
                var token = JToken.Parse(data);
                if (token is JArray arr && arr.Count > 0)
                {
                    var first = arr[0];
                    message = first["message"]?.ToString() ?? first["errorCode"]?.ToString() ?? "";
                }
                else if (token is JObject obj)
                {
                    JToken? status = obj["status"] ?? obj.First?.First;
                    if (status != null && status.Type == JTokenType.Object)
                    {
                        SapHttpStatus? httpStatus = status.ToObject<SapHttpStatus>();
                        message = httpStatus?.Line;
                    }
                    else if (obj["message"] != null)
                    {
                        message = obj["message"]?.ToString();
                    }
                }
            }
            catch
            {
                // ignore parsing error
            }

            if (string.IsNullOrWhiteSpace(message))
            {
                message = $"{(int)response.StatusCode} {response.ReasonPhrase}. Response: {data}";
            }

            throw new SapResponseException($"Salesforce connection error: {message}");
        }
    }

    private async Task EnsureSuccessAsync(HttpResponseMessage response, CancellationToken cancellationToken)
    {
        if (response.IsSuccessStatusCode) return;

        var content = await response.Content.ReadAsStringAsync(cancellationToken);
        var errors = TryParseErrors(content);

        var message = errors != null && errors.Count > 0
            ? string.Join("; ", errors.Select(e => e.ToString()))
            : $"Salesforce API request failed with status {(int)response.StatusCode} {response.ReasonPhrase}. Body: {content}";

        this.logger.LogError("Salesforce API error: {Message}", message);
        throw new SalesforceResponseException(message, response.StatusCode, errors);
    }

    #endregion

    #region ISapHttpClient Implementation (For .NET Managers)

    public async Task<SapHttpData<T?>> GetData<T>(string pathKey, Dictionary<string, string?>? parameters, string language = "en") where T : class
    {
        var response = await this.SendWithRetryAsync(HttpMethod.Get, pathKey, null, parameters);
        await this.ValidateResponse(response);

        var data = await response.Content.ReadAsStringAsync();
        var httpData = new SapHttpData<T?>();

        if (!string.IsNullOrEmpty(data))
        {
            var obj = (JObject?)JsonConvert.DeserializeObject(data);
            if (obj != null)
            {
                JToken? status = obj["status"] ?? obj.Properties().FirstOrDefault(p => string.Equals(p.Name, "status", StringComparison.OrdinalIgnoreCase))?.Value;
                JToken? value = obj["detail"]
                    ?? obj["data"]
                    ?? obj["document_list"]
                    ?? obj["accounts"]
                    ?? obj["payment_list"]
                    ?? obj.Properties().FirstOrDefault(p => !string.Equals(p.Name, "status", StringComparison.OrdinalIgnoreCase))?.Value
                    ?? (status != null && obj.Count == 1 ? null : obj.First?.First);

                if (value != null)
                {
                    httpData.Data = JsonConvert.DeserializeObject<T>(data);
                }
                if (status != null && status.Type == JTokenType.Object)
                {
                    httpData.Status = status.ToObject<SapHttpStatus>();
                }
            }
        }

        return httpData;
    }

    public async Task<SapHttpData<T?>> Get<T>(string pathKey, Dictionary<string, string?>? parameters, string language = "en", bool wrapped = true) where T : class
    {
        var response = await this.SendWithRetryAsync(HttpMethod.Get, pathKey, null, parameters);
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
                        httpData.Status = statusToken.ToObject<SapHttpStatus>();
                        return httpData;
                    }
                }
            }
            throw new SapResponseException($"Salesforce connection error: {(int)response.StatusCode} {response.ReasonPhrase}.");
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
                    JToken? status = obj["status"] ?? obj.Properties().FirstOrDefault(p => string.Equals(p.Name, "status", StringComparison.OrdinalIgnoreCase))?.Value;
                    JToken? value = obj["document_list"]
                        ?? obj["data"]
                        ?? obj["accounts"]
                        ?? obj["payment_list"]
                        ?? obj["detail"]
                        ?? obj.Properties().FirstOrDefault(p => !string.Equals(p.Name, "status", StringComparison.OrdinalIgnoreCase))?.Value
                        ?? (status != null && obj.Count == 1 ? null : obj.First?.First);

                    if (value != null)
                    {
                        if (value.Type == JTokenType.Array && !typeof(System.Collections.IEnumerable).IsAssignableFrom(typeof(T)))
                        {
                            httpData.Data = value.First?.ToObject<T>();
                        }
                        else
                        {
                            httpData.Data = value.ToObject<T>();
                        }
                    }
                    if (status != null && status.Type == JTokenType.Object)
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

    public async Task<HttpResponseMessage> GetAsync(string url, dynamic body, string action, Dictionary<string, string> queryParams = null, string language = "en")
    {
        var stringDict = queryParams?.ToDictionary(k => k.Key, v => (string?)v.Value);
        return await this.SendWithRetryAsync(HttpMethod.Get, url, body, stringDict);
    }

    public async Task<SapHttpData<T?>> Post<T>(string pathKey, Dictionary<string, string?>? parameters, dynamic body, string language = "en", bool wrapped = true) where T : class
    {
        var httpData = new SapHttpData<T?>();
        var response = await this.SendWithRetryAsync(HttpMethod.Post, pathKey, body, parameters);

        if (response.StatusCode != HttpStatusCode.OK)
        {
            var errorData = await response.Content.ReadAsStringAsync();
            if (!string.IsNullOrEmpty(errorData))
            {
                var trimmed = errorData.Trim();
                if (trimmed.StartsWith("["))
                {
                    var errorArray = JsonConvert.DeserializeObject<JArray>(errorData);
                    var firstError = errorArray?.FirstOrDefault();
                    if (firstError != null)
                    {
                        httpData.Status = new SapHttpStatus
                        {
                            Line = firstError["message"]?.ToString() ?? firstError["errorCode"]?.ToString()
                        };
                    }
                }
                else
                {
                    JObject? errorObj = JsonConvert.DeserializeObject<JObject>(errorData);
                    if (!wrapped && errorObj != null)
                    {
                        httpData.Data = errorObj.ToObject<T>();
                    }

                    JToken? statusToken = errorObj?["status"] ?? errorObj?["SapHttpStatus"];
                    if (statusToken != null && statusToken.Type == JTokenType.Array)
                    {
                        var statusList = statusToken.ToObject<List<SapHttpStatus>>();
                        if (statusList != null && statusList.Count > 0)
                        {
                            httpData.Status = statusList[0];
                        }
                    }
                    else if (statusToken != null && statusToken.Type == JTokenType.Object)
                    {
                        httpData.Status = statusToken.ToObject<SapHttpStatus>();
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
                var obj = (JObject?)JsonConvert.DeserializeObject(data);
                if (obj != null)
                {
                    JToken? value = obj["data"] ?? obj.First?.First;
                    JToken? status = obj["status"] ?? obj.Last?.First;

                    if (value != null)
                    {
                        if (value.Type == JTokenType.Array && !typeof(System.Collections.IEnumerable).IsAssignableFrom(typeof(T)))
                        {
                            httpData.Data = value.First?.ToObject<T>();
                        }
                        else
                        {
                            httpData.Data = value.ToObject<T>();
                        }
                    }
                    if (status != null && status.Type == JTokenType.Object)
                    {
                        httpData.Status = status.ToObject<SapHttpStatus>();
                    }
                    else if (status != null && status.Type == JTokenType.Array)
                    {
                        var statusArray = status.ToObject<List<SapHttpStatus>>();
                        httpData.Status = statusArray?.FirstOrDefault();
                    }
                }
            }
            else
            {
                httpData.Data = JsonConvert.DeserializeObject<T>(data);
                var obj = JObject.Parse(data);
                var statusToken = obj["status"];
                if (statusToken != null && statusToken.Type == JTokenType.Object)
                {
                    httpData.Status = statusToken.ToObject<SapHttpStatus>();
                }
            }
        }

        return httpData;
    }

    public async Task<byte[]?> GetPdf(string pathKey, dynamic data, string language = "en")
    {
        var response = await this.SendWithRetryAsync(HttpMethod.Post, pathKey, data, null);
        if (response.IsSuccessStatusCode && response.Content != null)
        {
            return await response.Content.ReadAsByteArrayAsync();
        }
        return null;
    }

    public async Task<SapHttpData<T?>> Delete<T>(string pathKey, Dictionary<string, string?>? parameters, dynamic body, string language = "en", bool wrapped = true) where T : class
    {
        var httpData = new SapHttpData<T?>();
        var response = await this.SendWithRetryAsync(HttpMethod.Delete, pathKey, body, parameters);

        if (response.StatusCode != HttpStatusCode.OK)
        {
            var errorData = await response.Content.ReadAsStringAsync();
            if (!string.IsNullOrEmpty(errorData))
            {
                JObject? errorObj = JsonConvert.DeserializeObject<JObject>(errorData);
                JToken? statusToken = errorObj?["status"];
                if (statusToken != null && statusToken.Type == JTokenType.Object)
                {
                    httpData.Status = statusToken.ToObject<SapHttpStatus>();
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
                var obj = (JObject?)JsonConvert.DeserializeObject(data);
                if (obj != null)
                {
                    JToken? value = obj["data"] ?? obj.First?.First;
                    JToken? status = obj["status"] ?? obj.Last?.First;
                    if (value != null)
                    {
                        if (value.Type == JTokenType.Array && !typeof(System.Collections.IEnumerable).IsAssignableFrom(typeof(T)))
                        {
                            httpData.Data = value.First?.ToObject<T>();
                        }
                        else
                        {
                            httpData.Data = value.ToObject<T>();
                        }
                    }
                    if (status != null && status.Type == JTokenType.Object) httpData.Status = status.ToObject<SapHttpStatus>();
                }
            }
            else
            {
                httpData.Data = JsonConvert.DeserializeObject<T>(data);
            }
        }

        return httpData;
    }

    #endregion

    #region ISalesforceHttpClient Direct REST Implementation

    public async Task<T?> GetAsync<T>(string endpointOrPath, Dictionary<string, string?>? queryParams = null, CancellationToken cancellationToken = default) where T : class
    {
        using var response = await this.SendWithRetryAsync(HttpMethod.Get, endpointOrPath, null, queryParams, cancellationToken);
        await this.EnsureSuccessAsync(response, cancellationToken);

        var data = await response.Content.ReadAsStringAsync(cancellationToken);
        if (string.IsNullOrWhiteSpace(data)) return null;

        if (typeof(T) == typeof(string))
        {
            return data as T;
        }

        return JsonConvert.DeserializeObject<T>(data);
    }

    public async Task<T?> PostAsync<T>(string endpointOrPath, object? body, Dictionary<string, string?>? queryParams = null, CancellationToken cancellationToken = default) where T : class
    {
        using var response = await this.SendWithRetryAsync(HttpMethod.Post, endpointOrPath, body, queryParams, cancellationToken);
        await this.EnsureSuccessAsync(response, cancellationToken);

        var data = await response.Content.ReadAsStringAsync(cancellationToken);
        if (string.IsNullOrWhiteSpace(data)) return null;

        if (typeof(T) == typeof(string))
        {
            return data as T;
        }

        return JsonConvert.DeserializeObject<T>(data);
    }

    public async Task<T?> PatchAsync<T>(string endpointOrPath, object? body, Dictionary<string, string?>? queryParams = null, CancellationToken cancellationToken = default) where T : class
    {
        var patchMethod = new HttpMethod("PATCH");
        using var response = await this.SendWithRetryAsync(patchMethod, endpointOrPath, body, queryParams, cancellationToken);
        await this.EnsureSuccessAsync(response, cancellationToken);

        var data = await response.Content.ReadAsStringAsync(cancellationToken);
        if (string.IsNullOrWhiteSpace(data)) return null;

        if (typeof(T) == typeof(string))
        {
            return data as T;
        }

        return JsonConvert.DeserializeObject<T>(data);
    }

    public async Task<bool> DeleteAsync(string endpointOrPath, Dictionary<string, string?>? queryParams = null, CancellationToken cancellationToken = default)
    {
        using var response = await this.SendWithRetryAsync(HttpMethod.Delete, endpointOrPath, null, queryParams, cancellationToken);
        await this.EnsureSuccessAsync(response, cancellationToken);
        return response.IsSuccessStatusCode;
    }

    public async Task<SalesforceQueryResult<T>?> QueryAsync<T>(string soqlQuery, CancellationToken cancellationToken = default) where T : class
    {
        if (string.IsNullOrWhiteSpace(soqlQuery))
        {
            throw new ArgumentException("SOQL query string cannot be null or empty.", nameof(soqlQuery));
        }

        var queryParams = new Dictionary<string, string?>
        {
            { "q", soqlQuery }
        };

        return await this.GetAsync<SalesforceQueryResult<T>>("query", queryParams, cancellationToken);
    }

    #endregion

    public void Dispose()
    {
        if (!this.disposed)
        {
            this.tokenSemaphore.Dispose();
            this.httpClient.Dispose();
            this.disposed = true;
        }
        GC.SuppressFinalize(this);
    }
}
