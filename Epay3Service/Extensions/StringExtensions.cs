using System.Runtime.CompilerServices;

namespace Epay3Service.Extensions;

public static class StringExtensions {
    /// <summary>
    /// (extension) allows calling <see cref="string.IsNullOrEmpty(string)"/> like an instance method
    /// </summary>
    /// <param name="s">string to test</param>
    [MethodImpl(MethodImplOptions.AggressiveInlining)]
    public static bool IsNullOrEmpty(this string s) => string.IsNullOrEmpty(s);
    /// <summary>
    /// (extension) inverse of extension method <see cref="IsNullOrEmpty(string)"/>
    /// </summary>
    /// <param name="s">string to test</param>
    [MethodImpl(MethodImplOptions.AggressiveInlining)]
    public static bool IsNotNullOrEmpty(this string s) => !string.IsNullOrEmpty(s);
    /// <summary>
    /// (extension) allows calling <see cref="string.IsNullOrWhiteSpace(string)"/> like an instance method
    /// </summary>
    /// <param name="s">string to test</param>
    [MethodImpl(MethodImplOptions.AggressiveInlining)]
    public static bool IsNullOrWhiteSpace(this string s) => string.IsNullOrWhiteSpace(s);
    /// <summary>
    /// (extension) inverse of extension method <see cref="IsNullOrWhiteSpace(string)"/>
    /// </summary>
    /// <param name="s">string to test</param>
    [MethodImpl(MethodImplOptions.AggressiveInlining)]
    public static bool IsNotNullOrWhiteSpace(this string s) => !string.IsNullOrWhiteSpace(s);

    /// <summary>
    /// (extension) returns an empty string when parameter is null
    /// </summary>
    /// <remarks>avoids the need for null checks (sometimes multiple), which renders code more readable and possibly also more efficient</remarks>
    public static string EmptyIfNull(this string s) => s ?? string.Empty;
    /// <summary>
    /// (extension) returns null when parameter is empty
    /// </summary>
    /// <remarks>use, for example, in conjunction with <see cref="string.Trim"/> (or <see cref="TrimSafe(string)"/>) to normalize empty strings to null before serializing/persisting</remarks>
    public static string? NullIfEmpty(this string s) => string.IsNullOrEmpty(s) ? null : s;
    /// <summary>
    /// (extension) returns null when parameter is empty or whitespace
    /// </summary>
    /// <remarks>use, for example, in conjunction with <see cref="string.Trim"/> (or <see cref="TrimSafe(string)"/>) to normalize whitespace/empty strings to null before serializing/persisting</remarks>
    public static string? NullIfEmptyOrWhiteSpace(this string s) => string.IsNullOrWhiteSpace(s) ? null : s;

    /// <summary>
    /// null-safe form of <see cref="string.Trim"/>
    /// </summary>
    public static string TrimSafe(this string s) =>
        //return s.EmptyIfNull().Trim();
        string.IsNullOrEmpty(s) ? string.Empty : s.Trim();
    /// <summary>
    /// null-safe form of <see cref="string.Trim(char)"/>
    /// </summary>
    public static string TrimSafe(this string s, char c) =>
        //return s.EmptyIfNull().Trim(c);
        string.IsNullOrEmpty(s) ? string.Empty : s.Trim(c);
    /// <summary>
    /// null-safe form of <see cref="string.Trim(char[])"/>
    /// </summary>
    public static string TrimSafe(this string s, char[] chars) =>
        //return s.EmptyIfNull().Trim(chars);
        string.IsNullOrEmpty(s) ? string.Empty : s.Trim(chars);
    /// <summary>
    /// null-safe form of <see cref="string.TrimStart"/>
    /// </summary>
    public static string TrimStartSafe(this string s) =>
        //return s.EmptyIfNull().TrimStart();
        string.IsNullOrEmpty(s) ? string.Empty : s.TrimStart();
    /// <summary>
    /// null-safe form of <see cref="string.TrimStart(char)"/>
    /// </summary>
    public static string TrimStartSafe(this string s, char c) =>
        //return s.EmptyIfNull().TrimStart(c);
        string.IsNullOrEmpty(s) ? string.Empty : s.TrimStart(c);
    /// <summary>
    /// null-safe form of <see cref="string.TrimStart(char[])"/>
    /// </summary>
    public static string TrimStartSafe(this string s, char[] chars) =>
        //return s.EmptyIfNull().TrimStart(chars);
        string.IsNullOrEmpty(s) ? string.Empty : s.TrimStart(chars);
    /// <summary>
    /// null-safe form of <see cref="string.Trim"/>
    /// </summary>
    public static string TrimEndSafe(this string s) =>
        //return s.EmptyIfNull().TrimEnd();
        string.IsNullOrEmpty(s) ? string.Empty : s.TrimEnd();
    /// <summary>
    /// null-safe form of <see cref="string.TrimEnd(char)"/>
    /// </summary>
    public static string TrimEndSafe(this string s, char c) =>
        //return s.EmptyIfNull().TrimEnd(c);
        string.IsNullOrEmpty(s) ? string.Empty : s.TrimEnd(c);
    /// <summary>
    /// null-safe form of <see cref="string.TrimEnd(char[])"/>
    /// </summary>
    public static string TrimEndSafe(this string s, char[] chars) =>
        //return s.EmptyIfNull().TrimEnd(chars);
        string.IsNullOrEmpty(s) ? string.Empty : s.TrimEnd(chars);
}
