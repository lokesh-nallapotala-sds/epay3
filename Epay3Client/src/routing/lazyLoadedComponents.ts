import { lazy } from 'react';

export const AppStack = lazy(() => import('components/layouts/AppStack'));
export const HomeStack = lazy(() => import('components/layouts/HomeStack'));
export const MaintenanceStack = lazy(
  () => import('components/layouts/MaintenanceStack'),
);

export const LoginPage = lazy(() => import('components/login/LoginPage'));
export const HistoryPage = lazy(() => import('components/history/HistoryPage'));
export const DepositsPage = lazy(
  () => import('components/deposits/DepositsWithRequiredDepositEnabled'),
);
export const InvoicesPage = lazy(
  () => import('components/invoices/InvoicesPage'),
);
export const ThemeConfigurationPage = lazy(
  () => import('components/settings/configuration/ThemeConfigurationPage'),
);
export const PaymentReceiptPage = lazy(
  () => import('components/payment/PaymentReceipt'),
);
export const PaymentHistoryPage = lazy(
  () => import('components/payments/PaymentHistory'),
);
export const ScheduledPayments = lazy(
  () => import('components/scheduledPayments/ScheduledPayments'),
);
export const SchedulePayment = lazy(
  () => import('../components/scheduledPayments/SchedulePayment'),
);
export const PaymentPage = lazy(
  () => import('components/payment/PaymentComponent'),
);
export const ForgotPasswordPage = lazy(
  () => import('components/settings/users/ForgotPassword'),
);
export const AddAccountPage = lazy(
  () => import('components/settings/users/AddAccountPage'),
);
export const ResetPasswordPage = lazy(
  () => import('components/settings/ResetPasswordPage'),
);
export const ResetPasswordConfirmation = lazy(
  () => import('components/settings/users/ResetPasswordConfirmation'),
);
export const ManageUsersPage = lazy(
  () => import('components/settings/users/ManageUsersPage'),
);
export const AddEditUserPage = lazy(
  () => import('components/settings/users/AddEditUserPage'),
);
export const AdminRecoveryPage = lazy(
  () => import('components/adminRecovery/AdminRecoveryPage'),
);
export const MaintenancePage = lazy(
  () => import('components/settings/configuration/MaintenancePage'),
);
export const CreateAccountPage = lazy(
  () => import('components/settings/users/CreateAccountPage'),
);
export const CreateNewPasswordPage = lazy(
  () => import('components/settings/users/CreateNewPassword'),
);
export const ApplicationPage = lazy(
  () => import('components/settings/configuration/ApplicationPage'),
);
export const ProcessingPaymentPage = lazy(
  () => import('components/payment/ProcessingPaymentPage'),
);
export const ProcessingDepositPage = lazy(
  () => import('components/deposits/ProcessingDepositPage'),
);
export const InvoicesPaymentReceipt = lazy(
  () => import('components/payment/InvoicesPaymentReceipt'),
);
export const SuccessConfirmationPage = lazy(
  () => import('components/settings/users/SuccessConfirmation'),
);
export const ConfigurationPage = lazy(
  () => import('components/settings/configuration/ConfigurationPage'),
);
export const GuestPaymentStatusPage = lazy(
  () => import('components/settings/guestpayment/GuestPaymentStatus'),
);
export const EmailConfigurationPage = lazy(
  () => import('components/settings/configuration/EmailConfigurationPage'),
);
export const GuestPaymentComponent = lazy(
  () => import('components/settings/guestpayment/GuestPaymentComponent'),
);
export const GuestPaymentPageComponent = lazy(
  () => import('components/settings/guestpayment/GuestPaymentPageComponent'),
);
export const ManagePaymentMethodsPage = lazy(
  () => import('components/settings/payment/ManagePaymentMethodsPage'),
);
export const AutoRegisterConfirmPage = lazy(
  () => import('components/settings/users/AutoRegisterConfirm'),
);
export const ConfirmEmailChangePage = lazy(
  () => import('components/settings/users/ConfirmEmailChange'),
);
export const WaitingConfirmation = lazy(
  () => import('components/settings/users/WaitingConfirmation'),
);
export const ServiceUnavailablePage = lazy(
  () => import('components/maintenance/ServiceUnavailablePage'),
);
