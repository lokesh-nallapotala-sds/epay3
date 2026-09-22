using System.Reflection;
using Epay3Net.Authorization.Abilities;
using Epay3Net.Controllers;
using Epay3Service.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Epay3Net.Tests.Authorization;

public class ControllerAuthorizationMetadataTests
{
    [Theory]
    [InlineData(nameof(ConfigController.UpdateApplicationConfig))]
    [InlineData(nameof(ConfigController.GetPaymenCards))]
    [InlineData(nameof(ConfigController.GetSmtpConfig))]
    [InlineData(nameof(ConfigController.UpdateEmailConfig))]
    [InlineData(nameof(ConfigController.UpdateThemeConfig))]
    [InlineData(nameof(ConfigController.DeleteThemeConfig))]
    [InlineData(nameof(ConfigController.GetEmailTemplates))]
    [InlineData(nameof(ConfigController.SmtpTest))]
    [InlineData(nameof(ConfigController.updateSystemConfig))]
    [InlineData(nameof(ConfigController.UpdateMaintenanceConfig))]
    [InlineData(nameof(ConfigController.GetHelpConfig))]
    [InlineData(nameof(ConfigController.UpdateHelpConfig))]
    [InlineData(nameof(ConfigController.CheckFileExists))]
    [InlineData(nameof(ConfigController.UploadFile))]
    [InlineData(nameof(ConfigController.GetConfigParameter))]
    [InlineData(nameof(ConfigController.GetDefaultEmailTemplate))]
    public void SensitiveConfigActions_AreNotAnonymous(string actionName)
    {
        MethodInfo action = GetConfigAction(actionName);

        Assert.False(HasAttribute<AllowAnonymousAttribute>(action));
        Assert.True(HasAttribute<AuthorizeAttribute>(typeof(ConfigController)) || HasAttribute<AuthorizeAttribute>(action));
    }

    [Theory]
    [InlineData(nameof(ConfigController.GetLanguage))]
    [InlineData(nameof(ConfigController.GetApplicationConfig))]
    [InlineData(nameof(ConfigController.GetCustomConfig))]
    [InlineData(nameof(ConfigController.GetPaymentCardTypes))]
    [InlineData(nameof(ConfigController.GetThemeConfig))]
    [InlineData(nameof(ConfigController.GetThemeForUrl))]
    [InlineData(nameof(ConfigController.GetPaymentConfig))]
    [InlineData(nameof(ConfigController.CheckAllEmailTemplates))]
    [InlineData(nameof(ConfigController.GetMaintenanceConfig))]
    [InlineData(nameof(ConfigController.GetMaintenanceModeStatus))]
    [InlineData(nameof(ConfigController.GetAvsConfigParameter))]
    public void PublicConfigActions_AreExplicitlyAnonymous(string actionName)
    {
        MethodInfo action = GetConfigAction(actionName);

        Assert.True(HasAttribute<AllowAnonymousAttribute>(action));
    }

    [Theory]
    [InlineData(nameof(PaymentTokenController.Get3DSAuthenticationResult))]
    [InlineData(nameof(PaymentTokenController.GetTokenizationResponse))]
    public void SensitiveTokenActions_RequireAbilityPolicy(string actionName)
    {
        MethodInfo action = GetTokenAction(actionName);

        Assert.Contains(
            action.GetCustomAttributes<AuthorizeAttribute>(inherit: true),
            attribute => attribute is RequiresAbilityAttribute);
    }

    [Fact]
    public void PaymentController_DoesNotExposePayerDetailsEndpoint()
    {
        Assert.Null(typeof(PaymentController).GetMethod("GetPayerDetails"));
    }

    [Fact]
    public void AddressValidationController_AuthenticatedAddressValidation_RequiresPaymentAbility()
    {
        MethodInfo action = GetAddressValidationAction(nameof(AddressValidationController.WorldpayVerifyAddress));

        Assert.False(HasAttribute<AllowAnonymousAttribute>(action));
        Assert.Contains(
            typeof(AddressValidationController).GetCustomAttributes<AuthorizeAttribute>(inherit: true),
            attribute => attribute is RequiresAbilityAttribute
                && attribute.Policy == AbilityPolicyNames.ForAll(Ability.MakePayment));
    }

    [Fact]
    public void AddressValidationController_GuestAddressValidation_IsExplicitlyAnonymous()
    {
        MethodInfo action = GetAddressValidationAction(nameof(AddressValidationController.GuestWorldpayVerifyAddress));

        Assert.True(HasAttribute<AllowAnonymousAttribute>(action));
    }

    [Fact]
    public void Controllers_DoNotUseLegacyPolicyStringAttributes()
    {
        IEnumerable<AuthorizeAttribute> legacyPolicyAttributes = typeof(ConfigController).Assembly
            .GetTypes()
            .Where(type => type.Namespace == typeof(ConfigController).Namespace)
            .SelectMany(type => type.GetCustomAttributes<AuthorizeAttribute>(inherit: true)
                .Concat(type.GetMethods().SelectMany(method => method.GetCustomAttributes<AuthorizeAttribute>(inherit: true))))
            .Where(attribute =>
                !string.IsNullOrWhiteSpace(attribute.Policy)
                && attribute is not RequiresAbilityAttribute
                && attribute is not RequiresAnyAbilityAttribute
                && attribute is not RequiresAllAbilitiesAttribute);

        Assert.Empty(legacyPolicyAttributes);
    }

    [Fact]
    public void UnsafeControllerActions_DoNotOptOutOfAntiforgeryExceptCspReport()
    {
        var ignoredActions = typeof(ConfigController).Assembly
            .GetTypes()
            .Where(type => type.Namespace == typeof(ConfigController).Namespace)
            .SelectMany(type => type.GetMethods().Select(method => new
            {
                Controller = type,
                Action = method,
                Ignored = HasAttribute<IgnoreAntiforgeryTokenAttribute>(method)
            }))
            .Where(item => item.Ignored)
            .Select(item => $"{item.Controller.Name}.{item.Action.Name}")
            .ToArray();

        Assert.Equal(["CspReportController.Report"], ignoredActions);
    }

    [Fact]
    public void Program_RegistersGlobalAntiforgeryValidation()
    {
        var root = FindRepositoryRoot();
        var programText = File.ReadAllText(Path.Combine(root, "Epay3Net", "Program.cs"));

        Assert.Contains("AutoValidateAntiforgeryTokenAttribute", programText);
    }

    private static MethodInfo GetConfigAction(string actionName) =>
        typeof(ConfigController).GetMethod(actionName)
        ?? throw new InvalidOperationException($"Could not find ConfigController action {actionName}.");

    private static MethodInfo GetPaymentAction(string actionName) =>
        typeof(PaymentController).GetMethod(actionName)
        ?? throw new InvalidOperationException($"Could not find PaymentController action {actionName}.");

    private static MethodInfo GetTokenAction(string actionName) =>
        typeof(PaymentTokenController).GetMethod(actionName)
        ?? throw new InvalidOperationException($"Could not find PaymentTokenController action {actionName}.");

    private static MethodInfo GetAddressValidationAction(string actionName) =>
        typeof(AddressValidationController).GetMethod(actionName)
        ?? throw new InvalidOperationException($"Could not find AddressValidationController action {actionName}.");

    private static bool HasAttribute<TAttribute>(MemberInfo member)
        where TAttribute : Attribute =>
        member.GetCustomAttributes<TAttribute>(inherit: true).Any();

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
