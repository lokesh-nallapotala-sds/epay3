using System.Reflection;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading.RateLimiting;
using System.Security.Cryptography;
using Epay3Net.Authorization.Abilities;
using AutoMapper;
using Epay3Net.BackgroundServices;
using Epay3Net.Controllers;
using Epay3Net.Custom.Extensions;
using Epay3Net.HealthChecks;
using Epay3Net.Maintenance;
using Epay3Net.Middleware;
using Epay3Net.RateLimiting;
using Epay3Service.Clients;
using Epay3Service.Clients.Interfaces;
using Epay3Service.Configuration;
using Epay3Service.Helpers;
using Epay3Service.Managers;
using Epay3Service.Managers.Interfaces;
using Epay3Service.Models;
using Epay3Service.Services;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Microsoft.FeatureManagement;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;

WebApplicationBuilder builder = WebApplication.CreateBuilder(args);
builder.WebHost.ConfigureKestrel(options => options.AddServerHeader = false);

builder.Configuration.AddJsonFile("appsettings.json", optional: false, reloadOnChange: true)
    .AddEnvironmentVariables();

builder.Logging.AddConsole();

builder.Services.AddHealthChecks()
    .AddCheck("API", () => HealthCheckResult.Healthy("ePay Front End API"))
    .AddCheck<SapHealthCheck>("SAP");

IServiceCollection services = builder.Services;
ConfigurationManager configuration = builder.Configuration;

services.AddOptions<SapConfiguration>()
    .Bind(configuration.GetSection("SapConfiguration"))
    .PostConfigure(options =>
    {
        options.User = Environment.GetEnvironmentVariable("SAP_USER") ?? options.User;
        options.Password = Environment.GetEnvironmentVariable("SAP_PASSWORD") ?? options.Password;
        options.ApiId = Environment.GetEnvironmentVariable("SAP_API_ID") ?? options.ApiId;
        options.ClientId = Environment.GetEnvironmentVariable("SAP_CLIENT_ID") ?? options.ClientId;
        options.DefaultLanguage = Environment.GetEnvironmentVariable("SAP_DEFAULT_LANGUAGE") ?? options.DefaultLanguage;
        options.Url = Environment.GetEnvironmentVariable("SAP_URL") ?? options.Url;

        var sapSysId = Environment.GetEnvironmentVariable("SAP_HEADERS_CNBSSYSID");
        if (!string.IsNullOrWhiteSpace(sapSysId))
        {
            options.Headers = new SapHeaders { CnbsSysId = sapSysId };
        }
    })
    .ValidateDataAnnotations()
    .ValidateOnStart();
// SAP_* env vars override appsettings — set in Bitbucket Pipeline variables / Azure App Settings / EC2 env
services.AddOptions<SapKeys>()
    .Bind(configuration.GetSection("SapKeys"))
    .ValidateDataAnnotations()
    .Validate(
        options => options.SapUrls?.Count > 0 && options.SapUrls.All(url => !string.IsNullOrWhiteSpace(url.Key) && !string.IsNullOrWhiteSpace(url.Path)),
        "SapKeys:SapUrls must contain at least one entry with non-empty Key and Path.")
    .ValidateOnStart();

services.AddOptions<WorldPayAddressValidationServiceSetting>()
    .Bind(configuration.GetSection("AvsKey"))
    .ValidateOnStart();

services.AddOptions<SalesforceConfiguration>()
    .Bind(configuration.GetSection("SalesforceConfiguration"))
    .PostConfigure(options =>
    {
        options.InstanceUrl = Environment.GetEnvironmentVariable("SALESFORCE_INSTANCE_URL") ?? options.InstanceUrl;
        options.TokenUrl = Environment.GetEnvironmentVariable("SALESFORCE_TOKEN_URL") ?? options.TokenUrl;
        options.ClientId = Environment.GetEnvironmentVariable("SALESFORCE_CLIENT_ID") ?? options.ClientId;
        options.ClientSecret = Environment.GetEnvironmentVariable("SALESFORCE_CLIENT_SECRET") ?? options.ClientSecret;
        options.ApiVersion = Environment.GetEnvironmentVariable("SALESFORCE_API_VERSION") ?? options.ApiVersion;
        options.Username = Environment.GetEnvironmentVariable("SALESFORCE_USERNAME") ?? options.Username;
        options.Password = Environment.GetEnvironmentVariable("SALESFORCE_PASSWORD") ?? options.Password;
        options.SecurityToken = Environment.GetEnvironmentVariable("SALESFORCE_SECURITY_TOKEN") ?? options.SecurityToken;
    });

