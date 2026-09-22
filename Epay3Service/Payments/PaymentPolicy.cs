using Epay3Service.Models;

namespace Epay3Service.Payments;

/// <summary>
/// Server-enforced payment policy violations. These decisions were previously made
/// only client-side (and therefore bypassable by a tampered client); they are now
/// re-checked authoritatively on the server before a payment/deposit is sent to SAP.
/// </summary>
public enum PaymentPolicyViolation
{
    PaymentsGloballyDisabled,
    CompanyInactive,
    CompanyPaymentsDisabled,
    DepositsDisabled,
    EcheckNotAllowed,
}

/// <summary>
/// Pure, authoritative payment-policy evaluation. Does NOT trust client-supplied
/// flags. Kept free of I/O so it is fully unit-testable; the caller resolves config
/// values (global flag, company record, payment method) and passes them in.
///
/// Scope (Phase 1): on/off gates only — global + per-company payment disable,
/// per-company deposit and eCheck availability. Amount limits and 3DS-completion
/// verification are intentionally NOT handled here (they require currency-unit and
/// Cardinal/Paymetric result-contract decisions) and are tracked as follow-ups.
/// </summary>
public static class PaymentPolicy
{
    public const string ECheckMethod = "EC";

    /// <summary>
    /// Returns the first policy violation, or <c>null</c> if the payment is allowed.
    /// </summary>
    /// <param name="disablePaymentsGlobally">ApplicationConfiguration.DisablePaymentsGlobally.</param>
    /// <param name="company">CompanyInfo for the payment's company code, or null if unknown.</param>
    /// <param name="paymentMethod">"EC" for eCheck; anything else is treated as a card.</param>
    /// <param name="isDeposit">True when invoked from the deposit path.</param>
    public static PaymentPolicyViolation? Evaluate(
        bool disablePaymentsGlobally,
        CompanyInfo? company,
        string? paymentMethod,
        bool isDeposit)
    {
        if (disablePaymentsGlobally)
        {
            return PaymentPolicyViolation.PaymentsGloballyDisabled;
        }

        // Unknown company: leave SAP as the authority on company-code validity rather
        // than reject here, to avoid breaking flows where the cached company list is
        // incomplete. The global disable check above still applies.
        if (company == null)
        {
            return null;
        }

        // An inactive company blocks ALL operations — checked before the more specific
        // flags, since nothing is permitted for an inactive company regardless of them.
        if (!company.IsActive)
        {
            return PaymentPolicyViolation.CompanyInactive;
        }

        if (company.IsPaymentDisabled)
        {
            return PaymentPolicyViolation.CompanyPaymentsDisabled;
        }

        if (isDeposit && !company.IsDepositEnabled)
        {
            return PaymentPolicyViolation.DepositsDisabled;
        }

        if (IsECheck(paymentMethod) && !company.IsEcheckEnabled)
        {
            return PaymentPolicyViolation.EcheckNotAllowed;
        }

        return null;
    }

    public static bool IsECheck(string? paymentMethod) =>
        string.Equals(paymentMethod, ECheckMethod, StringComparison.OrdinalIgnoreCase);

    /// <summary>
    /// Localization key + English fallback for a violation, for the caller to resolve
    /// via the language manager.
    /// </summary>
    public static (string Key, string Default) Message(PaymentPolicyViolation violation) =>
        violation switch
        {
            PaymentPolicyViolation.PaymentsGloballyDisabled =>
                ("error.payment.disabled.global", "Payments are currently disabled."),
            PaymentPolicyViolation.CompanyInactive =>
                ("error.company.inactive", "This company is not active."),
            PaymentPolicyViolation.CompanyPaymentsDisabled =>
                ("error.payment.disabled.company", "Payments are disabled for this company."),
            PaymentPolicyViolation.DepositsDisabled =>
                ("error.deposit.disabled", "Deposits are not enabled for this company."),
            PaymentPolicyViolation.EcheckNotAllowed =>
                ("error.echeck.disabled", "eCheck is not available for this company."),
            _ => ("error.payment.notallowed", "This payment is not allowed."),
        };
}
