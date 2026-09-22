using Epay3Service.Extensions;
using Epay3Service.Managers.Interfaces;
using Epay3Service.Models;
using MailKit.Net.Smtp;
using Microsoft.Extensions.Logging;
using MimeKit;
using System.Globalization;
using System.Net;

namespace Epay3Service.Managers;

public class SmtpMailer(
    ISystemConfigService configService,
    ILogger<SmtpMailer> logger,
    ILocalization localizerService
    ) : IMailer
{
    private readonly ISystemConfigService configService = configService;
    private readonly ILogger<SmtpMailer> logger = logger;
    private readonly ILocalization localizerService = localizerService;

    public async Task SendInviteEmail(string language, string firstName, MailboxAddress toEmail, string userInviteId, string country)
    {
        EmailTemplate template = await this.GetEmailTemplate(language, "welcome_email_content");
        if (this.IsValidTemplate(template))
        {
            SystemConfiguration config = await this.configService.GetConfig();
            var htmlBody = EmailBuilder.BuildWelcomeEmail(template.Email, firstName, new CultureInfo(language), userInviteId,
                config.applicationUrl, config, language, country);
            this.SendEmail(new List<MailboxAddress> { toEmail }, template.Title, htmlBody);
        }
    }

    public async Task SendResetPasswordEmail(string language, string firstName, MailboxAddress to, string resetId, string country)
    {
        EmailTemplate template = await this.GetEmailTemplate(language, "reset_password_email_content");
        if (this.IsValidTemplate(template))
        {
            SystemConfiguration config = await this.configService.GetConfig();
            var htmlBody =
                EmailBuilder.BuildResetPasswordEmail(template.Email, firstName, new CultureInfo(language), resetId,
                    config.applicationUrl, config, language, country);
            this.SendEmail(new List<MailboxAddress> { to }, template.Title, htmlBody);
        }
    }

    public async Task SendPasswordChangedEmail(string language, string firstName, MailboxAddress to, string resetId, string country)
    {
        EmailTemplate template = await this.GetEmailTemplate(language, "password_changed_email_content");
        if (this.IsValidTemplate(template))
        {
            SystemConfiguration config = await this.configService.GetConfig();
            var htmlBody =
                EmailBuilder.BuildPasswordChangedEmail(template.Email, firstName, new CultureInfo(language), resetId,
                    config.applicationUrl, config, language, country);
            this.SendEmail(new List<MailboxAddress> { to }, template.Title, htmlBody);
        }
    }

    public async Task SendAdminRecoveryInformationEmail(string action, string username, string status, string details)
    {
        SystemConfiguration config = await this.configService.GetConfig();
        if (string.IsNullOrWhiteSpace(config.SecurityEmail) && string.IsNullOrWhiteSpace(config.OverrideEmail))
        {
            this.logger.LogWarning("Admin recovery notification email skipped because either SecurityEmail or OverrideEmail is not configured.");
            return;
        }

        string safeAction = WebUtility.HtmlEncode(action);
        string safeUsername = WebUtility.HtmlEncode(username);
        string safeStatus = WebUtility.HtmlEncode(status);
        string safeDetails = WebUtility.HtmlEncode(details).Replace("\r\n", "<br/>").Replace("\n", "<br/>");
        string timestamp = DateTime.UtcNow.ToString("u");
        string subject = $"Admin recovery activity: {action} ({status})";
        string htmlBody =
            $"<p>An admin recovery endpoint was invoked.</p>" +
            $"<p><strong>Action:</strong> {safeAction}<br/>" +
            $"<strong>Username:</strong> {safeUsername}<br/>" +
            $"<strong>Status:</strong> {safeStatus}<br/>" +
            $"<strong>Timestamp (UTC):</strong> {timestamp}</p>" +
            $"<p><strong>Details:</strong><br/>{safeDetails}</p>";

        this.SendEmail(
            new List<MailboxAddress> { new("Security Email", config.SecurityEmail) },
            subject,
            htmlBody);
    }

    public async Task SendRegistrationNotificationToAdmin(string language,
        RegistrationRequest request)
    {
        EmailTemplate template = await this.GetEmailTemplate(language, "registration_request_email_content");
        if (this.IsValidTemplate(template))
        {
            SystemConfiguration config = await this.configService.GetConfig();
            var to = new MailboxAddress("WebAR Admin", config.RegistrationRequestEmail);
            var htmlBody =
                EmailBuilder.BuildRegistrationRequestEmail(template.Email, new CultureInfo(language), request,
                    config.applicationUrl);
            this.SendEmail(new List<MailboxAddress> { to }, template.Title, htmlBody);
        }
    }

    public async Task SendRegistrationNotificationToRequestor(string language, MailboxAddress to,
        string requestId)
    {
        EmailTemplate template = await this.GetEmailTemplate(language, "registration_requestor_email_content");
        if (this.IsValidTemplate(template))
        {
            var htmlBody =
                EmailBuilder.BuildRegistrationRequestorEmail(template.Email, new CultureInfo(language), requestId);
            this.SendEmail(new List<MailboxAddress> { to }, template.Title, htmlBody);
        }
    }

    public async Task SendRegistrationConfirmation(string language, string firstName, MailboxAddress to,
        string confirmationToken, string country)
    {
        EmailTemplate template = await this.GetEmailTemplate(language, "confirmation_email_content");

        if (this.IsValidTemplate(template))
        {

            SystemConfiguration config = await this.configService.GetConfig();
            var htmlBody =
                EmailBuilder.BuildConfirmationEmail(template.Email, firstName, new CultureInfo(language),
                    config.applicationUrl, confirmationToken, config, language, country);
            this.SendEmail(new List<MailboxAddress> { to }, template.Title, htmlBody);
        }
    }

    public async Task SendEmailChangeVerification(string language, string firstName, MailboxAddress to,
        string token, string country)
    {
        EmailTemplate template = await this.GetEmailTemplate(language, "email_change_verification_content");

        if (this.IsValidTemplate(template))
        {
            SystemConfiguration config = await this.configService.GetConfig();
            var htmlBody =
                EmailBuilder.BuildEmailChangeEmail(template.Email, firstName, new CultureInfo(language),
                    config.applicationUrl, token, config, language, country);
            this.SendEmail(new List<MailboxAddress> { to }, template.Title, htmlBody);
        }
        else
        {
            throw new Exception("Email template missing");
        }
    }

    public async Task SendReceipt(string language, string country, User user,
        SapPaymentRequest paymentsRequest)
    {
        string templateKey = user.FirstName?.Equals("guest", StringComparison.OrdinalIgnoreCase) == true
            ? "guest_invoice_receipt_content"
            : "invoice_receipt_content";

        EmailTemplate template = await this.GetEmailTemplate(language, templateKey);

        if (this.IsValidTemplate(template))
        {
            Localizer localizer = this.localizerService.GetLocalizer(language, country);
            SystemConfiguration config = await this.configService.GetConfig();
            var to = new MailboxAddress(user.FirstName + " " + user.LastName, user.Email);
            var htmlBody = EmailBuilder.BuildReceiptEmail(template.Email, localizer, new CultureInfo(language), user,
                paymentsRequest,
                 config, language, country);
            this.SendEmail(new List<MailboxAddress> { to }, template.Title, htmlBody);
        }
        else
        {
            throw new Exception($"Email template missing");
        }
    }

    private bool IsValidTemplate(EmailTemplate template) => template != null && !String.IsNullOrEmpty(template.Email);

    private async Task<EmailTemplate> GetEmailTemplate(string languageKey, string templateKey)
    {
        EmailConfig emailConfig = await this.configService.GetEmailTemplates(templateKey);
        var languageTemplateExists = emailConfig.Templates.ContainsKey(languageKey);
        EmailTemplate template = languageTemplateExists ? emailConfig.Templates[languageKey] : emailConfig.Templates["en"];
        return template;
    }

    private async Task<SmtpClient> GetClient()
    {
        var client = new SmtpClient();
        SystemConfiguration config = await this.configService.GetConfig();
        client.ServerCertificateValidationCallback = (s, c, h, e) => true;
        client.Connect(config.SmtpAddress, int.Parse(config.SmtpPort));
        if (config.SmtpUseUser)
        {
            client.Authenticate(
                config.SmtpUser, config.SmtpPassword
            );
            // SimpleEncrypt.DecryptString(config.SmtpPassword, _config.GetValue("EncryptionKey", ""))
        }

        return client;
    }

    private string FromEmail(SystemConfiguration config) => config.FromAddress;

    private string FromEmailName(SystemConfiguration config) => config.FromAddressName.IsNotNullOrEmpty() ? config.FromAddressName : "CNBS Software";

    private string GetOverrideEmail(SystemConfiguration config) => config.OverrideEmail;


    private void SendEmail(List<MailboxAddress> to, string subject, string htmlBody) => new Thread(async () =>
    {
        Thread.CurrentThread.IsBackground = true;
        try
        {
            SmtpClient client = await this.GetClient();
            SystemConfiguration config = await this.configService.GetConfig();
            var overrideEmail = this.GetOverrideEmail(config);
            var message = new MimeMessage();
            message.From.Add(new MailboxAddress(this.FromEmailName(config), this.FromEmail(config)));
            if (!string.IsNullOrEmpty(overrideEmail))
            {
                message.To.Add(InternetAddress.Parse(overrideEmail));
            }
            else
            {
                message.To.AddRange(to);
            }

            var bodyBuilder = new BodyBuilder
            {
                HtmlBody = htmlBody
            };
            message.Body = bodyBuilder.ToMessageBody();
            message.Subject = subject;

            client.Send(message);
            client.Disconnect(true);
        }
        catch (Exception e)
        {
            this.logger.LogError(e.Message);
        }
    }).Start();
}
