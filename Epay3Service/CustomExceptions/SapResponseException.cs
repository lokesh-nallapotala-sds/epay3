

namespace Epay3Service.CustomExceptions;

public class SapResponseException(string? message) : Exception(message)
{
}
