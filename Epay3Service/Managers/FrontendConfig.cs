using Newtonsoft.Json.Linq;

namespace Epay3Service.Managers;

public class FrontendConfig {
    private JObject json = new();
    private JObject jsonLanguages = new();
    private readonly string basePath;
    private readonly string configDir = "config";
    private readonly string defaultDir = "default";
    private readonly string overridesDir = "overrides";
    private readonly string il8nDir = "il8n";
    private readonly string fullConfigDir;
    private readonly List<string> supportedLanguages = new();

    private readonly List<string> configsKeys = new() {
        "invoice_table",
        "style",
        "defaults",
    };


    public FrontendConfig(string basePath = "") {
        this.basePath = basePath;

        this.fullConfigDir = Path.Join(this.basePath, this.configDir);

        //            watch();
        this.LoadAllConfigs();
    }

    private void LoadAllConfigs() {
        this.json = new JObject();
        this.jsonLanguages = new JObject();

        var defaultIl8nDir = Path.Join(this.fullConfigDir, this.defaultDir, this.il8nDir);
        var overrideIl8nDir = Path.Join(this.fullConfigDir, this.overridesDir, this.il8nDir);
        var configDefaultDir = Path.Join(this.fullConfigDir, this.defaultDir);
        var configOverrideDir = Path.Join(this.fullConfigDir, this.overridesDir);

        this.LoadConfigs(this.configsKeys, configDefaultDir, true);
        this.LoadConfigs(this.configsKeys, configOverrideDir, false);
        this.LoadLanguages(defaultIl8nDir);
        this.LoadLanguages(overrideIl8nDir);
    }

    private void LoadLanguages(string defaultIl8NDir) {
        if (Directory.Exists(defaultIl8NDir)) {
            foreach (var file in Directory.GetFiles(defaultIl8NDir)) {
                var language = Path.GetFileNameWithoutExtension(file);
                this.supportedLanguages.Add(language);
                using (StreamReader r = new StreamReader(file)) {
                    string json = r.ReadToEnd();
                    var o1 = JObject.Parse(json);
                    if (this.jsonLanguages.ContainsKey(language)) {
                        var languageJson = (JObject)this.jsonLanguages[language];
                        languageJson.Merge(o1, new JsonMergeSettings {
                            // union array values together to avoid duplicates
                            MergeArrayHandling = MergeArrayHandling.Replace,
                        });
                    }
                    else {
                        this.jsonLanguages[language] = o1;
                    }
                }
            }
        }
    }

    private void LoadConfigs(List<string> configsToLoad, string configDir, bool required = false) {
        foreach (var config in configsToLoad) {
            var configPath = Path.Join(configDir, config + ".json");
            if (File.Exists(configPath)) {
                this._LoadFile(configPath, config);
            }
        }
    }

    private void _LoadFile(string file, string key) {
        // Get all
        using (StreamReader r = new StreamReader(file)) {
            string json = r.ReadToEnd();
            var o1 = JObject.Parse(json);

            var o = new JObject { [key] = o1 };

            this.json.Merge(o, new JsonMergeSettings {
                // union array values together to avoid duplicates
                MergeArrayHandling = MergeArrayHandling.Replace,
            });
        }
    }

    public JObject GetJson() {
        this.json["languages"] = this.jsonLanguages;
        return this.json;
    }

    public Dictionary<string, Dictionary<string, string>> GetLanguageMessages() => this.jsonLanguages.ToObject<Dictionary<string, Dictionary<string, string>>>();

    private FileSystemWatcher watcher;

    private void watch() {
        this.watcher = new FileSystemWatcher();
        this.watcher.Path = this.fullConfigDir;
        this.watcher.NotifyFilter = NotifyFilters.LastAccess | NotifyFilters.LastWrite
                                                        | NotifyFilters.FileName | NotifyFilters.DirectoryName;
        this.watcher.IncludeSubdirectories = true;
        this.watcher.Filter = "*.*";
        this.watcher.Changed += this.OnChanged;
        this.watcher.EnableRaisingEvents = true;
    }

    private void OnChanged(object source, FileSystemEventArgs e) {
        try {
            // Because of timing issues the config files may be still being written to,
            // this is why we do an ignored try/catch
            this.LoadAllConfigs();
        }
        catch (Exception) {
            // ignored
        }
    }
}
