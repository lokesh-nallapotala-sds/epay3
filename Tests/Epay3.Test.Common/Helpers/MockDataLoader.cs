using Newtonsoft.Json;
using System.Reflection;

namespace Epay3.Test.Common.Helpers;

public static class MockDataLoader
{
    public static T Load<T>(string fileName)
    {
        var assembly = Assembly.GetExecutingAssembly();
        var resourceName = $"Epay3.Test.Common.MockData.{fileName}";

        using (var stream = assembly.GetManifestResourceStream(resourceName))
        {
            if (stream == null)
            {
                throw new FileNotFoundException($"Resource '{resourceName}' not found. Make sure the file is marked as an Embedded Resource.");
            }

            using (var reader = new StreamReader(stream))
            {
                var json = reader.ReadToEnd();
                return JsonConvert.DeserializeObject<T>(json) ?? throw new InvalidOperationException("Failed to deserialize mock data.");
            }
        }
    }
}
