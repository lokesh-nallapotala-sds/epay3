using Epay3Service.Managers;
using Newtonsoft.Json;

namespace Epay3Service.Tests.Managers;

public class LanguageManagerTests
{
    private readonly LanguageManager _languageManager;

    public LanguageManagerTests()
    {
        _languageManager = new LanguageManager();
    }

    [Fact]
    public void GetMessage_ReturnsConfiguredMessage_WhenLanguageFileContainsKey()
    {
        // Arrange
        const string language = "zz-language-manager-configured";
        const string key = "test.message";
        const string expected = "Configured message";
        var filePath = CreateLanguageFile(language, "{\"test.message\":\"Configured message\"}");

        try
        {
            // Act
            var result = _languageManager.GetMessage(key, language, "Default message");

            // Assert
            Assert.Equal(expected, result);
        }
        finally
        {
            DeleteFile(filePath);
        }
    }

    [Fact]
    public void GetMessage_ReturnsDefaultMessage_WhenKeyDoesNotExistInLanguageFile()
    {
        // Arrange
        const string language = "zz-language-manager-missing-key";
        const string defaultMessage = "Default message";
        var filePath = CreateLanguageFile(language, "{\"other.message\":\"Configured message\"}");

        try
        {
            // Act
            var result = _languageManager.GetMessage("test.message", language, defaultMessage);

            // Assert
            Assert.Equal(defaultMessage, result);
        }
        finally
        {
            DeleteFile(filePath);
        }
    }

    [Fact]
    public void GetMessage_ReturnsDefaultMessage_WhenConfiguredMessageIsEmpty()
    {
        // Arrange
        const string language = "zz-language-manager-empty-message";
        const string defaultMessage = "Default message";
        var filePath = CreateLanguageFile(language, "{\"test.message\":\"\"}");

        try
        {
            // Act
            var result = _languageManager.GetMessage("test.message", language, defaultMessage);

            // Assert
            Assert.Equal(defaultMessage, result);
        }
        finally
        {
            DeleteFile(filePath);
        }
    }

    [Fact]
    public void GetMessage_ReturnsCachedMessage_WhenLanguageFileChangesAfterFirstRead()
    {
        // Arrange
        const string language = "zz-language-manager-cached";
        const string key = "test.message";
        var filePath = CreateLanguageFile(language, "{\"test.message\":\"First message\"}");

        try
        {
            var firstResult = _languageManager.GetMessage(key, language, "Default message");
            File.WriteAllText(filePath, "{\"test.message\":\"Updated message\"}");

            // Act
            var secondResult = _languageManager.GetMessage(key, language, "Default message");

            // Assert
            Assert.Equal("First message", firstResult);
            Assert.Equal("First message", secondResult);
        }
        finally
        {
            DeleteFile(filePath);
        }
    }

    [Fact]
    public void GetMessage_ThrowsKeyNotFoundException_WhenLanguageFileDoesNotExist()
    {
        // Arrange
        const string language = "zz-language-manager-missing-file";
        var filePath = GetLanguageFilePath(language);
        DeleteFile(filePath);

        try
        {
            // Act
            var exception = Assert.Throws<KeyNotFoundException>(() =>
                _languageManager.GetMessage("test.message", language, "Default message"));

            // Assert
            Assert.Contains(language, exception.Message);
        }
        finally
        {
            DeleteFile(filePath);
        }
    }

    [Fact]
    public void GetMessage_ThrowsJsonReaderException_WhenLanguageFileContainsInvalidJson()
    {
        // Arrange
        const string language = "zz-language-manager-invalid-json";
        var filePath = CreateLanguageFile(language, "{ invalid json");

        try
        {
            // Act
            Assert.Throws<JsonReaderException>(() =>
                _languageManager.GetMessage("test.message", language, "Default message"));
        }
        finally
        {
            DeleteFile(filePath);
        }
    }

    private static string CreateLanguageFile(string language, string content)
    {
        var filePath = GetLanguageFilePath(language);
        Directory.CreateDirectory(Path.GetDirectoryName(filePath)!);
        File.WriteAllText(filePath, content);
        return filePath;
    }

    private static string GetLanguageFilePath(string language) =>
        Path.Combine(Path.GetDirectoryName(AppContext.BaseDirectory)!, "Config", "Languages", $"{language}.json");

    private static void DeleteFile(string filePath)
    {
        if (File.Exists(filePath))
        {
            File.Delete(filePath);
        }
    }
}