services.AddOptions<SalesforceKeys>()
    .Bind(configuration.GetSection("SalesforceKeys"))
    .ValidateDataAnnotations()
    .Validate(
        options => options.SalesforceUrls?.Count > 0 && options.SalesforceUrls.All(url => !string.IsNullOrWhiteSpace(url.Key) && !string.IsNullOrWhiteSpace(url.Path)),
        "SalesforceKeys:SalesforceUrls must contain at least one entry with non-empty Key and Path.")
    .ValidateOnStart();

builder.Configuration.AddEnvironmentVariables();
builder.Services.AddControllers()
  .AddJsonOptions(o =>
  {
      o.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
  });
services.AddOptions<ApplicationSecrets>()
    .Bind(configuration.GetSection("AppSecrets"))
    .ValidateDataAnnotations()
    .ValidateOnStart();

services.AddAutoMapper(cfg => { }, typeof(Epay3Service.MappingProfile));
services.AddMemoryCache();
services.Configure<CspSettings>(builder.Configuration.GetSection("CspSettings"));
services.AddAuthentication().AddJwtBearer(options =>
{
    options.RequireHttpsMetadata = true;
    options.Events = new JwtBearerEvents
    {
        OnMessageReceived = context =>
        {
            if (context.Request.Cookies.TryGetValue(AuthController.AuthCookieName, out string? token))
            {
                context.Token = token;
            }

            return Task.CompletedTask;
        }
    };
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        // IssuerSigningKey removed — IssuerSigningKeyResolver wired via PostConfigure below (F-01)
        ValidateIssuer = true,
        ValidIssuer = "epay3-api",
        ValidateAudience = true,
        ValidAudience = "epay3-frontend",
        ValidateLifetime = true
    };
});

services.AddAuthorization();
services.AddSingleton<IAuthorizationPolicyProvider, AbilityAuthorizationPolicyProvider>();

// Feature flags evaluated server-side from the "FeatureManagement" config section
// (appsettings.json, reloadOnChange). No external service, no client SDK, no telemetry.
// Flags are surfaced to the SPA as booleans via ConfigController; sensitive gating
// must stay server-side, never trust a client flag.
services.AddFeatureManagement();
services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.OnRejected = async (context, cancellationToken) =>
    {
        context.HttpContext.Response.ContentType = "application/json";
        await context.HttpContext.Response.WriteAsync(
            JsonSerializer.Serialize(new { error = "System is busy, please wait 60 seconds and try again." }),
            cancellationToken);
    };

    options.AddPolicy(RateLimitPolicyNames.AuthSensitive, context =>
        RateLimitPartition.GetFixedWindowLimiter(GetIpPartitionKey(context), _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = 3,
            Window = TimeSpan.FromMinutes(1),
            QueueLimit = 0,
            AutoReplenishment = true
        }));

    options.AddPolicy(RateLimitPolicyNames.GuestPayment, context =>
        RateLimitPartition.GetFixedWindowLimiter(GetIpPartitionKey(context), _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = 10,
            Window = TimeSpan.FromMinutes(1),
            QueueLimit = 0,
            AutoReplenishment = true
        }));

    options.AddPolicy(RateLimitPolicyNames.PublicConfig, context =>
        RateLimitPartition.GetFixedWindowLimiter(GetIpPartitionKey(context), _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = 60,
            Window = TimeSpan.FromMinutes(1),
            QueueLimit = 0,
            AutoReplenishment = true
        }));

    options.AddPolicy(RateLimitPolicyNames.SensitiveMutation, context =>
        RateLimitPartition.GetFixedWindowLimiter(GetUserOrIpPartitionKey(context), _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = 5,
            Window = TimeSpan.FromMinutes(1),
            QueueLimit = 0,
            AutoReplenishment = true
        }));

    options.AddPolicy(RateLimitPolicyNames.AuthenticatedApi, context =>
        RateLimitPartition.GetFixedWindowLimiter(GetUserOrIpPartitionKey(context), _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = 300,
            Window = TimeSpan.FromMinutes(1),
            QueueLimit = 0,
            AutoReplenishment = true
        }));

    options.AddPolicy(RateLimitPolicyNames.CspReport, context =>
        RateLimitPartition.GetFixedWindowLimiter(GetIpPartitionKey(context), _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = 30,
            Window = TimeSpan.FromMinutes(1),
            QueueLimit = 0,
            AutoReplenishment = true
        }));
});

Assembly startupAssembly = Assembly.GetAssembly(typeof(AuthController))!;

