import { Navigate, Outlet, Route, Routes } from 'react-router';

import IfLoggedIn from 'routing/IfLoggedIn';
import IfNotAdmin from 'routing/IfNotAdmin';
import IfNotLoggedIn from 'routing/IfNotLoggedIn';
import RequireNoMaintenance from 'routing/RequireNoMaintenance';
import * as lazy from 'routing/lazyLoadedComponents';

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Outlet />}>
        {/* App Login */}
        <Route element={<IfLoggedIn redirectTo="/home" />}>
          <Route index element={<lazy.LoginPage />} />
        </Route>

        {/* Admin Maintenance Login */}
        <Route path="login/admin" element={<lazy.LoginPage />} />

        {/* Public Routes - HomeStack.
            Guarded centrally so direct-URL access is blocked during
            maintenance (Create Account, Forgot Password, Guest Payment, etc.). */}
        <Route element={<RequireNoMaintenance />}>
          <Route element={<lazy.HomeStack />}>
            <Route
              path="forgotpassword"
              element={<lazy.ForgotPasswordPage />}
            />
            <Route path="reset-password" element={<lazy.ResetPasswordPage />} />
            <Route
              path="reset-password/:id"
              element={<lazy.CreateNewPasswordPage />}
            />
            <Route
              path="register/:id"
              element={<lazy.CreateNewPasswordPage />}
            />
            <Route path="admin/recovery" element={<lazy.AdminRecoveryPage />} />
            <Route
              path="success-confirmation/success"
              element={<lazy.SuccessConfirmationPage />}
            />
            <Route
              path="reset-password-confirmation"
              element={<lazy.ResetPasswordConfirmation />}
            />
            <Route
              path="guestdetails"
              element={<lazy.GuestPaymentPageComponent />}
            />
            <Route
              path="payment/guest"
              element={<lazy.GuestPaymentComponent />}
            />
            <Route
              path="payment/guest/receipt"
              element={<lazy.GuestPaymentStatusPage />}
            />
            <Route
              path="auto-registration/accounts"
              element={<lazy.AddAccountPage page="account" />}
            />
            <Route
              path="auto-registration/create"
              element={<lazy.CreateAccountPage />}
            />

            <Route
              path="auto-register/waiting-confirmation"
              element={<lazy.AutoRegisterConfirmPage />}
            />
            <Route
              path="auto-register/confirm/:token"
              element={<lazy.AutoRegisterConfirmPage />}
            />
            <Route
              path="confirm-email-change/:token"
              element={<lazy.ConfirmEmailChangePage />}
            />
          </Route>
        </Route>

        {/* Protected Routes - AppStack */}
        <Route element={<IfNotLoggedIn redirectTo="/" />}>
          <Route element={<lazy.AppStack />}>
            <Route path="home" element={<lazy.InvoicesPage />} />
            <Route path="history" element={<lazy.HistoryPage />} />

            <Route path="payment/deposits" element={<lazy.DepositsPage />} />
            <Route
              path="payment/deposits/processing-payment"
              element={<lazy.ProcessingDepositPage />}
            />
            <Route
              path="payment/processing-payment"
              element={<lazy.ProcessingPaymentPage />}
            />
            <Route path="payment/session" element={<lazy.PaymentPage />} />
            <Route
              path="payment/session/receipt"
              element={<lazy.InvoicesPaymentReceipt />}
            />
            <Route
              path="payment/deposits/receipt"
              element={<lazy.PaymentReceiptPage />}
            />
            <Route path="payments" element={<lazy.PaymentHistoryPage />} />

            <Route
              path="scheduleddetails"
              element={<lazy.ScheduledPayments />}
            />
            <Route
              path="payment/scheduled"
              element={<lazy.SchedulePayment />}
            />

            <Route path="settings">
              <Route index element={<lazy.ResetPasswordPage />} />
              <Route path="user" element={<lazy.ResetPasswordPage />} />
              <Route path="users">
                <Route index element={<lazy.ManageUsersPage />} />
                <Route path="add" element={<lazy.AddEditUserPage />} />
                <Route path="edit" element={<lazy.AddEditUserPage />} />
              </Route>
              <Route
                path="payment-methods"
                element={<lazy.ManagePaymentMethodsPage />}
              />
            </Route>

            <Route path="configuration">
              <Route index element={<lazy.ConfigurationPage />} />
              <Route path="application" element={<lazy.ApplicationPage />} />
              <Route path="theme" element={<lazy.ThemeConfigurationPage />} />
              <Route path="email" element={<lazy.EmailConfigurationPage />} />
              <Route path="maintenance" element={<lazy.MaintenancePage />} />
            </Route>
          </Route>
        </Route>

        {/* Service Unavailable — public, no header/drawer */}
        <Route
          path="maintenance/unavailable"
          element={<lazy.ServiceUnavailablePage />}
        />

        {/* Protected Maintenance Routes - MaintenanceStack */}
        <Route element={<IfNotLoggedIn redirectTo="/login/admin" />}>
          <Route element={<IfNotAdmin redirectTo="/home" />}>
            <Route element={<lazy.MaintenanceStack />}>
              <Route
                path="admin/maintenance"
                element={<lazy.MaintenancePage />}
              />
            </Route>
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

const AppRouter = () => {
  return <AppRoutes />;
};

export default AppRouter;
