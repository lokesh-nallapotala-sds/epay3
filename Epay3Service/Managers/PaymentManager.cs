using Epay3Service.Clients.Interfaces;
using Epay3Service.Clients.Models;
using Epay3Service.Configuration;
using Epay3Service.Helpers;
using Epay3Service.Managers.Interfaces;
using Epay3Service.Models;
using Epay3Service.Payments;
using Newtonsoft.Json;
using WebAR.Service.Services.API.Models;

namespace Epay3Service.Managers;

public class PaymentManager(
    IMailer mailer,
    ISapHttpClient sapHttpClient,
    ApplicationSecrets applicationSecrets,
    ILanguageManager languageManager,
    IAccountManager accountManager,
    IApplicationConfigurationManager applicationConfigurationManager
    ) : IPaymentManager
{
    private readonly ISapHttpClient sapHttpClient = sapHttpClient;
    private readonly ApplicationSecrets applicationSecrets = applicationSecrets;
    private readonly ILanguageManager languageManager = languageManager;
    private readonly IAccountManager accountManager = accountManager;
    private readonly IMailer mailer = mailer;
    private readonly IApplicationConfigurationManager applicationConfigurationManager = applicationConfigurationManager;

    /// <summary>
    /// Authoritative server-side payment-policy gate. Re-checks (independently of the
    /// client) whether payments are disabled globally or for the company, whether the
    /// company is active, and whether deposits / eCheck are permitted. Returns a
    /// populated <see cref="SapHttpStatus"/> error (the same shape as a SAP business
    /// error, so the client surfaces it as a toast) when the operation is not allowed;
    /// otherwise returns null.
    /// </summary>
    private async Task<SapHttpStatus?> GetPaymentPolicyError(string? companyCode, string? paymentMethod, bool isDeposit, string language)
    {
        ApplicationConfiguration? appConfig = await this.applicationConfigurationManager.GetApplicationConfig();
        SapCustomData? customData = await this.applicationConfigurationManager.GetCustomConfig(language);

        CompanyInfo? company = customData?.CompanyCodes?.FirstOrDefault(
            c => string.Equals(c.CompanyCode, companyCode, StringComparison.OrdinalIgnoreCase));

        PaymentPolicyViolation? violation = PaymentPolicy.Evaluate(
            appConfig?.DisablePaymentsGlobally ?? false,
            company,
            paymentMethod,
            isDeposit);

        if (violation == null)
        {
            return null;
        }

        (string key, string fallback) = PaymentPolicy.Message(violation.Value);
        return new SapHttpStatus
        {
            MessageType = "E",
            Line = this.languageManager.GetMessage(key, language, fallback),
        };
    }

    private static PaymentProviderInfo? GetActiveWorldpayProvider(SapCustomData? customData)
    {
        return customData?.PaymentProviders?.FirstOrDefault(provider =>
            string.Equals(provider.Description, "Worldpay", StringComparison.OrdinalIgnoreCase) ||
            string.Equals(provider.Provider, "PM", StringComparison.OrdinalIgnoreCase))
            ?? customData?.PaymentProviders?.FirstOrDefault();
    }

    private static bool IsEncryptedPaymentToken(string? paymentCardToken)
    {
        return !string.IsNullOrWhiteSpace(paymentCardToken) && paymentCardToken.Contains('!');
    }

    private async Task<string> ResolveSapCardType(string? internalCardType, string language)
    {
        if (string.IsNullOrWhiteSpace(internalCardType))
        {
            return string.Empty;
        }

        SapCustomData? customData = await this.applicationConfigurationManager.GetCustomConfig(language);
        PaymentCardInfo? cardInfo = customData?.PaymentCards?.FirstOrDefault(card =>
            string.Equals(card.PaymentCardType, internalCardType, StringComparison.OrdinalIgnoreCase) ||
            string.Equals(card.SapCardType, internalCardType, StringComparison.OrdinalIgnoreCase) ||
            string.Equals(card.GatewayCardType, internalCardType, StringComparison.OrdinalIgnoreCase) ||
            string.Equals(card.ExternalPaymentCardType, internalCardType, StringComparison.OrdinalIgnoreCase));

        return cardInfo?.SapCardType ?? CardTypeMappingHelper.ToSapCardType(internalCardType);
    }

    public async Task<PayerDetail?> GetPayerDetails(User user, string selectedAccount, string payer, string language = "en")
    {
        ResolvedPayerContext context = await this.ResolvePayerContext(user, selectedAccount, payer, language);
        return await this.GetPayerDetails(context, language);
    }


    public async Task<PayerDetail?> GetGuestPayerDetails(PayerDetailsRequest request, string language = "en")
    {
        var queryParams = new Dictionary<string, string?>
            {
                {"customer_number", request.CustomerNumber},
                {"company_code", request.CompanyCode},
                {"payer_det_action", request.Action},
                {"sales_organization", request.SalesArea?.SalesOrganization},
                {"distribution_channel", request.SalesArea?.DistributionChannel},
                {"division", request.SalesArea?.Division},
            };
        Clients.Models.SapHttpData<PayerDetail?> data = await this.sapHttpClient.Get<PayerDetail>("CNBS_PAYER_PATH", queryParams, language);

        return data?.Data;
    }
    public async Task<Dictionary<string, string?>> GetCardinalData(User user, string selectedAccount, string payer, SapCustomData customData, string cardKey, decimal amount, string currency, string language = "en")
    {
        PayerDetail? data = await this.GetPayerDetails(user, selectedAccount, payer, language);
        PaymentProviderInfo? paymentProvider = GetActiveWorldpayProvider(customData);
        var queryParams = new Dictionary<string, string?>
        {
            {"amount", $"{amount}" },
            {"billing_address1", $"{data?.AddressData?.Street}" },
            {"billing_city", $"{data?.AddressData?.City}" },
            {"billing_country_code", $"{PaymetricHelper.GetCountryCode(data?.AddressData?.Country)}" },
            {"billing_email", $"{user.Email}" },
            {"billing_first_name", $"{user.FirstName}" },
            {"billing_last_name", $"{user.LastName}" },
            {"billing_phone", $"{this.GetPhone(data?.Communications?.Phones)}" },
            {"billing_postal_code", $"{data?.AddressData?.PostalCodeCity}" },
            {"billing_state", $"{data?.AddressData?.Region}" },
            {"currency_code", $"{PaymetricHelper.GetCurrencyCode(currency,data?.AddressData?.Country)}" },
            {"mobile_phone", $"{this.GetPhone(data?.Communications?.Phones)}" },
            {"order_number", $"{Guid.NewGuid()}" },
            {"shipping_address1", $"{data?.AddressData?.Street}" },
            {"shipping_city", $"{data?.AddressData?.City}" },
            {"shipping_country_code", $"{PaymetricHelper.GetCountryCode(data?.AddressData?.Country)}" },
            {"shipping_postal_code", $"{data?.AddressData?.PostalCodeCity}" },
            {"shipping_state", $"{data?.AddressData?.Region}" },
            {"threeds_version", $"{paymentProvider?.Secure3dsVersion?.Trim()}" },
            {"work_phone", $"{this.GetPhone(data?.Communications?.Phones)}" },
        };

        if (cardKey != "")
        {
            var cardToken = Encryption.Decrypt(cardKey, this.applicationSecrets.EncryptionKey);

            PaymentCard? card = data?.PaymentCards?.FirstOrDefault(x => x.IsValid && x.PaymentCardToken == cardToken);
            if (card == null)
            {
                throw new Exception(this.languageManager.GetMessage("Card could not be found", language, "Card could not be found"));
            }
            else
            {
                queryParams.Add("payment_card_token", $"{card?.PaymentCardToken}");
                queryParams.Add("expiration_month", $"{card?.ValidTo?.Split('-')[0]}");
                queryParams.Add("expiration_year", $"{card?.ValidTo?.Split('-')[2]}");
                queryParams.Add("payment_method", "TO");
            }
        }
        else
        {
            queryParams.Add("payment_method", "CC");
            queryParams.Add("fn_ccnum", "CCNUM");
            queryParams.Add("fn_valtm", "VALTM");
            queryParams.Add("fn_valty", "VALTY");
        }

        return queryParams;
    }

    public async Task<PaymentAccessToken?> GetAccessToken(User user, string selectedAccount, string payer, SapCustomData customData, string cardKey, decimal amount, string currency, string redirectURI, string language = "en", PaymentMethod? paymentMethod = null, string? companyCode = null)
    {
        ResolvedPayerContext context = await this.ResolvePayerContext(user, selectedAccount, payer, language, companyCode: companyCode);
        PayerDetail? data = await this.GetPayerDetails(context, language);
        PaymentProviderInfo? paymentProvider = GetActiveWorldpayProvider(customData);
        var queryParams = new Dictionary<string, string?>
        {
            {"action", "01" },
            {"amount", $"{amount*100}" },
            {"billing_address1", $"{data?.AddressData?.Street}" },
            {"billing_city", $"{data?.AddressData?.City}" },
            {"billing_country_code", $"{PaymetricHelper.GetCountryCode(data?.AddressData?.Country)}" },
            {"billing_email", $"{user.Email}" },
            {"billing_first_name", $"{user.FirstName}" },
            {"billing_last_name", $"{user.LastName}" },
            {"billing_phone", $"{this.GetPhone(data?.Communications?.Phones)}" },
            {"mobile_phone", $"{this.GetPhone(data?.Communications?.Phones)}" },
            {"work_phone", $"{this.GetPhone(data?.Communications?.Phones)}" },
            {"billing_postal_code", $"{data?.AddressData?.PostalCodeCity}" },
            {"billing_state", $"{data?.AddressData?.Region}" },
            {"currency_code", $"{PaymetricHelper.GetCurrencyCode(currency,data?.AddressData?.Country)}" },
            {"order_number", $"{Guid.NewGuid()}" },
            {"shipping_address1", $"{data?.AddressData?.Street}" },
            {"shipping_city", $"{data?.AddressData?.City}" },
            {"shipping_country_code", $"{PaymetricHelper.GetCountryCode(data?.AddressData?.Country)}" },
            {"shipping_postal_code", $"{data?.AddressData?.PostalCodeCity}" },
            {"shipping_state", $"{data?.AddressData?.Region}" },
            {"threeds_version", $"{paymentProvider?.Secure3dsVersion?.Trim()}" },
            {"redirect_uri",redirectURI}
        };

        PaymentCard? card = null;

        if (!string.IsNullOrWhiteSpace(cardKey))
        {
            var cardToken = Encryption.Decrypt(cardKey, this.applicationSecrets.EncryptionKey);
            card = data?.PaymentCards?.FirstOrDefault(x => x.IsValid && x.PaymentCardToken == cardToken);

            if (card == null)
            {
                throw new Exception(this.languageManager.GetMessage("Card could not be found", language, "Card could not be found"));
            }
            if (card != null)
            {
                queryParams.Add("payment_card_token", $"{card?.PaymentCardToken}");
                queryParams.Add("expiration_month", $"{card?.ValidTo?.Split('-')[0]}");
                queryParams.Add("expiration_year", $"{card?.ValidTo?.Split('-')[2]}");
                queryParams.Add("payment_method", "TO");
            }
        }
        else if (paymentMethod != null)
        {

            // Ensure ValidTo is not null or empty before splitting
            string? validTo = string.IsNullOrEmpty(paymentMethod?.ValidTo) ? null : paymentMethod.ValidTo;
            if (paymentMethod?.Name.IndexOf("session", StringComparison.OrdinalIgnoreCase) >= 0)
            {
                if (paymentMethod.CardType.ToUpper() == "EC")
                {
                    validTo = "12-31-9999";
                }
            }

            string? expirationMonth = validTo?.Split('-').Length > 0 ? validTo.Split('-')[0] : null;
            string? expirationYear = validTo?.Split('-').Length > 2 ? validTo.Split('-')[2] : null;

            queryParams.Add("payment_card_token", $"{paymentMethod?.Token}");
            queryParams.Add("expiration_month", expirationMonth ?? "");
            queryParams.Add("expiration_year", expirationYear ?? "");
            queryParams.Add("payment_method", "TO");
        }
        else
        {
            queryParams.Add("payment_method", "CC");
            queryParams.Add("fn_ccnum", "CCNUM");
            queryParams.Add("fn_valtm", "VALTM");
            queryParams.Add("fn_valty", "VALTY");
        }

        Clients.Models.SapHttpData<PaymentAccessToken?> response = await this.sapHttpClient.Get<PaymentAccessToken>("CNBS_ACCESS_TOKEN", queryParams, language, false);

        return response.Data;
    }

    public async Task<PaymentAccessToken?> GetPaymentAccessToken(Dictionary<string, string?> queryParams, string language = "en")
    {
        Clients.Models.SapHttpData<PaymentAccessToken?> response = await this.sapHttpClient.Get<PaymentAccessToken>("CNBS_ACCESS_TOKEN", queryParams, language, false);

        return response.Data;
    }

    public async Task<AccessTokenResponse?> GetPaymentResponse(string accessToken, string language = "en")
    {
        var queryParams = new Dictionary<string, string?>
        {
            {"action", "02"},
            {"access_token", accessToken}
        };

        Clients.Models.SapHttpData<AccessTokenResponse?>? response = await this.sapHttpClient.Get<AccessTokenResponse>("CNBS_ACCESS_TOKEN_RESPONSE", queryParams, language, false);
        if (response?.Data == null && response?.Status != null)
        {
            string sapHttpStatusString = JsonConvert.SerializeObject(response?.Status, Formatting.Indented);
            throw new Exception(sapHttpStatusString);

        }
        return response?.Data;
    }

    /// <summary>
    /// Used for creating the credid cards
    /// </summary>
    /// <param name="accessToken"></param>
    /// <param name="language"></param>
    /// <returns></returns>
    public async Task<TokenizationResponse> GetTokenResponse(TokenizationRequest request, string language = "en")
    {
        HttpResponseMessage response = await this.GetPayTokenResponse(request, language);
        return JsonConvert.DeserializeObject<TokenizationResponse>(await response.Content.ReadAsStringAsync());
    }

    public async Task<HttpResponseMessage> GetPayTokenResponse(TokenizationRequest request, string language = "en")
    {
        var queryParams = new Dictionary<string, string>
        {
            { "action", request.Action },
            { "access_token", request.AccessToken }
         };
        return await this.sapHttpClient.GetAsync("CNBS_ACCESS_TOKEN_RESPONSE", "", "GetAccessTokenResponse", queryParams);
    }


    public async Task<PaymentCardsResponse?> ManagePaymentCard(User user, string action, PayerData payer, List<PaymentCard> paymentCards, string language = "en", bool returnStatusOnSapError = false, SapPaymentCardAddressData? addressData = null)
    {
        var request = new PaymentCardsRequest();
        request.PayerData = payer;
        request.AddressData = addressData;
        if (paymentCards != null)
        {
            foreach (var card in paymentCards)
            {
                card.PaymentCardType = await this.ResolveSapCardType(card.PaymentCardType, language);

                if (IsEncryptedPaymentToken(card.PaymentCardToken))
                {
                    card.PaymentCardToken = Encryption.Decrypt(
                        card.PaymentCardToken!,
                        this.applicationSecrets.EncryptionKey
                    );
                }

            }
        }
        request.PaymentCards = paymentCards ?? [];
        request.Action = action;
        request.Log = new TraceLog
        {
            epayv = "v3",
            id = "ADD_PAYMENT_CARD",
            login = user.Email,
        };

        Clients.Models.SapHttpData<PaymentCardsResponse?>? receipt = await this.sapHttpClient.Post<PaymentCardsResponse>("CNBS_MANAGE_PAYMENT", null, request, language, false);
        PaymentCardsResponse? paymentCardsResponse = this.NormalizeManagePaymentResponse(receipt);

        if (receipt?.Status != null)
        {
            if (receipt?.Status?.MessageType == "S")
            {
                return paymentCardsResponse;
            }
            else if (receipt?.Status?.MessageType == "E")
            {
                if (returnStatusOnSapError)
                {
                    return paymentCardsResponse;
                }

                string sapHttpStatusString = JsonConvert.SerializeObject(receipt?.Status, Formatting.Indented);
                throw new Exception(sapHttpStatusString);
            }
        }
        return paymentCardsResponse;
    }

    public async Task<PaymentCardsResponse?> ManageGuestPaymentCard(string action, PayerData payer, List<PaymentCard> paymentCards, string language = "en", bool returnStatusOnSapError = false, SapPaymentCardAddressData? addressData = null)
    {
        var request = new PaymentCardsRequest();
        request.PayerData = payer;
        request.AddressData = addressData;

        if (paymentCards != null)
        {
            foreach (var card in paymentCards)
            {
                card.PaymentCardType = await this.ResolveSapCardType(card.PaymentCardType, language);

                if (IsEncryptedPaymentToken(card.PaymentCardToken))
                {
                    card.PaymentCardToken = Encryption.Decrypt(
                        card.PaymentCardToken!,
                        this.applicationSecrets.EncryptionKey
                    );
                }

            }
        }
        request.PaymentCards = paymentCards ?? [];
        request.Action = action;
        request.Log = new TraceLog
        {
            epayv = "v3",
            id = "PRE-AUTHORIZATION", //"ADD_PAYMENT_CARD",
            login = "Guest User",
        };

        Clients.Models.SapHttpData<PaymentCardsResponse?>? receipt = await this.sapHttpClient.Post<PaymentCardsResponse>("CNBS_MANAGE_PAYMENT", null, request, language, false);
        PaymentCardsResponse? paymentCardsResponse = this.NormalizeManagePaymentResponse(receipt);

        if (receipt?.Status != null)
        {
            if (receipt?.Status?.MessageType == "S")
            {
                return paymentCardsResponse;
            }
            else if (receipt?.Status?.MessageType == "E")
            {
                if (returnStatusOnSapError)
                {
                    return paymentCardsResponse;
                }

                string sapHttpStatusString = JsonConvert.SerializeObject(receipt?.Status, Formatting.Indented);
                throw new Exception(sapHttpStatusString);
            }
        }
        return paymentCardsResponse;
    }

    public async Task<PaymentReceipt?> MakePayment(User user, string selectedAccount, string payer, string companyCode, List<PaymentInvoice> documents, string? cvv, CardinalData? cardinalData, string userAgent, string country, string language = "en", PaymentMethod? paymentCard = null)
    {
        var request = new SapPaymentRequest();
        ResolvedPayerContext context = await this.ResolvePayerContext(
            user,
            selectedAccount,
            payer,
            language,
            this.languageManager.GetMessage("error.payer.notfound", language, "Not found"),
            companyCode);

        request.Payer = new PayerData
        {
            CompanyCode = context.CompanyCode,
            CustomerNumber = context.CustomerNumber
        };

        request.SoldTo = new SoldToPayment
        {
            AccountNumber = user.PrimaryAccountType == "Payer"
                ? context.CustomerNumber
                : selectedAccount
        };

        request.CurrencyDecimals = PaymetricHelper.GetCurrencyDecimal(documents.First().CurrencyKey);
        request.Custom = new ZCustom
        {
            HeaderText = user.Login
        };

        request.Documents = documents;

        PayerDetail? payerDetails = await this.GetPayerDetails(context, language);
        PaymentCard? method = null;
        if (!string.IsNullOrEmpty(paymentCard?.Key))
        {
            var paymentToken = Encryption.Decrypt(paymentCard.Key, this.applicationSecrets.EncryptionKey);
            method = payerDetails?.PaymentCards?.SingleOrDefault(x => x.PaymentCardToken == paymentToken);
        }

        if (method == null && paymentCard == null)
        {
            throw new Exception(this.languageManager.GetMessage("error.paymentmethod.notfound", language, "Not found"));
        }
        if (paymentCard?.Name.IndexOf("session", StringComparison.OrdinalIgnoreCase) >= 0)
        {
            if (paymentCard.CardType.ToUpper() == "EC")
            {
                paymentCard.ValidTo = "12-31-9999";
            }
        }
        request.PaymentDetail = new PaymentDetail
        {
            PaymentCardType = await this.ResolveSapCardType(method?.PaymentCardType ?? paymentCard?.CardType ?? "", language),
            PaymentCardToken = method?.PaymentCardToken ?? paymentCard?.Token ?? "",
            PaymentCardName = method?.PaymentCardName ?? paymentCard?.Name ?? "",
            PaymentMethod = CardTypeMappingHelper.IsElectronicCheck(method?.PaymentCardType ?? paymentCard?.CardType) ? "EC" : "CC",
            ValidTo = method?.ValidTo ?? paymentCard?.ValidTo ?? "",
            ElectronicCheckAccountType = method?.ElectronicCheckAccountType ?? "",
            ElectronicCheckRdfiNumber = method?.ElectronicCheckRdfiNumber ?? "",
            AddressData = payerDetails?.AddressData,
            CardValidationCode = cvv ?? "",
            Cardinal = cardinalData
        };

        request.Log = new TraceLog
        {
            epayv = "v3",
            id = "POST_INVOICE",
            login = user.Email,
            usrag = userAgent
        };

        SapHttpStatus? policyError = await this.GetPaymentPolicyError(context.CompanyCode, request.PaymentDetail.PaymentMethod, isDeposit: false, language);
        if (policyError != null)
        {
            return new PaymentReceipt { Error = policyError };
        }

        Clients.Models.SapHttpData<PaymentReceipt?> receipt = await this.sapHttpClient.Post<PaymentReceipt>("CNBS_PAYMENT_PATH", null, request, language, false);

        EmailError? emailError = null;
        if (receipt?.Status?.MessageType == "E")
        {
            string originalMessage = receipt?.Status?.Line ?? string.Empty;
            string friendlyMessage = ErrorMessageHelper.GetFriendlyMessage(originalMessage, language, this.languageManager);

            if (receipt?.Status != null)
            {
                receipt.Status.Line = friendlyMessage;
            }

            return new PaymentReceipt
            {
                Error = receipt?.Status
            };
        }
        else if (receipt?.Status?.MessageType == "S")
        {
            try
            {
                await this.mailer.SendReceipt(language, country, user, request);
            }
            catch (Exception)
            {
                emailError = new EmailError
                {
                    Code = "warning.email.sending",
                    Message = "There was an issue sending email. Please contact customer service."
                };
            }
        }

        return new PaymentReceipt
        {
            Documents = receipt?.Data?.Documents,
            EmailError = emailError
        };
    }

    public async Task<SapHttpStatus?> DeleteSchedulepayment(User user, string scheduleId, string customerNumber, string companyCode, string language = "en")
    {
        var request = new DeleteSchedulePaymentRequest
        {
            ScheduleId = scheduleId,
            PayerData = new PayerData
            {
                CustomerNumber = customerNumber,
                CompanyCode = companyCode
            }
        };

        Clients.Models.SapHttpData<SapHttpStatus?> receipt = await this.sapHttpClient.Delete<SapHttpStatus>("CNBS_DELETE_SCHEDULED_PAYMENT", null, request, language, false);

        return receipt?.Status;
    }


    public async Task<SapHttpStatus?> ScheduledPayment(User user, string selectedAccount, string payer, string companyCode, List<PaymentInvoice> documents, string? cvv, CardinalData? cardinalData, string userAgent, string country, string language = "en", PaymentMethod? paymentCard = null, string? scheduledDate = null)
    {
        var request = new SapPaymentRequest();
        ResolvedPayerContext context = await this.ResolvePayerContext(
            user,
            selectedAccount,
            payer,
            language,
            this.languageManager.GetMessage("error.payer.notfound", language, "Not found"), companyCode);

        request.Payer = new PayerData
        {
            CompanyCode = context.CompanyCode,
            CustomerNumber = context.CustomerNumber
        };

        request.SoldTo = new SoldToPayment
        {
            AccountNumber = user.PrimaryAccountType == "Payer"
                ? context.CustomerNumber
                : selectedAccount
        };

        request.CurrencyDecimals = PaymetricHelper.GetCurrencyDecimal(documents.First().CurrencyKey);
        request.Custom = new ZCustom
        {
            HeaderText = user.Login
        };

        request.Documents = documents;

        PayerDetail? payerDetails = await this.GetPayerDetails(context, language);
        PaymentCard? method = null;
        if (!string.IsNullOrEmpty(paymentCard?.Key))
        {
            var paymentToken = Encryption.Decrypt(paymentCard.Key, this.applicationSecrets.EncryptionKey);
            method = payerDetails?.PaymentCards?.SingleOrDefault(x => x.PaymentCardToken == paymentToken);
        }

        if (method == null && paymentCard == null)
        {
            throw new Exception(this.languageManager.GetMessage("error.paymentmethod.notfound", language, "Not found"));
        }
        if (paymentCard?.Name.IndexOf("session", StringComparison.OrdinalIgnoreCase) >= 0)
        {
            if (paymentCard.CardType.ToUpper() == "EC")
            {
                paymentCard.ValidTo = "12-31-9999";
            }
        }
        request.PaymentDetail = new PaymentDetail
        {
            PaymentCardType = await this.ResolveSapCardType(method?.PaymentCardType ?? paymentCard?.CardType ?? "", language),
            PaymentCardToken = method?.PaymentCardToken ?? paymentCard?.Token ?? "",
            PaymentCardName = method?.PaymentCardName ?? paymentCard?.Name ?? "",
            PaymentMethod = CardTypeMappingHelper.IsElectronicCheck(method?.PaymentCardType ?? paymentCard?.CardType) ? "EC" : "CC",
            ValidTo = method?.ValidTo ?? paymentCard?.ValidTo ?? "",
            ElectronicCheckAccountType = method?.ElectronicCheckAccountType ?? "",
            ElectronicCheckRdfiNumber = method?.ElectronicCheckRdfiNumber ?? "",
            AddressData = payerDetails?.AddressData,
            CardValidationCode = cvv ?? "",
            Cardinal = cardinalData,

        };
        if (!string.IsNullOrEmpty(scheduledDate))
        {
            DateTime scheduled;
            if (DateTime.TryParse(scheduledDate, out scheduled))
            {
                request.ScheduledDate = scheduled.ToString("MM-dd-yyyy");
            }
            else
            {
                throw new Exception(this.languageManager.GetMessage("error.scheduleddate.invalid", language, "Invalid scheduled date"));
            }
        }

        bool isScheduled = !string.IsNullOrEmpty(scheduledDate);

        request.Log = new TraceLog
        {
            epayv = "v3",
            id = "POST_INVOICE",
            login = user.Email,
            usrag = userAgent
        };

        Clients.Models.SapHttpData<SapHttpStatus?> receipt = await this.sapHttpClient.Post<SapHttpStatus>("CNBS_PAYMENT_PATH", null, request, language, isScheduled);

        return receipt?.Status;
    }

    public async Task<DepositsResponse?> MakeDeposit(User user, string selectedAccount, string CompanyCode, string payer, DepositDetail depositDetails, string currecnyKey, string? cvv, CardinalData? cardinalData, string userAgent, string language = "en", PaymentMethod? paymentCard = null)
    {
        var request = new SapDepositRequest();
        request.DepositDetail = depositDetails;
        ResolvedPayerContext context = await this.ResolvePayerContext(
            user,
            selectedAccount,
            payer,
            language,
            this.languageManager.GetMessage("error.payer.notfound", language, "Not found"),
            CompanyCode);

        request.PayerData = new PayerData
        {
            CompanyCode = context.CompanyCode,
            CustomerNumber = context.CustomerNumber
        };

        //request.CurrencyDecimals = PaymetricHelper.GetCurrencyDecimal(currecnyKey);
        //request.Custom = new ZCustom
        //{
        //    HeaderText = user.Login
        //};

        PayerDetail? payerDetails = await this.GetPayerDetails(context, language);

        PaymentCard? method = null;

        var token = Encryption.Decrypt(paymentCard?.Token ?? "", this.applicationSecrets.EncryptionKey ?? "");
        if (paymentCard != null)
        {
            paymentCard.Token = token;
        }

        if (!string.IsNullOrEmpty(paymentCard?.Key))
        {
            var paymentToken = Encryption.Decrypt(paymentCard?.Key ?? "", this.applicationSecrets.EncryptionKey ?? "");
            method = payerDetails?.PaymentCards?.SingleOrDefault(x => x.PaymentCardToken == paymentToken);
        }

        if (method == null && paymentCard == null)
        {
            throw new Exception(this.languageManager.GetMessage("error.paymentmethod.notfound", language, "Not found"));
        }

        if (paymentCard?.Name.IndexOf("session", StringComparison.OrdinalIgnoreCase) >= 0)
        {
            if (paymentCard.CardType.ToUpper() == "EC")
            {
                paymentCard.ValidTo = "12-31-9999";
            }
        }
        request.PaymentDetail = new PaymentDetail
        {
            PaymentCardType = await this.ResolveSapCardType(method?.PaymentCardType ?? paymentCard?.CardType ?? "", language),
            PaymentCardToken = method?.PaymentCardToken ?? paymentCard?.Token ?? "",
            PaymentCardName = method?.PaymentCardName ?? paymentCard?.Name ?? "",
            PaymentMethod = CardTypeMappingHelper.IsElectronicCheck(method?.PaymentCardType ?? paymentCard?.CardType) ? "EC" : "CC",
            ValidTo = method?.ValidTo ?? paymentCard?.ValidTo ?? "",
            ElectronicCheckAccountType = method?.ElectronicCheckAccountType ?? "",
            ElectronicCheckRdfiNumber = method?.ElectronicCheckRdfiNumber ?? "",
            AddressData = payerDetails?.AddressData,
            CardValidationCode = cvv ?? "",
            Cardinal = cardinalData
        };

        request.Log = new TraceLog
        {
            epayv = "v3",
            id = "POST_DEPOSIT",
            login = user.Email,
            usrag = userAgent
        };

        SapHttpStatus? policyError = await this.GetPaymentPolicyError(context.CompanyCode, request.PaymentDetail.PaymentMethod, isDeposit: true, language);
        if (policyError != null)
        {
            return new DepositsResponse { Error = policyError };
        }

        Clients.Models.SapHttpData<DepositsResponse?> receipt = await this.sapHttpClient.Post<DepositsResponse>("CNBS_MAKE_DEPOSIT", null, request, language, false);
        if (receipt?.Status?.MessageType == "E")
        {
            string originalMessage = receipt?.Status?.Line ?? string.Empty;
            string friendlyMessage = ErrorMessageHelper.GetFriendlyMessage(originalMessage, language, this.languageManager);

            if (receipt?.Status != null)
            {
                receipt.Status.Line = friendlyMessage;
            }
            return new DepositsResponse
            {
                Error = receipt?.Status
            };
        }
        return receipt?.Data;
    }

    public async Task<PaymentReceipt?> MakeGuestPayment(PayerData payer, SoldToPayment soldTo, List<PaymentInvoice> documents, PaymentDetail paymentDetail, string country, CardinalData? cardinalData = null, string? guestUserEmail = null, string language = "en")
    {
        var request = new SapPaymentRequest();

        request.CurrencyDecimals = PaymetricHelper.GetCurrencyDecimal(documents.First().CurrencyKey);
        request.Custom = new ZCustom
        {
            HeaderText = "Guest User"
        };
        request.Payer = payer;
        request.SoldTo = soldTo;
        request.Documents = documents;

        paymentDetail.PaymentCardType = await this.ResolveSapCardType(paymentDetail.PaymentCardType, language);
        request.PaymentDetail = paymentDetail;


        if (cardinalData != null)
        {
            request.PaymentDetail.Cardinal = cardinalData;
        }

        var token = request.PaymentDetail?.PaymentCardToken;

        if (!IsEncryptedPaymentToken(token))
        {
            // If not encrypted, we treat it as raw token from proxy/iFrame
        }
        else if (!string.IsNullOrWhiteSpace(token))
        {
            request.PaymentDetail.PaymentCardToken =
                Encryption.Decrypt(token, this.applicationSecrets.EncryptionKey);
        }

        request.Log = new TraceLog
        {
            epayv = "v3",
            id = "POST_GUEST_INVOICE",
            login = request.Custom.HeaderText,
        };

        SapHttpStatus? policyError = await this.GetPaymentPolicyError(payer.CompanyCode, request.PaymentDetail.PaymentMethod, isDeposit: false, language);
        if (policyError != null)
        {
            return new PaymentReceipt { Error = policyError };
        }

        Clients.Models.SapHttpData<PaymentReceipt?> receipt = await this.sapHttpClient.Post<PaymentReceipt>("CNBS_PAYMENT_PATH", null, request, language, false);

        if (receipt?.Status?.MessageType == "E")
        {
            receipt.Status.Line = ErrorMessageHelper.GetFriendlyMessage(
                receipt.Status.Line ?? string.Empty,
                language,
                this.languageManager);

            return new PaymentReceipt
            {
                Documents = receipt.Data?.Documents ?? [],
                Error = receipt.Status
            };
        }

        EmailError? emailError = null;

        if (!string.IsNullOrEmpty(guestUserEmail))
        {
            var user = new User
            {
                FirstName = "guest",
                LastName = "user",
                Email = guestUserEmail
            };

            try
            {
                await this.mailer.SendReceipt(language, country, user, request);
            }
            catch (Exception)
            {
                emailError = new EmailError
                {
                    Code = "warning.email.sending",
                    Message = "There was an issue sending email. Please contact customer service."
                };
            }
        }

        return new PaymentReceipt
        {
            Documents = receipt?.Data?.Documents,
            EmailError = emailError
        };
    }

    public async Task<AutoPayEnrollmentResponse?> ManageAutoPay(User user, PayerData payer, bool isEnrolled, string paymentMethodType, string? paymentCardToken = null, string language = "en")
    {
        var request = new AutoPayEnrollmentRequest();
        request.PayerData = payer;
        request.Enrolled = isEnrolled;
        request.PaymentMethod = paymentMethodType;
        request.PaymentCardToken = paymentCardToken;
        request.Log = new TraceLog
        {
            epayv = "V3.2.4",
            id = "POST_AUTO_PAY_ENROLLMENT",
            login = user.Email,
        };

        Clients.Models.SapHttpData<AutoPayEnrollmentResponse?>? reciept = await this.sapHttpClient.Post<AutoPayEnrollmentResponse>("CNBS_PAYER_AUTO_PAY_PATH", null, request, language, false);

        if (reciept?.Data == null && reciept?.Status != null)
        {
            string sapHttpStatusString = JsonConvert.SerializeObject(reciept?.Status, Formatting.Indented);
            throw new Exception(sapHttpStatusString);
        }
        return reciept?.Data;
    }

    private string GetPhone(List<Phone>? phones)
    {
        // Return default phone number if the list is null or empty
        if (phones == null || phones.Count == 0)
        {
            return "+18593094411";
        }

        // If there is only one phone in the list, return its telephone number
        if (phones.Count == 1)
        {
            return phones[0].Telephone ?? "+18593094411"; // Return default if Telephone is null
        }

        // If there are multiple phones, return the one with Standard == "X" or default if none is found
        return phones.SingleOrDefault(x => x.Standard == "X")?.Telephone ?? "+18593094411";
    }

    private PaymentCardsResponse? NormalizeManagePaymentResponse(SapHttpData<PaymentCardsResponse?>? receipt)
    {
        if (receipt == null)
        {
            return null;
        }

        return new PaymentCardsResponse
        {
            PreAuth = receipt.Data?.PreAuth,
            Status = receipt.Data?.Status ?? this.MapStatus(receipt.Status)
        };
    }

    private WebAR.Service.Services.API.Models.Status? MapStatus(SapHttpStatus? status) =>
        status == null
            ? null
            : new WebAR.Service.Services.API.Models.Status
            {
                message_type = status.MessageType,
                message_identification = status.Identifiaction,
                message_number = status.Number,
                message_line_string = status.Line
            };

    private async Task<PayerDetail?> GetPayerDetails(ResolvedPayerContext context, string language)
    {
        Clients.Models.SapHttpData<PayerDetail?> data = await this.sapHttpClient.Get<PayerDetail>(
            "CNBS_PAYER_PATH",
            this.BuildPayerQueryParams(context),
            language);

        if (data.Data != null)
        {
            data.Data.IsAutoPayEnrolled = data.Data.PayerAutoPayStatus?.Any(x => x.Enrolled) ?? false;
        }

        return data?.Data;
    }

    private static string BuildCacheId(string? userId, params string?[] parts) =>
        string.Join("|", new[] { userId }
            .Concat(parts)
            .Where(part => !string.IsNullOrWhiteSpace(part))
            .Select(part => part!.Trim()));

    private Dictionary<string, string?> BuildPayerQueryParams(ResolvedPayerContext context) =>
        new()
        {
            { "customer_number", context.CustomerNumber },
            { "company_code", context.CompanyCode },
            { "sales_organization", context.SalesOrganization },
            { "distribution_channel", context.DistributionChannel },
            { "division", context.Division },
            { "cache_id", BuildCacheId(context.UserId, "Payer", context.CustomerNumber, context.CompanyCode, context.SalesOrganization, context.DistributionChannel, context.Division) },
        };

    private async Task<ResolvedPayerContext> ResolvePayerContext(User user, string selectedAccount, string payer, string language, string? notFoundMessage = null, string? companyCode = null)
    {
        string missingAccountMessage = notFoundMessage ?? "Payer account not found";
        List<Account>? linkedAccounts = user.Accounts;
        if (linkedAccounts == null || linkedAccounts.Count == 0)
        {
            linkedAccounts = await this.accountManager.GetAccountsByUser(user, language);
            user.Accounts = linkedAccounts;
        }

        if (user.PrimaryAccountType == "Payer")
        {
            Account? account = this.accountManager.FindLinkedAccount(linkedAccounts, payer, companyCode);
            if (account == null)
            {
                throw new Exception(missingAccountMessage);
            }

            return new ResolvedPayerContext(
                account.PrimaryAcct,
                account.CompanyCode,
                account.SalesOrganization,
                account.DistributionChannel,
                account.Division,
                user.UserId);
        }

        Account? selectedLinkedAccount = this.accountManager.FindLinkedAccount(linkedAccounts, selectedAccount, companyCode);
        if (selectedLinkedAccount == null)
        {
            throw new Exception(missingAccountMessage);
        }

        List<RelatedAccount>? relatedAccounts = await this.accountManager.GetRelatedAccounts(user, selectedLinkedAccount, language);
        RelatedAccount? relatedAccount = relatedAccounts?
            .FirstOrDefault(x => x.PrimaryAccount?.TrimStart('0') == payer.TrimStart('0'));
        if (relatedAccount == null)
        {
            throw new Exception(missingAccountMessage);
        }

        return new ResolvedPayerContext(
            relatedAccount.PrimaryAccount,
            relatedAccount.CompanyCode,
            relatedAccount.SalesOrganization,
            relatedAccount.DistributionChannel,
            relatedAccount.Division,
            user.UserId);
    }

    private sealed record ResolvedPayerContext(
        string? CustomerNumber,
        string? CompanyCode,
        string? SalesOrganization,
        string? DistributionChannel,
        string? Division,
        string? UserId = null);

}