services.AddSingleton(sp => sp.GetRequiredService<IOptions<SapConfiguration>>().Value)
    .AddSingleton(sp => sp.GetRequiredService<IOptions<SapKeys>>().Value)
    .AddSingleton(sp => sp.GetRequiredService<IOptions<SalesforceConfiguration>>().Value)
    .AddSingleton(sp => sp.GetRequiredService<IOptions<SalesforceKeys>>().Value)
    .AddSingleton(sp => sp.GetRequiredService<IOptions<WorldPayAddressValidationServiceSetting>>().Value)
    .AddSingleton(sp => sp.GetRequiredService<IOptions<ApplicationSecrets>>().Value)
    .AddSingleton(new FrontendConfig(Directory.GetCurrentDirectory()))
    .AddSingleton<SapHttpClient>()
    .AddSingleton<SalesforceHttpClient>()
    .AddSingleton<ISalesforceHttpClient>(sp => sp.GetRequiredService<SalesforceHttpClient>())
    .AddSingleton<ISapHttpClient>(sp =>
    {
        var provider = configuration["BackendProvider"] ?? Environment.GetEnvironmentVariable("BACKEND_PROVIDER") ?? "SAP";
        return provider.Equals("Salesforce", StringComparison.OrdinalIgnoreCase)
            ? sp.GetRequiredService<SalesforceHttpClient>()
            : sp.GetRequiredService<SapHttpClient>();
    })
    .AddSingleton<ILanguageManager, LanguageManager>()
    .AddSingleton<IApplicationConfigurationManager, ApplicationConfigurationManager>()
    .AddScoped<IAuthManager, AuthManager>()
    .AddScoped<IUserManager, UserManager>()
    .AddScoped<IAccountManager, AccountManager>()
    .AddScoped<IInvoicesManager, InvoicesManager>()
    .AddScoped<IHashTokenManager, HashTokenManager>()
    .AddScoped<ITokenService, TokenService>()

    .AddScoped<IPaymentManager, PaymentManager>()
    .AddScoped<IStripeManager, StripeManager>()
    .AddScoped<IMailer, SmtpMailer>()
    .AddScoped<ILocalization, LocalizationService>()
    .AddScoped<IWorldPayAddressValidationServiceClient, WorldPayAddressValidationServiceClient>()
    .AddAuthorizationHandlers(startupAssembly);


services.AddSingleton<IJwtKeyManager, JwtKeyManager>();
services.AddHostedService<JwtKeyRotationService>();

services.AddSingleton<IMaintenanceCacheService, MaintenanceCacheService>();

services.AddScoped<ISystemConfigService, SystemConfigService>();
services.AddScoped<AppValuesRepository>();


// Add services to the container.
services.AddSession(options =>
{
    options.IdleTimeout = TimeSpan.FromMinutes(30); // Set the session timeout
    options.Cookie.HttpOnly = true;
    options.Cookie.SecurePolicy = CookieSecurePolicy.Always;
    options.Cookie.IsEssential = true; // Make the session cookie essential
});

services.AddDataProtection();
services.AddControllersWithViews();

// Configure Anti-forgery
services.AddAntiforgery(options =>
{
    // The header name to expect on all subsequent requests
    options.HeaderName = "X-CSRF-TOKEN";
});
services.Configure<MvcOptions>(options =>
{
    options.Filters.Add(new AutoValidateAntiforgeryTokenAttribute());
});

// Register the Swagger generator, defining one or more Swagger documents
services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "EPay3.0", Version = "v1" });
    c.CustomSchemaIds(type => type.FullName?.Replace("+", ".") ?? type.Name);
});

// Wire IssuerSigningKeyResolver after IJwtKeyManager is registered (F-01)
services.AddOptions<JwtBearerOptions>(JwtBearerDefaults.AuthenticationScheme)
    .PostConfigure<IJwtKeyManager>((options, jwtKeyManager) =>
    {
        options.TokenValidationParameters.IssuerSigningKey = null;
        options.TokenValidationParameters.ValidAlgorithms = ["HS256"];
        options.TokenValidationParameters.IssuerSigningKeyResolver =
            (token, secToken, kid, parameters) =>
                jwtKeyManager.GetValidationKeysAsync(kid).GetAwaiter().GetResult();
    });

builder.Services.AddScoped<ConfigController>();

services.AddHsts(options =>
{
    options.MaxAge = TimeSpan.FromDays(730);
    options.IncludeSubDomains = true;
    options.Preload = true;
});

