using AutoMapper;
using Epay3Net.Authorization.Abilities;
using Epay3Net.Custom.ActionResult;
using Epay3Net.FeatureManagement;
using Epay3Net.Models.config;
using Epay3Net.Maintenance;
using Epay3Net.RateLimiting;
using Epay3Service.DTOs;
using Epay3Service.Managers.Interfaces;
using Epay3Service.Models;
using Epay3Service.Services;
using MailKit.Net.Smtp;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.FeatureManagement;
using MimeKit;
using System.Text.Json.Nodes;
using System.Text.Json;
using Config = Epay3Service.Models.ConfigRequest;
using Stream = System.IO;
using ThemeConfig = Epay3Service.Models.ThemeConfig;

namespace Epay3Net.Controllers;

[Route("api/[controller]")]
[ApiController]
[Authorize]
public class ConfigController(
    IApplicationConfigurationManager manager,
    IMapper mapper,
    IConfiguration config,
    IMaintenanceCacheService maintenanceCache,
    IFeatureManager featureManager
    ) : ControllerBase
{
    private readonly IApplicationConfigurationManager manager = manager;
    private readonly IMapper mapper = mapper;
    private readonly IConfiguration config = config;
    private readonly IMaintenanceCacheService maintenanceCache = maintenanceCache;
    private readonly IFeatureManager featureManager = featureManager;

    private const string DefaultBrandIconPath = "wwwroot/public/favicon.ico";
    private const string DefaultBrandLogoPath = "wwwroot/public/logo.png";
    private static readonly HashSet<string> AllowedUploadExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".png",
        ".jpg",
        ".jpeg",
        ".gif",
        ".webp",
        ".ico"
    };

    [HttpGet("language/{language}")]
    [AllowAnonymous]
    [EnableRateLimiting(RateLimitPolicyNames.PublicConfig)]
    public IActionResult GetLanguage(string language)
    {
        try
        {
            var data = manager.GetLanguageFile(language);
            return Ok(data);
        }
        catch (Exception ex)
        {
            return new ExceptionResult(ex);
        }
    }

    [HttpGet("application")]
    [AllowAnonymous]
    [EnableRateLimiting(RateLimitPolicyNames.PublicConfig)]
    public async Task<IActionResult> GetApplicationConfig([FromQuery] bool isRefresh = false)
    {
        try
        {
            ApplicationConfiguration appConfig = await this.manager.GetApplicationConfig(isRefresh);

            // These 5 were top-level appsettings booleans; now feature flags evaluated
            // server-side. Surfaced at their original top-level response keys below so
            // existing frontend selectors are unaffected.
            bool showInvoicePdfActions =
                await this.featureManager.IsEnabledAsync(FeatureFlags.ShowInvoicePdfActions);
            bool ShowInvoiceDaysTillDue =
               await this.featureManager.IsEnabledAsync(FeatureFlags.ShowInvoiceDaysTillDue);
            bool showInvoiceHistoryFilter =
               await this.featureManager.IsEnabledAsync(FeatureFlags.ShowInvoiceHistoryFilter);
            bool showPaymentHistoryFilter =
               await this.featureManager.IsEnabledAsync(FeatureFlags.ShowPaymentHistoryFilter);
            bool enablePreAuth =
               await this.featureManager.IsEnabledAsync(FeatureFlags.EnablePreAuth);
            var jsonOptions = new JsonSerializerOptions(JsonSerializerDefaults.Web);
            JsonObject appConfigResponse =
                JsonSerializer.SerializeToNode(appConfig, jsonOptions)?.AsObject()
                ?? new JsonObject();

            appConfigResponse["showInvoicePdfActions"] = showInvoicePdfActions;
            appConfigResponse["ShowInvoiceDaysTillDue"] = ShowInvoiceDaysTillDue;
            appConfigResponse["ShowInvoiceHistoryFilter"] = showInvoiceHistoryFilter;
            appConfigResponse["ShowPaymentHistoryFilter"] = showPaymentHistoryFilter;
            appConfigResponse["enablePreAuth"] = enablePreAuth;

            // --- Remove fields not consumed by ANY client page (dead everywhere) ---
            RemoveKeysIgnoreCase(appConfigResponse,
                "applicationUrl",
                "companyName",
                "applicationName");

            bool isAuthenticated = User?.Identity?.IsAuthenticated == true;

            // Client-visible feature flags (nested "featureFlags" object), evaluated
            // server-side. Anonymous callers receive only the Public set; authenticated
            // callers also receive the AuthenticatedOnly set. Omitted when none exist.
            JsonObject featureFlags = await BuildFeatureFlagsAsync(isAuthenticated);
            if (featureFlags.Count > 0)
            {
                appConfigResponse["featureFlags"] = featureFlags;
            }

            // --- Auth-tiering (WHITELIST) ---
            // Anonymous callers receive ONLY the fields that public pages actually read
            // from applicationConfig (see AnonymousApplicationConfigFields). Everything
            // else is stripped: post-login feature config (autopay/scheduling/history
            // flags), admin-only settings (registrationEmail, messageLanguage,
            // paymentDisableMessageText, disablePaymentsGlobally), the dead duplicate
            // isPaymentsDisable, and vestigial fields whose data the UI actually sources
            // from OTHER endpoints — maintenance (isSignInDisable, maintenanceUrl,
            // fromDateLocal, toDateLocal, notificationText/Language) and payment
            // (isPaymentDisabled). Authenticated callers get the full payload via the
            // SPA's post-login config refetch (dispatch(refreshConfig()) in LoginPage).
            if (!isAuthenticated)
            {
                KeepOnlyKeysIgnoreCase(appConfigResponse, PublicConfigPolicy.AnonymousApplicationConfigFields);
            }

            return this.Ok(appConfigResponse);
        }
        catch (Exception ex)
        {
            return new ExceptionResult(ex);
        }
    }

    [HttpPost("update/application/{language}")]
    [RequiresAbility(Ability.EditSystemConfig)]
    [EnableRateLimiting(RateLimitPolicyNames.SensitiveMutation)]
    public async Task<IActionResult> UpdateApplicationConfig([FromBody] ApplicationConfigReq request)
    {
        try
        {
            var requestConfig = new Config.ApplicationConfigRequest()
            {
                AllowRegistration = request.AllowRegistration,
                RegistrationEmail = request.RegistrationEmail,
                RegistrationEmailExpiration = request.RegistrationEmailExpiration,
                ExpirationMessage = request.ExpirationMessage,
                PrivacyPolicy = SanitizeInput(request.PrivacyPolicy),
                TermsAndConditions = SanitizeInput(request.TermsAndConditions),
                ContactUs = SanitizeInput(request.ContactUs),
                ApplicationLinks = request.ApplicationLinks?
                    .Select(link => new Epay3Service.Models.ApplicationLinkItem
                    {
                        Id = SanitizeInput(link.Id),
                        Label = SanitizeInput(link.Label),
                        Url = SanitizeInput(link.Url)
                    })
                    .ToList(),
                DisablePaymentsGlobally = request.DisablePaymentsGlobally,
                AllowGuestPayment = request.AllowGuestPayment,
                IsAccountLinkingEnabled = request.IsAccountLinkingEnabled,
                MessageLanguage = request.MessageLanguage,
                PaymentDisableMessageText = request.PaymentDisableMessageText,
                MaxPaymentAllowed = SanitizeInput(request.MaxPaymentAllowed),
                MaxECheckPaymentAllowed = SanitizeInput(request.MaxECheckPaymentAllowed),
                AddressValidationOptions = request.AddressValidationOptions,
                PaymentIntegrationType = request.PaymentIntegrationType,
                IsAutoPayEnabled = request.IsAutoPayEnabled,
                IsSchedulePaymentsEnabled = request.IsSchedulePaymentsEnabled,
                ScheduledPaymentPolicy = request.ScheduledPaymentPolicy,
                AllowCVV = request.AllowCVV
            };
            Config.ApplicationConfigRequest config = await manager.UpdateApplicationConfig(requestConfig);

            return Ok(config);
        }
        catch (Exception ex)
        {
            return new ExceptionResult(ex);
        }
    }

    [HttpGet("custom")]
    [AllowAnonymous]
    [EnableRateLimiting(RateLimitPolicyNames.PublicConfig)]
    public async Task<IActionResult> GetCustomConfig([FromQuery] bool? isRefresh)
    {
        try
        {
            var reloadCustomConfig = isRefresh.HasValue && isRefresh.Value;
            SapCustomData? config = await manager.GetCustomConfig("en", reloadCustomConfig);

            if (config == null)
            {
                return Ok(config);
            }

            // Serialize first, then redact on the JSON response. We must NOT mutate the
            // SapCustomData object: GetCustomConfig returns a process-wide singleton-
            // cached instance, so mutating it would corrupt the copy other server-side
            // code reads — e.g. CspMiddleware reads PaymentProviders[].InitializationUrl.
            var jsonOptions = new JsonSerializerOptions(JsonSerializerDefaults.Web);
            JsonObject customResponse =
                JsonSerializer.SerializeToNode(config, jsonOptions)?.AsObject()
                ?? new JsonObject();

            // --- Remove top-level fields not consumed by ANY client page (verified
            // against the frontend). Internal/system data, unused everywhere, so safe
            // for both anonymous and authenticated callers. `parameters` is especially
            // important to drop: it carries internal identifiers (DEFAPIID) and the
            // ZZECMGUID merchant GUID. (Also supersedes the prior AVS-only filtering.)
            RemoveKeysIgnoreCase(customResponse,
                "applicationId",
                "description",
                "releaseInfo",
                "functionModules",
                "parameters",
                "logEvents");

            // --- Redact provider fields the client never reads (all callers) ---
            //   providerKey       – provider credential, must never reach the client
            //   initializationUrl – used server-side by CspMiddleware, not the client
            //   merchantGuid, providerVersion – not read by any client page
            // Kept (used by the guest 3DS flow): provider, description,
            // isSecure3dsEnabled, secure3dsVersion.
            RedactArrayElementKeys(customResponse, "paymentProviders",
                "providerKey",
                "initializationUrl",
                "merchantGuid",
                "providerVersion");

            // --- Auth-tiering (WHITELIST) ---
            // Anonymous callers receive ONLY the customConfig fields the guest-payment
            // flow reads (see AnonymousCustomConfigFields). Stripped for anonymous:
            //   salesOrganizations – internal SAP org structure (authenticated settings only)
            //   documentTypes, documentStatuses, paymentMethods, sapCustomer,
            //   paymentReasonCodes – not read from customConfig by any page (the UI
            //     sources payment methods/reason codes from other state/endpoints).
            // These five also appear unused everywhere and are candidates for removal
            // for ALL callers, but are left intact for authenticated requests here to
            // keep this change scoped to the unauthenticated route. Authenticated
            // callers get the full payload via the SPA's post-login config refetch.
            if (User?.Identity?.IsAuthenticated != true)
            {
                KeepOnlyKeysIgnoreCase(customResponse, PublicConfigPolicy.AnonymousCustomConfigFields);
            }

            return Ok(customResponse);
        }
        catch (Exception ex)
        {
            return new ExceptionResult(ex);
        }
    }

    [HttpGet("paymentcardtype")]
    [AllowAnonymous]
    [EnableRateLimiting(RateLimitPolicyNames.PublicConfig)]
    public async Task<IActionResult> GetPaymentCardTypes([FromQuery] bool? isRefresh)
    {
        try
        {
            var reloadCustomConfig = isRefresh.HasValue && isRefresh.Value;
            SapCustomData? config = await manager.GetCustomConfig("en", reloadCustomConfig);

            if (config?.PaymentCards == null || !config.PaymentCards.Any())
                return Ok(string.Empty);

            var cardTypes = string.Join(",", config.PaymentCards
                .Where(c => !string.IsNullOrWhiteSpace(c.PaymentCardType))
                .Select(c => c.PaymentCardType));

            return Ok(cardTypes);
        }
        catch (Exception ex)
        {
            return new ExceptionResult(ex);
        }
    }

    [HttpGet("theme")]
    [AllowAnonymous]
    [EnableRateLimiting(RateLimitPolicyNames.PublicConfig)]
    public async Task<IActionResult> GetThemeConfig()
    {
        try
        {
            ThemeConfig[] config = await manager.GetThemeConfig();

            if (config == null || config.Length == 0)
            {
                return Ok(new[] { GetDefaultThemeConfig() });
            }

            return Ok(config);
        }
        catch (Exception ex)
        {
            return new ExceptionResult(ex);
        }
    }

    [HttpGet("GetThemeForUrl")]
    [AllowAnonymous]
    [EnableRateLimiting(RateLimitPolicyNames.PublicConfig)]
    public async Task<IActionResult> GetThemeForUrl([FromQuery] string url)
    {
        try
        {
            ThemeConfig config = await manager.GetThemeForUrl(url);

            if (config == null)
            {
                return Ok(GetDefaultThemeConfig());
            }

            return Ok(config);
        }
        catch (Exception ex)
        {
            return new ExceptionResult(ex);
        }
    }

    [HttpPut("LoadImagesForApp")]
    [RequiresAbility(Ability.EditSystemConfig)]
    [EnableRateLimiting(RateLimitPolicyNames.SensitiveMutation)]
    public async Task LoadImagesForApp()
    {
        try
        {
            // Fetch the theme configuration
            ThemeConfig[] config = await manager.GetThemeConfig();

            // An empty result can also mean SAP returned nothing (GetValues
            // swallows a null payload) — remember it so the orphan sweep below
            // never runs on a guess about which themes exist.
            bool haveRealThemeList = config != null && config.Any();

            // Check if the config is not null and has items
            if (!haveRealThemeList)
            {
                config = [GetDefaultThemeConfig()];
            }

            // Loop through each item in the configuration
            foreach (ThemeConfig item in config)
            {
                // Check if item is null
                if (item == null || string.IsNullOrWhiteSpace(item.Name))
                {
                    continue;
                }

                // Extract the domain name from the item's name
                string domainName = item.Name.Contains("_")
                    ? item.Name.Substring(item.Name.IndexOf("_") + 1)
                    : "default";

                // Save the BrandIcon if it exists
                if (!string.IsNullOrWhiteSpace(item.BrandIcon))
                {
                    var iconFile = ConvertBase64StringToIFormFile(item.BrandIcon);
                    await SaveBase64ImageToFile(iconFile, "favicon.ico", domainName);
                }

                // Save the BrandLogo if it exists
                if (!string.IsNullOrWhiteSpace(item.BrandLogo))
                {
                    var logoFile = ConvertBase64StringToIFormFile(item.BrandLogo);
                    await SaveBase64ImageToFile(logoFile, "logo.png", domainName);
                }
            }

            // Themes were deleted/renamed before cleanup existed — sweep the
            // folders they left behind. Runs here (not on delete) so every
            // instance self-heals on its first request. Only with a real theme
            // list — on the fallback every tenant folder would look orphaned.
            if (haveRealThemeList)
            {
                CleanupOrphanThemeAssetFolders(config);
            }
        }
        catch (Exception ex)
        {
            // Log the exception for debugging purposes
            Console.Error.WriteLine($"Error in LoadImagesForApp: {ex.Message}");
        }
    }

    [HttpGet("payment")]
    [AllowAnonymous]
    [EnableRateLimiting(RateLimitPolicyNames.PublicConfig)]
    public async Task<IActionResult> GetPaymentConfig()
    {
        try
        {
            PaymentConfiguration config = await manager.GetPaymentConfig();
            return Ok(config);
        }
        catch (Exception ex)
        {
            return new ExceptionResult(ex);
        }
    }

    [HttpGet("email")]
    [AllowAnonymous]
    [EnableRateLimiting(RateLimitPolicyNames.PublicConfig)]
    public async Task<IActionResult> CheckAllEmailTemplates(
    [FromQuery] string language = "en")
    {
        try
        {
            var healthCheck = await this.manager.CheckEmailTemplates(language);

            if (healthCheck != null && !healthCheck.HasMissingTemplates)
            {
                return Ok(new
                {
                    hasMissingTemplates = false,
                    message = string.Empty
                });
            }

            string message = "Some email templates are blank. Please check the Email tab of Configuration.";

            return Ok(new
            {
                hasMissingTemplates = true,
                message
            });
        }
        catch (Exception ex)
        {
            return new ExceptionResult(ex);
        }
    }


    [HttpGet("paymentcards")]
    [RequiresAbility(Ability.MakePayment)]
    public async Task<IActionResult> GetPaymenCards()
    {
        try
        {
            List<PaymentCardInfo>? config = await manager.GetPaymentCards();
            return Ok(config);
        }
        catch (Exception ex)
        {
            return new ExceptionResult(ex);
        }
    }

    [Route("smtp")]
    [RequiresAbility(Ability.EditSystemConfig)]
    [HttpGet]
    public async Task<IActionResult> GetSmtpConfig()
    {
        try
        {
            EmailConfigRequest config = await this.manager.GetSmtpConfig();

            var response = new EmailConfigRequest
            {
                SmtpAddress = config.SmtpAddress,
                SmtpPort = config.SmtpPort,
                SmtpUseUser = config.SmtpUseUser,
                SmtpUser = config.SmtpUser,
                HasPassword = !string.IsNullOrEmpty(config.SmtpPassword),

                RegistrationRequestEmail = config.RegistrationRequestEmail,
                OverrideEmail = config.OverrideEmail,
                SecurityEmail = config.SecurityEmail,
                FromAddress = config.FromAddress,
                FromAddressName = config.FromAddressName,
                RegistrationRequestEmailContent = config.RegistrationRequestEmailContent,
                WelcomeEmailContent = config.WelcomeEmailContent,
                ResetPasswordEmailContent = config.ResetPasswordEmailContent,
                EmailConfirmationContent = config.EmailConfirmationContent,
                applicationUrl = config.applicationUrl,
                companyName = config.companyName
            };

            return this.Ok(response);
        }
        catch (Exception ex)
        {
            return new ExceptionResult(ex);
        }
    }

    [HttpPost("update/emailconfig/{language}")]
    [RequiresAbility(Ability.EditSystemConfig)]
    [EnableRateLimiting(RateLimitPolicyNames.SensitiveMutation)]
    public async Task<IActionResult> UpdateEmailConfig([FromBody] EmailConfigRequestInfo requestConfig)
    {
        try
        {
            EmailConfigRequest configValue = await this.manager.GetSmtpConfig();
            if (string.IsNullOrEmpty(requestConfig.smtpPassword))
            {
                requestConfig.smtpPassword = configValue.SmtpPassword;
            }

            EmailConfigRequest request = this.mapper.Map<EmailConfigRequest>(requestConfig);

            EmailConfigRequest config = await manager.UpdateEmailConfig(request);

            return Ok(config);
        }
        catch (Exception ex)
        {
            return new ExceptionResult(ex);
        }
    }

    [HttpPost("update/themes/{language}")]
    [RequiresAbility(Ability.EditSystemConfig)]
    [EnableRateLimiting(RateLimitPolicyNames.SensitiveMutation)]
    public async Task<IActionResult> UpdateThemeConfig([FromBody] ThemeConfig[] requestConfig)
    {
        try
        {
            string? reservedTemplateName = GetReservedUserThemeName(requestConfig);
            if (reservedTemplateName != null)
            {
                return BadRequest(
                    $"'{reservedTemplateName}' is reserved and cannot be used as a theme template name.");
            }

            // Directly pass requestConfig if updateThemeConfig expects ThemeConfigurations object
            ThemeConfig[] config = await manager.updateThemeConfig(requestConfig);
            foreach (ThemeConfig item in config)
            {
                int underscoreIndex = item.Name?.IndexOf("_") ?? -1;
                string template = underscoreIndex >= 0 && item.Name != null ? item.Name.Substring(underscoreIndex + 1) : "default";

                if (item.BrandIcon != null)
                {
                    await SaveBase64ImageToFile(ConvertBase64StringToIFormFile(item.BrandIcon), "favicon.ico", template);
                }
                if (item.BrandLogo != null)
                {
                    await SaveBase64ImageToFile(ConvertBase64StringToIFormFile(item.BrandLogo), "logo.png", template);
                }
            }
            return Ok(config);
        }
        catch (Exception ex)
        {
            return new ExceptionResult(ex);
        }
    }

    [HttpPost("delete/themes/{language}")]
    [RequiresAbility(Ability.EditSystemConfig)]
    [EnableRateLimiting(RateLimitPolicyNames.SensitiveMutation)]
    public async Task<IActionResult> DeleteThemeConfig([FromBody] ThemeConfig[] requestConfig, string language)
    {
        try
        {
            await manager.deleteThemeConfig(requestConfig, language);

            foreach (ThemeConfig item in requestConfig)
            {
                try
                {
                    DeleteThemeAssetFolder(item.Name);
                }
                catch (Exception ioEx)
                {
                    // Asset cleanup is best-effort — the SAP delete already
                    // succeeded, and orphaned files are rebuilt/ignored anyway.
                    Console.Error.WriteLine($"Failed to delete theme assets for '{item.Name}': {ioEx.Message}");
                }
            }

            // Optionally return the updated config after deletion
            ThemeConfig[] updatedConfig = await manager.GetThemeConfig(language);

            return Ok(updatedConfig);
        }
        catch (Exception ex)
        {
            return new ExceptionResult(ex);
        }
    }


    [Route("email/{key}")]
    [RequiresAbility(Ability.EditSystemConfig)]
    [HttpGet]
    public async Task<IActionResult> GetEmailTemplates(string key)
    {
        try
        {
            EmailConfig? config = await manager.GetEmailTemplates(key);

            return Ok(config);
        }
        catch (Exception ex)
        {
            return new ExceptionResult(ex);
        }
    }

    [Route("update/emailtemplateconfig/{key}/{language}")]
    [RequiresAbility(Ability.EditSystemConfig)]
    [EnableRateLimiting(RateLimitPolicyNames.SensitiveMutation)]
    [HttpPut]
    public async Task UpdateEmailTemplate(string key, string language, [FromBody] EmailConfig config) => await manager.UpdateEmailTemplate(key, config, language);

    [Route("smtp-test")]
    [HttpPost]
    [RequiresAbility(Ability.EditSystemConfig)]
    [EnableRateLimiting(RateLimitPolicyNames.SensitiveMutation)]
    public async Task<IActionResult> SmtpTest([FromBody] SmtpConfig config)
    {
        try
        {
            var client = new SmtpClient();

            client.ServerCertificateValidationCallback = (s, c, h, e) => true;
            client.Timeout = 1000 * 30;
            EmailConfigRequest systemConfig = await manager.GetSmtpConfig();
            try
            {
                client.Connect(config.SmtpAddress, config.SmtpPort);
            }
            catch (Exception e)
            {
                return new ExceptionResult(e);
            }

            if (config.SmtpUseUser)
            {
                try
                {
                    var passwordToUse = !string.IsNullOrWhiteSpace(config.SmtpPassword)
                                        ? config.SmtpPassword
                                        : systemConfig.SmtpPassword;

                    if (string.IsNullOrWhiteSpace(passwordToUse))
                        return BadRequest("SMTP password is not configured.");
                    client.Authenticate(config.SmtpUser, passwordToUse);
                }
                catch (Exception e)
                {
                    return new ExceptionResult(e);
                }
            }

            var message = new MimeMessage();
            string now = DateTime.Now.ToString("M/d/yyyy");
            message.From.Add(new MailboxAddress(config.FromAddressName, config.FromAddress));

            if (!string.IsNullOrEmpty(systemConfig.OverrideEmail))
            {
                message.To.Add(InternetAddress.Parse(systemConfig.OverrideEmail));
            }
            else
            {
                message.To.Add(MailboxAddress.Parse(config.TestEmail));
            }

            message.Subject = "Test Email";
            var bodyBuilder = new BodyBuilder();
            bodyBuilder.TextBody = "This is an email test.";

            message.Body = bodyBuilder.ToMessageBody();

            client.Send(message);
            client.Disconnect(true);
        }
        catch (Exception e)
        {
            return new ExceptionResult(e);
        }

        return Ok(true);
    }

    [HttpPost("update/system/{language}")]
    [RequiresAbility(Ability.EditSystemConfig)]
    [EnableRateLimiting(RateLimitPolicyNames.SensitiveMutation)]
    public async Task<IActionResult> updateSystemConfig([FromBody] SystemConfig request)
    {
        try
        {
            var requestConfig = new SystemConfig()
            {
                ApplicationUrl = request.ApplicationUrl,
                CompanyName = request.CompanyName,
            };
            SystemConfig config = await manager.UpdateSystemConfig(requestConfig);
            return Ok(config);
        }
        catch (Exception ex)
        {
            return new ExceptionResult(ex);
        }
    }

    [HttpPost("update/maintenance/{language}")]
    [RequiresAbility(Ability.EditSystemConfig)]
    [EnableRateLimiting(RateLimitPolicyNames.SensitiveMutation)]
    public async Task<IActionResult> UpdateMaintenanceConfig([FromBody] MaintenanceConfigRequest requestConfig)
    {
        try
        {
            MaintenanceConfigRequest request = mapper.Map<MaintenanceConfigRequest>(requestConfig);

            MaintenanceConfigRequest config = await manager.UpdateMaintenanceConfig(request);

            return Ok(config);
        }
        catch (Exception ex)
        {
            return new ExceptionResult(ex);
        }
    }

    [Route("maintenance")]
    [HttpGet]
    [AllowAnonymous]
    [EnableRateLimiting(RateLimitPolicyNames.PublicConfig)]
    public async Task<IActionResult> GetMaintenanceConfig()
    {
        try
        {
            MaintenanceConfigRequest config = await manager.GetMaintenanceConfig();
            return Ok(config);
        }
        catch (Exception ex)
        {
            return new ExceptionResult(ex);
        }
    }

    [HttpGet("help")]
    public async Task<IActionResult> GetHelpConfig()
    {
        try
        {
            HelpConfigRequest config = await manager.GetHelpConfig();
            return Ok(config);
        }
        catch (Exception ex)
        {
            return new ExceptionResult(ex);
        }
    }

    [HttpPost("update/help")]
    [RequiresAbility(Ability.EditSystemConfig)]
    [EnableRateLimiting(RateLimitPolicyNames.SensitiveMutation)]
    public async Task<IActionResult> UpdateHelpConfig([FromBody] HelpConfigRequest requestConfig)
    {
        try
        {
            HelpConfigRequest config = await manager.UpdateHelpConfig(requestConfig);
            return Ok(config);
        }
        catch (Exception ex)
        {
            return new ExceptionResult(ex);
        }
    }

    [Route("maintenancemode")]
    [HttpGet]
    [AllowAnonymous]
    [EnableRateLimiting(RateLimitPolicyNames.PublicConfig)]
    public async Task<IActionResult> GetMaintenanceModeStatus()
    {
        try
        {
            var state = maintenanceCache.GetState();
            if (!state.HasConfig && !state.IsSapUnavailable)
            {
                // Cold cache: fill synchronously so the first answer is correct.
                await manager.GetMaintenanceConfig();
                state = maintenanceCache.GetState();
            }
            else
            {
                // Warm cache: refresh in the background once it goes stale, so
                // admin edits made on other containers propagate within the TTL.
                MaintenanceConfigRefresher.TryRefreshInBackground(HttpContext, maintenanceCache, state);
            }

            return Ok(MaintenancePresentation.CreateStatusResponse(state));
        }
        catch (Exception ex)
        {
            return new ExceptionResult(ex);
        }
    }

    [HttpGet("exists")]
    [RequiresAbility(Ability.EditSystemConfig)]
    [EnableRateLimiting(RateLimitPolicyNames.SensitiveMutation)]
    public IActionResult CheckFileExists([FromQuery] string filePath)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(filePath))
            {
                return BadRequest(new { error = "File path is required" });
            }

            // Define the allowed base directory
            var baseDirectory = Directory.GetCurrentDirectory();

            // Sanitize input - remove dangerous characters
            filePath = SanitizeFilePath(filePath);

            // Combine and get the full path
            var fullPath = Path.Combine(baseDirectory, filePath);

            // Get the canonical path (resolves .. and . sequences)
            var canonicalPath = Path.GetFullPath(fullPath);

            // Ensure the canonical path is within the base directory
            if (!canonicalPath.StartsWith(baseDirectory, StringComparison.OrdinalIgnoreCase))
            {
                return BadRequest(new { error = "Invalid file path" });
            }

            // Check if the file exists
            if (System.IO.File.Exists(canonicalPath))
            {
                return Ok(new { exists = true });
            }
            else
            {
                return NotFound(new { exists = false });
            }
        }
        catch (Exception)
        {
            // Handle errors - don't expose internal details
            return StatusCode(500, new { error = "An error occurred while checking file existence" });
        }
    }

    [HttpPost("upload")]
    [Consumes("multipart/form-data")]
    [RequiresAbility(Ability.EditSystemConfig)]
    [EnableRateLimiting(RateLimitPolicyNames.SensitiveMutation)]
    public async Task<IActionResult> UploadFile(IFormFile file)
    {
        if (file == null || file.Length == 0)
        {
            return BadRequest(new { message = "File is empty or not provided." });
        }

        try
        {
            //Step1 : Set the folder path
            string extension = Path.GetExtension(file.FileName);
            if (string.IsNullOrWhiteSpace(extension) || !AllowedUploadExtensions.Contains(extension))
            {
                return BadRequest(new { message = "Unsupported file type." });
            }

            var fileName = $"{GenerateRandomString()}{extension.ToLowerInvariant()}";
            string folderPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "upload");

            // Step 2: Ensure the folder exists
            if (!Directory.Exists(folderPath))
            {
                Directory.CreateDirectory(folderPath);
            }
            var filePath = Path.Combine(folderPath, fileName); // Save file in a public folder

            // Save the file to the server
            await using (var stream = new FileStream(filePath, FileMode.Create))
            {
                await file.CopyToAsync(stream);
            }

            // Return the public URL of the uploaded file
            var fileUrl = $"{Request.Scheme}://{Request.Host}/upload/{fileName}";
            return Ok(new { url = fileUrl });
        }
        catch
        {
            return StatusCode(500, new { message = "Error occurred while uploading the file." });
        }
    }

    [HttpGet("parameter")]
    [RequiresAbility(Ability.EditSystemConfig)]
    public async Task<IActionResult> GetConfigParameter()
    {
        try
        {
            return Ok(await this.GetSanitizedAvsParameters());

        }
        catch (Exception ex)
        {
            return new ExceptionResult(ex);
        }
    }

    [HttpGet("avs-parameter")]
    [AllowAnonymous]
    [EnableRateLimiting(RateLimitPolicyNames.PublicConfig)]
    public async Task<IActionResult> GetAvsConfigParameter()
    {
        try
        {
            return Ok(await this.GetSanitizedAvsParameters());
        }
        catch (Exception ex)
        {
            return new ExceptionResult(ex);
        }
    }

    [HttpGet("email/default/{key}")]
    [RequiresAbility(Ability.EditSystemConfig)]
    public IActionResult GetDefaultEmailTemplate(
    string key,
    [FromQuery] string language = "en")
    {
        try
        {
            // Sanitize parameters to allow only alphanumeric and underscores for key, and basic language code format
            if (!System.Text.RegularExpressions.Regex.IsMatch(key, "^[a-zA-Z0-9_]+$") || !System.Text.RegularExpressions.Regex.IsMatch(language, "^[a-z]{2}(-[A-Z]{2})?$"))
            {
                return BadRequest("Invalid template key or language format.");
            }

            var baseDir = Path.Combine(Directory.GetCurrentDirectory(), "emailTemplate", "default");
            var requestedPath = Path.Combine(baseDir, language, $"{key}.html");
            var canonicalPath = Path.GetFullPath(requestedPath);

            // Ensure the canonical path is within the base directory
            if (!canonicalPath.StartsWith(baseDir, StringComparison.OrdinalIgnoreCase))
            {
                return BadRequest("Invalid template path.");
            }

            if (!System.IO.File.Exists(canonicalPath))
            {
                return NotFound($"Default email template not found: {key}");
            }

            var html = System.IO.File.ReadAllText(canonicalPath);

            return Ok(new
            {
                key,
                language,
                html
            });
        }
        catch (Exception ex)
        {
            return new ExceptionResult(ex);
        }
    }


    public static string GetPublicUrl(HttpRequest request) => $"{request.Scheme}://{request.Host}{request.PathBase}";

    private ThemeConfig GetDefaultThemeConfig()
    {
        string brandIconBase64 = ""; //"data:image/x-icon;base64,AAABAAEAGBcAAAEAIAAkCQAAFgAAACgAAAAYAAAALgAAAAEAIAAAAAAA/AgAACUWAAAlFgAAAAAAAAAAAAD///////////////////////7+////////////+K+w//Vwcf/vODn/7RUW//YPEf/2DxH/7RUW//A5Ov/2cHL/+bCx//////////////7+/////////////////////////////////////////v7///////rKy//yUFH/7g8R//0PEf/yDxH/7A8R/+0SFP/tEhT/7A8R//IPEf/+DxH/7g8R//FQUf/7y8z////////+/v/////////////////////////////9/f//////96qr/+8gIf/3ERP/7BET/+wUFv/sERP/7BET/+wSFP/sEhT/7BET/+wRE//sFBb/7BET//cRE//vHh//9qan/////////f3///////////////////7+///////4qqv/8hIU/+8HCf/rBgj/6wkL/+wPEf/tEBL/7AoM/+sDBf/rAwX/7AsN/+0RE//sDhD/6wgK/+sGCP/uBwn/8xMV//msrf////////7+///////+/v7///////vMzP/tHR7/7gcJ//FRU//0f4D/8UxN/+wOEP/rBgj/70NF//N7fP/zd3j/7zs8/+sGB//sEhT/8VNV//R+fv/xUlP/7wcJ/+8fIP/7zs7////////////+/f3///r6/+9OT//3EhT/6gQE//ihof//////96ao/+oLDP/rCw7/96qq////////////9paX/+oBAf/sGRn/+bq6///////4oaD/6gQF//cSFP/vTU7//vr6///+/v//////+bGy//MUFv/uFRf/6wIE//WQkP/+/v7/+LCw/+sKC//tJCX/+9XV///////+/v7/+sDA/+wVF//sGBr/+sPD//7+/v/1j4//6wIF/+8VF//0FRf/+bO0////////////9G1u//4PEv/tFhj/6wIE//WCg//+/v7/+bu8/+sJC//uOzz//vv7//75+f///f3//e3t/+0sLv/rFxn/+s7O//7+/v/1goP/6wIF/+0WGP/+EBH/821u///////95+f/8Dg6//MPEv/sFBb/6wMF//N1dv//////+cXG/+sRE//yYWP///////rR0v/71NT///////BJSv/sGhz/+9na///////zdHX/6wMF/+wUFv/zEBL/8Do8//7p6f/70ND/7hQW/+wPEf/sEhT/6wUH//JmaP//////+s/P/+weIP/1lZb//v7+//ednv/2n6H//v7+//N7fP/tJij//OLi//7+/v/yZmj/6wUH/+wSFP/sDxH/7RUW//zR0f/6x8f/9g8R/+0RE//sEBL/6wUH//FZW///////+9bX/+0pK//6y8v///7///JkZv/yaGr//v7+//iwsf/uMjT//evr///////xV1n/6wUH/+wQEv/tERP/9g8R//vIyP/6x8f/9g8R/+0RE//sERP/6wcJ//BMTf/+/v7/+93e/+9FR//97+///v7+/+42OP/uOTv///////zh4f/vQ0X//fT0//7+/v/wSkz/6wcJ/+wRE//tERP/9g8R//vIyP/80ND/7hQW/+wPEf/sEhP/7AkL/+8+P///////++Tk//SAgv/+/Pz/++Pj/+0iJP/tJSf//Onp//339//0dXf//fr7//37+//vPT//7AkL/+wRE//sDxH/7RUW//vQ0P/95+f/7zc5//MPEv/sEhP/6gkL/+4xMv/+/v7//Ofn//i4uf//////+ba3/+wQEv/sExX/+bu7//7+/v/4rK3//v7+//35+f/uLzH/6gkL/+wRE//zDxL/8Dg6//7o6P//////9Gxt//0PEv/tFBf/7AsN/+4lJv/++/v//fHx//zq6v//////9Y2O/+oCBP/qAgT/9ZCR/////v/84eH///7+//739//tIiP/7AwO/+wVF//+DxH/9G1u////////////+bCx//QUFv/uEhT/7A0P/+wYGv/99PT///////7+/v/+/Pz/8WNk/+oCBP/qAQP/82do//79/v/+/////v7+//3y8v/rFxj/7A4Q/+4SFP/zFBb/+bGy/////////v7//vn5/+5MTf/3DxH/6xAS/+0VF//97Oz////////////97Oz/7zo7/+sJC//rCAr/7z0///3u7/////////////3o6P/tFRf/6w8R//cPEf/vTE3///r6///+/v////////////vLy//uGx3/7w8R/+0TFf/yZmf/9HZ3//R4ef/yZGX/7BUX/+sOEP/rDhD/6xUY//JlZv/0eHn/9HZ3//JlZv/sExX/7g4Q/+0cHv/8zc3///////////////////7+///////4qar/8hET/+4OEP/rCAv/6wUH/+sDBf/sBgj/7A8R/+wPEf/sDxH/7A8R/+wGCP/rAwX/6wUH/+sJC//vDhD/8hIU//iqq/////////7+///////////////////9/f//////96ur/+8fIP/3ERP/7BIU/+wWGP/tExX/7BAS/+wPEf/sDxH/7BAS/+0TFf/sFhj/7BIU//cRE//vHR7/96en/////////f3//////////////////////////////v7///////rIyf/wTU7/7g4Q//0PEf/yDxH/7A8R/+0SFP/tEhT/7A8R//IPEf/9DxH/7Q4Q//FPUP/6ycr////////+/v////////////////////////////////////////7+////////////+a6v//VvcP/vNzj/7BMU//YPEf/2DxH/7BMU//A4Of/2cHH/+K+w//////////////7+///////////////////////////////////////////////////+/v///v7////////////85eX/+9HR//vHx//7x8f/+9HR//3m5v/////////////+/v///v7///////////////////////////8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=="; ; //GetBase64FromFile(DefaultBrandIconPath, "image/x-icon");
        string brandLogoBase64 = ""; //"data:image/png;base64,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"; //GetBase64FromFile(DefaultBrandLogoPath, "image/png");

        return new ThemeConfig
        {
            ApplicationName = "ChronarPay",
            BackgroundColor = "#f9f9f9",
            Banners = new List<Banner>
        {
            new Banner
            {
                Language = "en",
                Content = "<div style=\"display: flex; width: 100%; height: 100%; align-items: center; background-color: #1B75BB;\">\n <div style=\"color: white; padding: 20px;\">\n <h1>Let's empower your <br> customers today.</h1>\n <typography variant=\"body2\" gutterbottom=\"\">\n With ePAY, you can view and pay your invoices conveniently <br> from anywhere.\n </typography>\n </div>\n</div>"
            }
        },
            BrandIcon = brandIconBase64,
            BrandLogo = brandLogoBase64,
            BrandTitle = "CNBS ePAY",
            ButtonColor = "#1b75bb",
            ButtonHoverColor = "#a3d1ef",
            ButtonHoverTextColor = "#ffffff",
            ButtonTextColor = "#ffffff",
            ContrastColor = "#4a4a4a",
            HeaderBackgroundColor = "#ffffff",
            HighlightColor = "#f7d687",
            HoverColor = "#f0ae13",
            Name = "theme_default",
            PrimaryColor = "#ffffff",
            Urls = new List<string>()
        };
    }

    private byte[] ConvertBase64StringToIFormFile(string base64String)
    {
        //Remove the prefix if it exists
        if (base64String.Contains(","))
        {
            base64String = base64String.Split(',')[1];
        }

        base64String = base64String.Trim(); // Remove whitespace

        byte[] bytes = Convert.FromBase64String(base64String);

        return bytes;
    }

    /// <summary>
    /// Evaluates feature flags server-side and returns them as a JsonObject of
    /// { flagName: bool }. Anonymous callers receive only <see cref="FeatureFlags.Public"/>;
    /// authenticated callers additionally receive <see cref="FeatureFlags.AuthenticatedOnly"/>.
    /// </summary>
    private async Task<JsonObject> BuildFeatureFlagsAsync(bool isAuthenticated)
    {
        var flags = new JsonObject();

        foreach (var name in FeatureFlags.Public)
        {
            flags[name] = await this.featureManager.IsEnabledAsync(name);
        }

        if (isAuthenticated)
        {
            foreach (var name in FeatureFlags.AuthenticatedOnly)
            {
                flags[name] = await this.featureManager.IsEnabledAsync(name);
            }
        }

        return flags;
    }

    /// <summary>
    /// Removes every key from <paramref name="obj"/> that is NOT in
    /// <paramref name="allowed"/> (case-insensitive). The inverse of
    /// <see cref="RemoveKeysIgnoreCase"/>; applies a strict whitelist to the
    /// anonymous /config/application payload.
    /// </summary>
    private static void KeepOnlyKeysIgnoreCase(JsonObject obj, params string[] allowed)
    {
        var allowedSet = new HashSet<string>(allowed, StringComparer.OrdinalIgnoreCase);
        var toRemove = obj
            .Select(kvp => kvp.Key)
            .Where(key => !allowedSet.Contains(key))
            .ToList();

        foreach (var key in toRemove)
        {
            obj.Remove(key);
        }
    }

    /// <summary>
    /// Removes <paramref name="keysToRemove"/> (case-insensitive) from every object
    /// element of the JSON array at <paramref name="arrayKey"/>. Operates on the
    /// serialized response so the (singleton-cached) source object is never mutated.
    /// </summary>
    private static void RedactArrayElementKeys(JsonObject obj, string arrayKey, params string[] keysToRemove)
    {
        var arrayNode = obj.FirstOrDefault(kvp =>
            string.Equals(kvp.Key, arrayKey, StringComparison.OrdinalIgnoreCase)).Value;

        if (arrayNode is not JsonArray array)
        {
            return;
        }

        foreach (var element in array)
        {
            if (element is JsonObject elementObj)
            {
                RemoveKeysIgnoreCase(elementObj, keysToRemove);
            }
        }
    }

    /// <summary>
    /// Removes the given keys from a JsonObject, matching key names
    /// case-insensitively. Used to strip sensitive fields from the public
    /// /config/application payload before it is returned to anonymous callers.
    /// </summary>
    private static void RemoveKeysIgnoreCase(JsonObject obj, params string[] keys)
    {
        foreach (var key in keys)
        {
            var match = obj.FirstOrDefault(kvp =>
                string.Equals(kvp.Key, key, StringComparison.OrdinalIgnoreCase)).Key;

            if (match != null)
            {
                obj.Remove(match);
            }
        }
    }

    private string SanitizeInput(string? input)
    {
        if (string.IsNullOrWhiteSpace(input) || input.Trim().ToLower() == "null")
        {
            return "";
        }
        return input.Trim();
    }

    private string SanitizeFilePath(string filePath)
    {
        // Remove null bytes
        filePath = filePath.Replace("\0", string.Empty);

        // Remove leading/trailing whitespace
        filePath = filePath.Trim();

        // Prevent absolute paths
        if (Path.IsPathRooted(filePath))
        {
            throw new ArgumentException("Absolute paths are not allowed");
        }

        return filePath;
    }

    private static string GenerateRandomString(int length = 16)
    {
        const string chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        var randomBytes = new byte[length];
        using (var rng = System.Security.Cryptography.RandomNumberGenerator.Create())
        {
            rng.GetBytes(randomBytes);
        }

        var result = new char[length];
        for (int i = 0; i < randomBytes.Length; i++)
        {
            result[i] = chars[randomBytes[i] % chars.Length];
        }

        return new string(result);
    }

    private async Task<List<ParameterInfo>?> GetSanitizedAvsParameters()
    {
        SapCustomData? data = await manager.GetCustomConfig("en", true);
        var avsEnvValue = config["AvsKey"];

        return data?.Parameters
           ?.Where(p => p.Name != null && p.Name == avsEnvValue)
           .Select(p => new ParameterInfo
           {
               Name = p.Name,
               Value = SanitizeParameterValue(p.Value)
           })
           .ToList();
    }

    private static string? SanitizeParameterValue(string? value)
    {
        if (string.IsNullOrEmpty(value))
        {
            return value;
        }

        try
        {
            var dict = System.Text.Json.JsonSerializer
                .Deserialize<Dictionary<string, object>>(value);

            if (dict == null)
            {
                return value;
            }

            dict.Remove("password");
            dict.Remove("username");
            return System.Text.Json.JsonSerializer.Serialize(dict);
        }
        catch
        {
            return value;
        }
    }

    private static readonly HashSet<string> ReservedThemeAssetFolders =
        new(StringComparer.OrdinalIgnoreCase) { "default", "upload", "public" };

    private static string? GetThemeAssetFolderName(string? themeName)
    {
        int underscoreIndex = themeName?.IndexOf("_") ?? -1;
        return themeName == null || underscoreIndex < 0
            ? null
            : themeName.Substring(underscoreIndex + 1);
    }

    private static string? GetReservedUserThemeName(ThemeConfig[]? themes)
    {
        if (themes == null)
        {
            return null;
        }

        foreach (ThemeConfig? theme in themes)
        {
            string? folderName = GetThemeAssetFolderName(theme?.Name);
            if (string.IsNullOrWhiteSpace(folderName))
            {
                continue;
            }

            // theme_default is the built-in editable template. The other
            // reserved folders belong to app assets, not user-created themes.
            if (!folderName.Equals("default", StringComparison.OrdinalIgnoreCase) &&
                ReservedThemeAssetFolders.Contains(folderName))
            {
                return folderName;
            }
        }

        return null;
    }

    private static void CleanupOrphanThemeAssetFolders(ThemeConfig[] themes)
    {
        // "public" holds the app's own fallback branding (DefaultBrandLogoPath)
        // — exactly a logo.png + favicon.ico pair, so it must be reserved by
        // name or the content test below would claim it.
        var expected = new HashSet<string>(ReservedThemeAssetFolders, StringComparer.OrdinalIgnoreCase);
        foreach (ThemeConfig theme in themes)
        {
            if (theme == null || string.IsNullOrWhiteSpace(theme.Name))
            {
                continue;
            }
            int underscoreIndex = theme.Name.IndexOf("_");
            expected.Add(underscoreIndex >= 0 ? theme.Name.Substring(underscoreIndex + 1) : "default");
        }

        string wwwroot = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
        if (!Directory.Exists(wwwroot))
        {
            return;
        }

        foreach (string folderPath in Directory.GetDirectories(wwwroot))
        {
            string folderName = Path.GetFileName(folderPath);
            if (expected.Contains(folderName))
            {
                continue;
            }

            // Only a folder whose entire content is what the save path writes
            // (or nothing) is a theme-asset folder — anything else (SPA build
            // output, uploads, unknown content) is never touched.
            string[] entries = Directory.GetFileSystemEntries(folderPath);
            // All() is vacuously true for an empty folder — an empty directory
            // is not evidence the save path created it, so leave it alone.
            bool onlyThemeAssets = entries.Length > 0 && entries.All(entry =>
                Stream.File.Exists(entry) &&
                (Path.GetFileName(entry).Equals("logo.png", StringComparison.OrdinalIgnoreCase) ||
                 Path.GetFileName(entry).Equals("favicon.ico", StringComparison.OrdinalIgnoreCase)));
            if (!onlyThemeAssets)
            {
                continue;
            }

            try
            {
                Directory.Delete(folderPath, recursive: true);
            }
            catch (Exception ioEx)
            {
                Console.Error.WriteLine($"Failed to delete orphaned theme folder '{folderName}': {ioEx.Message}");
            }
        }
    }

    private static void DeleteThemeAssetFolder(string? themeName)
    {
        string? template = GetThemeAssetFolderName(themeName);
        if (string.IsNullOrWhiteSpace(template))
        {
            return;
        }

        // Never touch shared app asset folders.
        if (ReservedThemeAssetFolders.Contains(template))
        {
            return;
        }

        // Theme names are stored data — never let one escape wwwroot.
        string wwwroot = Path.GetFullPath(Path.Combine(Directory.GetCurrentDirectory(), "wwwroot"));
        string folderPath = Path.GetFullPath(Path.Combine(wwwroot, template));
        if (!folderPath.StartsWith(wwwroot + Path.DirectorySeparatorChar, StringComparison.OrdinalIgnoreCase) ||
            !Directory.Exists(folderPath))
        {
            return;
        }

        // Only remove what the save path wrote; keep the folder if anything
        // else lives in it.
        foreach (string fileName in new[] { "logo.png", "favicon.ico" })
        {
            string filePath = Path.Combine(folderPath, fileName);
            if (Stream.File.Exists(filePath))
            {
                Stream.File.Delete(filePath);
            }
        }
        if (!Directory.EnumerateFileSystemEntries(folderPath).Any())
        {
            Directory.Delete(folderPath);
        }
    }

    private async Task SaveBase64ImageToFile(byte[] imageBytes, string fileName, string domainName)
    {
        // Theme names are stored data — never let one escape wwwroot (same
        // containment rule as DeleteThemeAssetFolder).
        string wwwroot = Path.GetFullPath(Path.Combine(Directory.GetCurrentDirectory(), "wwwroot"));
        string folderPath = Path.GetFullPath(Path.Combine(wwwroot, domainName));
        if (!folderPath.StartsWith(wwwroot + Path.DirectorySeparatorChar, StringComparison.OrdinalIgnoreCase))
        {
            Console.Error.WriteLine($"Refusing to write theme asset outside wwwroot for name '{domainName}'");
            return;
        }

        // Step 2: Ensure the folder exists
        if (!Directory.Exists(folderPath))
        {
            Directory.CreateDirectory(folderPath);
        }

        // Step 3: Specify the file path
        string filePath = Path.Combine(folderPath, fileName);
        // Delete the file if it exists
        if (Stream.File.Exists(filePath))
        {
            Stream.File.Delete(filePath);
        }
        await Stream.File.WriteAllBytesAsync(filePath, imageBytes);
    }
}
