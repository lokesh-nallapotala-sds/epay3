using System.Security.Claims;

namespace Epay3Service.Models;

public static class Ability
{
    public const string ClaimType = nameof(Ability);

    public const string ManagePaymentMethods = "CanManagePaymentMethods";
    public const string EditSystemConfig = "CanEditSystemConfig";
    public const string ViewUsers = "CanViewUsers";
    public const string ManageUsers = "CanManageUsers";
    public const string Impersonate = "CanImpersonate";
    public const string ManageRegistrationRequests = "CanManageRegistrationRequests";
    public const string MakePayment = "CanMakePayment";
    public const string ManageOwnSAPAccounts = "CanManageOwnSAPAccounts";
    public const string ManageLinkedSAPAccounts = "ManageLinkedSAPAccounts";
    public const string IsAdmin = "IsAdmin";
    public const string ManageDeposits = "CanManageDeposits";
}