// Configure CORS
services.AddCors(options =>
{
    options.AddPolicy("DevelopmentAndSubdomainPolicy", builder =>
    {
        builder
            .SetIsOriginAllowed(origin =>
            {
                if (Uri.TryCreate(origin, UriKind.Absolute, out Uri? uri))
                {
                    // Allow all subdomains of "cnbssoftware.com"
                    if (uri.Host.EndsWith(".cnbssoftware.com") || uri.Host == "cnbssoftware.com")
                    {
                        return true;
                    }

                    // Allow worldpay and paymetric subdomains for XIFrame
                    if (uri.Host.EndsWith(".worldpay.com") || uri.Host.EndsWith(".paymetric.com"))
                    {
                        return true;
                    }

                    // Allow localhost with any port for local development
                    if (uri.Host == "localhost" || uri.Host == "127.0.0.1")
                    {
                        return true;
                    }

                }
                return false;
            })
            .WithMethods("GET", "POST", "PUT", "DELETE")
            .WithHeaders("Content-Type", "Authorization", "X-CSRF-TOKEN", "X-Country", "Accept-Language")
            .AllowCredentials();
    });
});

WebApplication app = builder.Build();

app.Use(async (context, next) =>
{
    var origin = context.Request.Headers["Origin"].ToString();
    var isTrustedOrigin = origin.EndsWith(".worldpay.com") ||
                         origin.EndsWith(".paymetric.com") ||
                         origin.Contains("localhost") ||
                         origin.EndsWith(".chronarpay.com");

    if (isTrustedOrigin)
    {
        context.Response.Headers["Access-Control-Allow-Private-Network"] = "true";

        if (context.Request.Method == "OPTIONS")
        {
            context.Response.Headers["Access-Control-Allow-Origin"] = origin;
            context.Response.Headers["Access-Control-Allow-Credentials"] = "true";
            context.Response.Headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS";
            context.Response.Headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-CSRF-TOKEN, X-Country, Accept-Language, Access-Control-Request-Private-Network";
            context.Response.StatusCode = 204;
            return;
        }
    }

    await next();
});

app.UseCors("DevelopmentAndSubdomainPolicy");

// --- Restricted-access gate (?key=) for break-glass / ops endpoints ---
// /health and /admin/recovery require a matching ?key=<AdminAccess:Key>. The key is a
// SERVER-SIDE shared secret (configured in AdminAccess:Key, overridable via the
// AdminAccess__Key environment variable) and is NEVER shipped to the SPA bundle.
// On any mismatch we return 404 (not 403) so these endpoints' existence isn't revealed.
// Fail-closed: if the key is not configured, the protected paths 404 for everyone.
//
// CAVEAT: a query-string secret is recorded in server/proxy/access logs and browser
// history, and can leak via the Referer header. This is acceptable for rarely-used
// break-glass paths, but rotate the key if it may have been exposed. Note also that
// gating /admin/recovery only blocks the PAGE document; the recovery API endpoints
// (POST /api/account/admin/recovery and /admin/recovery/start, currently
// [AllowAnonymous]) are the real boundary and are NOT covered here.
{
    var adminAccessKey = app.Configuration["AdminAccess:Key"];
    string[] keyProtectedPaths = ["/health", "/admin/recovery"];

    app.Use(async (context, next) =>
    {
        bool isProtected = keyProtectedPaths.Any(p =>
            context.Request.Path.StartsWithSegments(p, StringComparison.OrdinalIgnoreCase));

        if (isProtected)
        {
            var providedKey = context.Request.Query["key"].ToString();
            bool keyMatches =
                !string.IsNullOrEmpty(adminAccessKey) &&
                !string.IsNullOrEmpty(providedKey) &&
                CryptographicOperations.FixedTimeEquals(
                    Encoding.UTF8.GetBytes(providedKey),
                    Encoding.UTF8.GetBytes(adminAccessKey));

            if (!keyMatches)
            {
                context.Response.StatusCode = StatusCodes.Status404NotFound;
                context.Response.ContentType = "text/html; charset=utf-8";
                await context.Response.WriteAsync(
                    "<!DOCTYPE html><html lang=\"en\"><head><meta charset=\"utf-8\">" +
                    "<title>404 Not Found</title></head>" +
                    "<body style=\"font-family:sans-serif;text-align:center;padding:4rem\">" +
                    "<h1>404</h1><p>Not Found</p></body></html>");
                return;
            }
        }

        await next();
    });
}

if (app.Environment.IsProduction())
{
    app.UseHsts();
}

// Configure the HTTP request pipeline.

if (app.Environment.IsDevelopment())
{
    app.UseDeveloperExceptionPage();
    app.UseSwagger();
    app.UseSwaggerUI(c => c.SwaggerEndpoint("/swagger/v1/swagger.json", "EPay3.0 V1"));
}

