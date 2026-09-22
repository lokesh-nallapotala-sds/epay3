namespace Epay3Net.FeatureManagement;

/// <summary>
/// Central policy for which /config data is exposed to UNAUTHENTICATED callers.
///
/// This is intentionally separate from <see cref="FeatureFlags"/>:
///   - <see cref="FeatureFlags"/> governs the nested "featureFlags" object (which
///     feature flags are public vs authenticated).
///   - <see cref="PublicConfigPolicy"/> governs the top-level applicationConfig
///     fields a public page is allowed to see.
///
/// Keeping the anonymous exposure surface here — rather than inline in
/// ConfigController — makes it a single, reviewable allow-list. Adding a key here
/// exposes it to the public internet, so changes should be reviewed as such.
/// </summary>
public static class PublicConfigPolicy
{
    /// <summary>
    /// The ONLY applicationConfig keys returned to UNAUTHENTICATED callers of
    /// /config/application. Each is read from applicationConfig by at least one
    /// public page (verified against the frontend selectors/components). Anything
    /// not listed is stripped for anonymous callers; authenticated callers receive
    /// the full payload via the SPA's post-login config refetch.
    /// </summary>
    public static readonly string[] AnonymousApplicationConfigFields =
    [
        "allowRegistration",        // LoginPage – show/hide the sign-up entry
        "privacyPolicy",            // Footer / NavDrawer link
        "termsAndConditions",       // Footer / NavDrawer link
        "contactUs",                // Footer / NavDrawer link
        "applicationLinks",         // Footer / NavDrawer links
        "copyrightYear",            // Footer
        "allowGuestPayment",        // NavDrawer / guest entry
        "maxPaymentAllowed",        // LoginPage / HomeStack
        "maxECheckPaymentAllowed",  // LoginPage / HomeStack
        "addressValidationOptions", // GuestPaymentComponent
        "enablePreAuth",            // GuestPaymentComponent
        "paymentIntegrationType",   // GuestPaymentComponent (iframe vs hosted)
        "isAccountLinkingEnabled",  // ResetPasswordPage (public route)
        "featureFlags",             // nested object, already internally tiered
    ];

    /// <summary>
    /// The ONLY customConfig (SapCustomData) keys returned to UNAUTHENTICATED callers
    /// of /config/custom. These are what the guest-payment flow actually reads
    /// (verified against the frontend: useGuest3DSValidation, usePaymentHelpers, the
    /// CVV selector, and the guest card form). Everything else is stripped for
    /// anonymous callers; authenticated callers receive the full payload via the
    /// SPA's post-login config refetch.
    /// </summary>
    public static readonly string[] AnonymousCustomConfigFields =
    [
        "generalData",      // CVV control + partial-payment (GuestPaymentComponent / usePaymentHelpers)
        "companyCodes",     // useGuest3DSValidation, company selection
        "paymentProviders", // useGuest3DSValidation (3DS init); provider keys already nulled
        "paymentCards",     // card-type selection (usePaymentHelpers / guest card form)
        "paymentTypes",     // usePaymentHelpers
    ];
}
