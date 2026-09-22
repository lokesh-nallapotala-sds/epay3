export interface SmtpConfig {
  smtpAddress: string;
  smtpPassword: string;
  smtpPort: string;
  smtpUseUser: boolean;
  smtpUser: string;
  fromAddress: string;
  fromAddressName: string;
  mailBody: string;
  mailSubject: string;
  registrationRequestEmail: string;
  testEmail: string;
  applicationUrl: string;
  companyName: string;
}
