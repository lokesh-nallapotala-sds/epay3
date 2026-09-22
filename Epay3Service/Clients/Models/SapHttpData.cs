
namespace Epay3Service.Clients.Models;

public class SapHttpData<T>
{
    public T? Data { get; set; }
    public SapHttpStatus? Status { get; set; }
}
