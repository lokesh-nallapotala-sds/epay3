using System.Security.Claims;
using Epay3Net.Authorization.Abilities;
using Epay3Service.Models;
using Microsoft.AspNetCore.Authorization;

namespace Epay3Net.Tests.Authorization;

public class AbilityAuthorizationHandlerTests
{
    [Fact]
    public async Task HandleRequirementAsync_Succeeds_WhenRequiredAbilityClaimExists()
    {
        var requirement = new AbilityAuthorizationRequirement(
            AbilityAuthorizationMode.All,
            [Ability.EditSystemConfig]);

        AuthorizationHandlerContext context = CreateContext(requirement, Ability.EditSystemConfig);

        await new AbilityAuthorizationHandler().HandleAsync(context);

        Assert.True(context.HasSucceeded);
    }

    [Fact]
    public async Task HandleRequirementAsync_Fails_WhenRequiredAbilityClaimIsMissing()
    {
        var requirement = new AbilityAuthorizationRequirement(
            AbilityAuthorizationMode.All,
            [Ability.EditSystemConfig]);

        AuthorizationHandlerContext context = CreateContext(requirement, Ability.MakePayment);

        await new AbilityAuthorizationHandler().HandleAsync(context);

        Assert.False(context.HasSucceeded);
    }

    [Fact]
    public async Task HandleRequirementAsync_SupportsAnyAbilityMode()
    {
        var requirement = new AbilityAuthorizationRequirement(
            AbilityAuthorizationMode.Any,
            [Ability.MakePayment, Ability.ManagePaymentMethods]);

        AuthorizationHandlerContext context = CreateContext(requirement, Ability.ManagePaymentMethods);

        await new AbilityAuthorizationHandler().HandleAsync(context);

        Assert.True(context.HasSucceeded);
    }

    [Fact]
    public async Task HandleRequirementAsync_SupportsAllAbilityMode()
    {
        var requirement = new AbilityAuthorizationRequirement(
            AbilityAuthorizationMode.All,
            [Ability.ManageUsers, Ability.ManageLinkedSAPAccounts]);

        AuthorizationHandlerContext context = CreateContext(
            requirement,
            Ability.ManageUsers,
            Ability.ManageLinkedSAPAccounts);

        await new AbilityAuthorizationHandler().HandleAsync(context);

        Assert.True(context.HasSucceeded);
    }

    private static AuthorizationHandlerContext CreateContext(
        AbilityAuthorizationRequirement requirement,
        params string[] abilities)
    {
        Claim[] claims = abilities
            .Select(ability => new Claim(Ability.ClaimType, ability))
            .ToArray();

        var user = new ClaimsPrincipal(new ClaimsIdentity(claims, "test"));
        return new AuthorizationHandlerContext([requirement], user, resource: null);
    }
}
