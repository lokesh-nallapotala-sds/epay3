namespace Epay3Service.Extensions;

public static class IEnumerableExtensions {
    public static IEnumerable<T> EmptyIfNull<T>(this IEnumerable<T> collection) => (collection != null)
               ? collection
               : new List<T>();
}
