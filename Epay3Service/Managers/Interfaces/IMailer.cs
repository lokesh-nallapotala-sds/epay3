using Epay3Service.Models;
using MimeKit;

namespace Epay3Service.Managers.Interfaces;

public interface IMailer
{
    public Task SendInviteEmail(string language, string firstName, MailboxAddress toEmail, string userInviteId, string country);
    public Task SendResetPasswordEmail(string language, string firstName, MailboxAddress to, string resetId, string country);

    public Task SendRegistrationNotificationToRequestor(string language, MailboxAddress to,
        string requestId);

    public Task SendRegistrationConfirmation(string language, string firstName, MailboxAddress to, string confirmationToken, string country);

    public Task SendEmailChangeVerification(string language, string firstName, MailboxAddress to, string token, string country);

    public Task SendPasswordChangedEmail(string language, string firstName, MailboxAddress to, string resetId, string country);
    public Task SendAdminRecoveryInformationEmail(string action, string username, string status, string details);
    public Task SendReceipt(string language, string country, User user,
      SapPaymentRequest paymentsRequest);


    public Task SendRegistrationNotificationToAdmin(string language, RegistrationRequest request);
}
