using Epay3Service.Models;
using Epay3Service.Payments;
using Xunit;

namespace Epay3Service.Tests.Payments;

public class PaymentPolicyTests
{
    private static CompanyInfo Company(
        bool isActive = true,
        bool isPaymentDisabled = false,
        bool isDepositEnabled = true,
        bool isEcheckEnabled = true) =>
        new()
        {
            CompanyCode = "1000",
            CurrencyKey = "USD",
            IsActive = isActive,
            IsPaymentDisabled = isPaymentDisabled,
            IsDepositEnabled = isDepositEnabled,
            IsEcheckEnabled = isEcheckEnabled,
        };

    // ---- Allowed cases ----

    [Fact]
    public void Allows_card_payment_for_enabled_company()
    {
        Assert.Null(PaymentPolicy.Evaluate(false, Company(), "CC", isDeposit: false));
    }

    [Fact]
    public void Allows_echeck_when_company_echeck_enabled()
    {
        Assert.Null(PaymentPolicy.Evaluate(false, Company(isEcheckEnabled: true), "EC", isDeposit: false));
    }

    [Fact]
    public void Allows_deposit_when_company_deposit_enabled()
    {
        Assert.Null(PaymentPolicy.Evaluate(false, Company(isDepositEnabled: true), "CC", isDeposit: true));
    }

    [Fact]
    public void Allows_card_even_when_echeck_disabled()
    {
        // eCheck-disabled must not block a card payment.
        Assert.Null(PaymentPolicy.Evaluate(false, Company(isEcheckEnabled: false), "CC", isDeposit: false));
    }

    [Fact]
    public void Unknown_company_is_not_blocked_when_not_globally_disabled()
    {
        // SAP remains the authority on company-code validity.
        Assert.Null(PaymentPolicy.Evaluate(false, null, "EC", isDeposit: false));
    }

    // ---- Blocked cases ----

    [Fact]
    public void Blocks_when_payments_globally_disabled()
    {
        Assert.Equal(
            PaymentPolicyViolation.PaymentsGloballyDisabled,
            PaymentPolicy.Evaluate(true, Company(), "CC", isDeposit: false));
    }

    [Fact]
    public void Global_disable_takes_precedence_even_for_unknown_company()
    {
        Assert.Equal(
            PaymentPolicyViolation.PaymentsGloballyDisabled,
            PaymentPolicy.Evaluate(true, null, "CC", isDeposit: false));
    }

    [Fact]
    public void Blocks_when_company_inactive()
    {
        Assert.Equal(
            PaymentPolicyViolation.CompanyInactive,
            PaymentPolicy.Evaluate(false, Company(isActive: false), "CC", isDeposit: false));
    }

    [Fact]
    public void Inactive_company_takes_precedence_over_specific_flags()
    {
        // Inactive is evaluated first, so it wins over deposit/eCheck/payment-disabled.
        Assert.Equal(
            PaymentPolicyViolation.CompanyInactive,
            PaymentPolicy.Evaluate(
                false,
                Company(isActive: false, isPaymentDisabled: true, isDepositEnabled: false, isEcheckEnabled: false),
                "EC",
                isDeposit: true));
    }

    [Fact]
    public void Blocks_when_company_payments_disabled()
    {
        Assert.Equal(
            PaymentPolicyViolation.CompanyPaymentsDisabled,
            PaymentPolicy.Evaluate(false, Company(isPaymentDisabled: true), "CC", isDeposit: false));
    }

    [Fact]
    public void Blocks_deposit_when_company_deposit_disabled()
    {
        Assert.Equal(
            PaymentPolicyViolation.DepositsDisabled,
            PaymentPolicy.Evaluate(false, Company(isDepositEnabled: false), "CC", isDeposit: true));
    }

    [Fact]
    public void Blocks_echeck_when_company_echeck_disabled()
    {
        Assert.Equal(
            PaymentPolicyViolation.EcheckNotAllowed,
            PaymentPolicy.Evaluate(false, Company(isEcheckEnabled: false), "EC", isDeposit: false));
    }

    // ---- Helper ----

    [Theory]
    [InlineData("EC", true)]
    [InlineData("ec", true)]
    [InlineData("CC", false)]
    [InlineData("cc", false)]
    [InlineData(null, false)]
    public void IsECheck_is_case_insensitive(string? method, bool expected)
    {
        Assert.Equal(expected, PaymentPolicy.IsECheck(method));
    }
}
