using System.Text.RegularExpressions;

namespace Epay3Net.Tests.Security;

public class ExceptionResponseSourceTests
{
    [Theory]
    [InlineData("Epay3Net/Controllers", @"StatusCode\s*\(\s*500\s*,\s*ex\.Message\s*\)")]
    [InlineData("Epay3Net/Controllers", @"NotFound\s*\(\s*ex\.Message\s*\)")]
    [InlineData("Epay3Net/Controllers", @"new\s+ObjectResult\s*\(\s*ex\s*\)")]
    [InlineData("Epay3Net/Controllers", @"Value\s*=\s*ex\.Message")]
    [InlineData("Epay3Net/Program.cs", @"Exception\?\.Message")]
    public void ServerSource_DoesNotReturnRawExceptionMessages(string relativePath, string pattern)
    {
        // Arrange
        var root = FindRepositoryRoot();
        var path = Path.Combine(root, relativePath.Replace('/', Path.DirectorySeparatorChar));
        var files = File.Exists(path) ? new[] { path } : Directory.EnumerateFiles(path, "*.cs", SearchOption.AllDirectories);
        var regex = new Regex(pattern, RegexOptions.Compiled);

        // Act
        var matches = files
            .Select(file => new
            {
                File = Path.GetRelativePath(root, file),
                Match = regex.Match(File.ReadAllText(file))
            })
            .Where(result => result.Match.Success)
            .Select(result => $"{result.File}: {result.Match.Value}")
            .ToArray();

        // Assert
        Assert.Empty(matches);
    }

    private static string FindRepositoryRoot()
    {
        var directory = new DirectoryInfo(AppContext.BaseDirectory);
        while (directory != null)
        {
            if (File.Exists(Path.Combine(directory.FullName, "Epay3Net.sln")))
            {
                return directory.FullName;
            }

            directory = directory.Parent;
        }

        throw new DirectoryNotFoundException("Could not locate repository root containing Epay3Net.sln.");
    }
}
