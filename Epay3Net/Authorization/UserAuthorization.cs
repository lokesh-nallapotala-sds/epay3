using Epay3Net.Authorization.Requirements;

namespace Epay3Net.Authorization;

public static class UserOperations
{
    public static UserAccountRequirement UserAccount { get; } = new UserAccountRequirement();
}
