using System.Collections.ObjectModel;
using System.Runtime.CompilerServices;

namespace Epay3Service.Helpers;

public static class LinqHelper
{
    public static bool None<TSource>(this IEnumerable<TSource> source) => !source.Any();

    public static bool None<TSource>(this IEnumerable<TSource> source, Func<TSource, bool> predicate) => !source.Any(predicate);

    public static bool Contains<TSource>(this IEnumerable<TSource> source) => source.Any();

    public static bool Contains<TSource>(this IEnumerable<TSource> source, Func<TSource, bool> predicate) => source.Any(predicate);


    public static int AddRange<T>(this IList<T> list, IEnumerable<T> items)
    {
        foreach (T obj in items) {
            list.Add(obj);
        }

        return list.Count;
    }

    public static void ForEach<T>(this IEnumerable<T> list, Action<T> action)
    {
        if (action != null)
        {
            foreach (T obj in list) {
                action(obj);
            }
        }
    }

    public static void Sort<T>(this ObservableCollection<T> collection)
    {
        List<T> sorted = collection.OrderBy(x => x).ToList();

        for (int i = 0; i < sorted.Count; i++) {
            collection.Move(collection.IndexOf(sorted[i]), i);
        }
    }

    public static void Sort<T, TKey>(this ObservableCollection<T> collection, Func<T, TKey> keySelector)
    {
        List<T> sorted = collection.OrderBy(keySelector).ToList();

        for (int i = 0; i < sorted.Count; i++) {
            collection.Move(collection.IndexOf(sorted[i]), i);
        }
    }


    public static bool IsIn(this ValueType this_, params ValueType[] orParams) => orParams.Any(a => this_.Equals(a));

    public static bool IsIn<T>(this T this_, params T[] orParams) => orParams.Any(a => this_.Equals(a));

    /// <param name="secondKeySelector"><paramref name="first"/>second is iterated for every item in first. 
    /// For performance it should not be IEnumerable, but ICollection, IList, array, etc.</param>
    public static IEnumerable<T1> Intersect<T1, T2, TKey>(this IEnumerable<T1> first, IEnumerable<T2> second,
        Func<T1, TKey> firstKeySelector, Func<T2, TKey> secondKeySelector) => first.Where
            (a => second.Any(b => EqualityComparer<TKey>.Default.Equals(firstKeySelector(a), secondKeySelector(b))));

    public static IEnumerable<T1> Intersect<T1, T2>(this IEnumerable<T1> first, IEnumerable<T2> second, Func<T1, T2, bool> equals) => first.Where(a => second.Any(b => equals(a, b)));

    public static IEnumerable<T1> Except<T1, T2, TKey>(this IEnumerable<T1> first, IEnumerable<T2> second,
        Func<T1, TKey> firstKeySelector, Func<T2, TKey> secondKeySelector) => first.Where(a => !second.Any(b => EqualityComparer<TKey>.Default.Equals(firstKeySelector(a), secondKeySelector(b))));

    public static IEnumerable<T1> Except<T1, T2>(this IEnumerable<T1> first, IEnumerable<T2> second, Func<T1, T2, bool> equals) => first.Where(a => !second.Any(b => equals(a, b)));

    public static IEnumerable<T1> WhereIn<T1, T2, TKey>(this IEnumerable<T1> first, IEnumerable<T2> second,
        Func<T1, TKey> firstKeySelector, Func<T2, TKey> secondKeySelector) => Intersect(first, second, firstKeySelector, secondKeySelector);

    public static IEnumerable<T1> WhereIn<T1, T2>(this IEnumerable<T1> first, IEnumerable<T2> second, Func<T1, T2, bool> equals) => Intersect(first, second, equals);

    public static IEnumerable<T1> WhereNotIn<T1, T2, TKey>(this IEnumerable<T1> first, IEnumerable<T2> second,
        Func<T1, TKey> firstKeySelector, Func<T2, TKey> secondKeySelector) => Except(first, second, firstKeySelector, secondKeySelector);

    public static IEnumerable<T1> WhereNotIn<T1, T2>(this IEnumerable<T1> first, IEnumerable<T2> second, Func<T1, T2, bool> equals) => Except(first, second, equals);

    public static int IndexOf<T>(this IEnumerable<T> this_, Func<T, bool> predicate) => this_.TakeWhile(a => !predicate(a)).Count();


    public static IEnumerable<T> Distinct<T, TKey>(this IEnumerable<T> items, Func<T, TKey> selector)
    {
        HashSet<TKey> keys = new HashSet<TKey>();
        foreach (T item in items) {
            if (keys.Add(selector(item))) {
                yield return item;
            }
        }
    }
}
