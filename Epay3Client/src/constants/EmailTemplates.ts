export const EmailTemplates: { key: string; value: string }[] = [
  { key: 'welcome_email_content', value: 'Welcome Email' },
  { key: 'confirmation_email_content', value: 'Confirmation Email' },
  {
    key: 'email_change_verification_content',
    value: 'Email Change Verification',
  },
  { key: 'reset_password_email_content', value: 'Password Reset Email' },
  { key: 'password_changed_email_content', value: 'Password Changed Email' },
  { key: 'invoice_receipt_content', value: 'Payment Confirmation Email' },
  {
    key: 'guest_invoice_receipt_content',
    value: 'Guest Payment Confirmation Email',
  },
];

export const TitleMap: Record<string, string> = {
  welcome_email_content: 'Welcome to ChronarPay',
  confirmation_email_content: 'Welcome to ePAY',
  email_change_verification_content: 'Confirm Your New Email Address',
  reset_password_email_content: 'Reset Your Password',
  password_changed_email_content: 'Your Password Was Changed',
  invoice_receipt_content: 'Payment Receipt',
  guest_invoice_receipt_content: 'Payment Confirmation',
};
