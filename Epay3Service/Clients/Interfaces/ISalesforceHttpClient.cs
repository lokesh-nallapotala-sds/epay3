using Epay3Service.Clients.Models;

namespace Epay3Service.Clients.Interfaces;

public interface ISalesforceHttpClient : ISapHttpClient
{
    /// <summary>
    /// Executes a GET request against a Salesforce endpoint or sObject path.
    /// </summary>
    Task<T?> GetAsync<T>(string endpointOrPath, Dictionary<string, string?>? queryParams = null, CancellationToken cancellationToken = default) where T : class;

    /// <summary>
    /// Executes a POST request to create an sObject record or invoke an Apex REST endpoint.
    /// </summary>
    Task<T?> PostAsync<T>(string endpointOrPath, object? body, Dictionary<string, string?>? queryParams = null, CancellationToken cancellationToken = default) where T : class;

    /// <summary>
    /// Executes a PATCH request to update an sObject record or upsert via external ID.
    /// </summary>
    Task<T?> PatchAsync<T>(string endpointOrPath, object? body, Dictionary<string, string?>? queryParams = null, CancellationToken cancellationToken = default) where T : class;

    /// <summary>
    /// Executes a DELETE request to remove an sObject record.
    /// </summary>
    Task<bool> DeleteAsync(string endpointOrPath, Dictionary<string, string?>? queryParams = null, CancellationToken cancellationToken = default);

    /// <summary>
    /// Executes a SOQL query using the Salesforce Query REST API.
    /// </summary>
    Task<SalesforceQueryResult<T>?> QueryAsync<T>(string soqlQuery, CancellationToken cancellationToken = default) where T : class;

    /// <summary>
    /// Retrieves a valid OAuth access token, caching and refreshing as needed.
    /// </summary>
    Task<string> GetAccessTokenAsync(bool forceRefresh = false, CancellationToken cancellationToken = default);
}