app.UseHttpsRedirection();

app.UseMiddleware<MaintenanceMiddleware>();
app.UseMiddleware<CspMiddleware>();

// Add the middleware for loading the folders and images
app.UseMiddleware<LoadImagesMiddleware>();

app.UseStaticFiles();
app.UseRouting();
app.UseSession();
app.UseAuthentication();
app.UseMiddleware<AuthenticatedMaintenanceMiddleware>();

// Sliding JWT refresh middleware.
// Runs on every authenticated request, after UseAuthentication() has validated the cookie.
// If the token is within 15 minutes of expiry, a fresh 1-hour token is issued and the
// __Host-sid cookie is replaced in the response — transparent to the frontend.
// This prevents active users from hitting a 401 at the hard 1-hour JWT boundary.
// The refreshed token carries the same claims as the original (same user, same role,
// same accounts/abilities) — no privilege change occurs during refresh.
app.Use(async (context, next) =>
{
    if (context.User.Identity?.IsAuthenticated == true)
    {
        var expValue = context.User.FindFirst("exp")?.Value;
        if (long.TryParse(expValue, out var expUnix))
        {
            var expiresAt = DateTimeOffset.FromUnixTimeSeconds(expUnix);
            if (expiresAt - DateTimeOffset.UtcNow < TimeSpan.FromMinutes(15))
            {
                var keyMgr = context.RequestServices.GetRequiredService<IJwtKeyManager>();
                var (keyBytes, kid) = await keyMgr.GetActiveKeyAsync();

                // GetAuthToken always appends IsImpersonating from its parameter, so strip
                // the existing claim first to avoid duplicating it in the refreshed token.
                var isImpersonating = bool.TryParse(
                    context.User.FindFirst("IsImpersonating")?.Value, out var imp) && imp;
                var refreshUser = new User
                {
                    Claims = [.. context.User.Claims.Where(c => c.Type != "IsImpersonating")]
                };

                var newToken = JwtTokenHelper.GetAuthToken(refreshUser, keyBytes, kid, isImpersonating);
                context.Response.Cookies.Append(
                    AuthController.AuthCookieName,
                    newToken,
                    AuthController.CreateAuthCookieOptions(DateTimeOffset.UtcNow.AddHours(1)));
            }
        }
    }
    await next();
});

app.UseRateLimiter();
app.UseAuthorization();

app.MapControllerRoute(
    name: "default",
    pattern: "api/{controller}/{action=Index}/{id?}");

app.MapHealthChecks("/health", new HealthCheckOptions
{
    ResponseWriter = async (context, report) =>
    {
        context.Response.ContentType = "application/json";
        var result = JsonSerializer.Serialize(new
        {
            status = report.Status.ToString(),
            checks = report.Entries.Select(entry => new
            {
                name = entry.Key,
                status = entry.Value.Status.ToString(),
                error = entry.Value.Exception == null ? null : "Health check failed",
                duration = entry.Value.Duration.TotalMilliseconds + "ms"
            })
        });
        await context.Response.WriteAsync(result);
    }
});

app.MapFallbackToFile("index.html");

var supportedCultures = new[] { "en", "fr", "es", "it", "de", "pt", "ru", "ja" };
app.UseRequestLocalization(new RequestLocalizationOptions()
    .SetDefaultCulture(supportedCultures[0])
    .AddSupportedCultures(supportedCultures));

// Warm the JWT key cache before serving requests (F-01).
// If SAP is unreachable at startup the app starts in degraded mode — authentication
// is unavailable but the ServiceUnavailablePage is still reachable via React.
// InvalidOperationException means a KEK mismatch / tampered record — that is fatal
// and must prevent startup (fail-closed security invariant).
var jwtKeyManager = app.Services.GetRequiredService<IJwtKeyManager>();
try
{
    await jwtKeyManager.RefreshFromSapAsync();
}
catch (InvalidOperationException)
{
    throw; // KEK mismatch or config error — do not start
}
catch (Exception ex)
{
    app.Logger.LogWarning(ex,
        "SAP unavailable at startup — JWT key cache not pre-warmed. " +
        "Authentication will be unavailable until SAP is reachable.");
}

app.Run();

static string GetIpPartitionKey(HttpContext context) =>
    context.Connection.RemoteIpAddress?.ToString() ?? "unknown-ip";

static string GetUserOrIpPartitionKey(HttpContext context) =>
    context.User.FindFirst("UserId")?.Value
    ?? context.User.Identity?.Name
    ?? GetIpPartitionKey(context);


