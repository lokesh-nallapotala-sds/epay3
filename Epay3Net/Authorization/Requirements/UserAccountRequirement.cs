using Microsoft.AspNetCore.Authorization;

namespace Epay3Net.Authorization.Requirements;

public class UserAccountRequirement : IAuthorizationRequirement
{
}


public class UserAccountRequirementHandler : AuthorizationHandler<UserAccountRequirement, string>
{
    protected override Task HandleRequirementAsync(AuthorizationHandlerContext context, UserAccountRequirement requirement, string resource)
    {
        var id = context.User.FindFirst("UserId")?.Value;

        if (id != null && context.User.HasClaim("Accounts", resource))
        {
            context.Succeed(requirement);
            return Task.CompletedTask;
        }

        return Task.CompletedTask;

    }
}
