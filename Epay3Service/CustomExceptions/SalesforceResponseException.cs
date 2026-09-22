using System.Net;
using Epay3Service.Clients.Models;

namespace Epay3Service.CustomExceptions;

public class SalesforceResponseException : Exception
{
    public HttpStatusCode? StatusCode { get; }
    public List<SalesforceErrorResponse>? Errors { get; }

    public SalesforceResponseException(string message) : base(message)
    {
    }

    public SalesforceResponseException(string message, Exception innerException) : base(message, innerException)
    {
    }

    public SalesforceResponseException(string message, HttpStatusCode statusCode, List<SalesforceErrorResponse>? errors = null)
        : base(message)
    {
        this.StatusCode = statusCode;
        this.Errors = errors;
    }
}
