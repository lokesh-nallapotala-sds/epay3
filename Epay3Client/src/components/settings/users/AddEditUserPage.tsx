import { Box } from '@mui/system';
import Grid from '@mui/material/Grid';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';

import DeleteConfirmModal from './DeleteConfirmModal';
import AddEditUserLinkedAccountDialog from './AddEditUserLinkedAccountDialog';
import UserDetailsForm from './UserDetailsForm';
import { buildAccountColumns } from './addEditUser/accountColumns';
import { useUserAccountManagement } from './addEditUser/useUserAccountManagement';
import LinkedAccountsSection from './addEditUser/LinkedAccountsSection';
import UserRole from 'types/UserRole';

function AddEditUserPage() {
  const theme = useTheme();
  const lgUp = useMediaQuery(theme.breakpoints.up('lg'));

  const {
    f,
    user,
    userId,
    canManageLinkedAccounts,
    login,
    loginError,
    handleLoginChange,
    firstName,
    firstNameError,
    handleFirstNameChange,
    lastName,
    lastNameError,
    handleLastNameChange,
    email,
    emailError,
    handleEmailChange,
    company,
    companyError,
    handleCompanyChange,
    status,
    statusError,
    handleStatusChange,
    accountType,
    accountTypeError,
    handleAccountTypeChange,
    role,
    roleError,
    handleRoleChange,
    editingPassword,
    handleEditingPasswordChange,
    password,
    passwordError,
    handlePasswordChange,
    passwordVisible,
    handlePasswordVisibilityClick,
    handlePasswordVisibilityMouseDown,
    statuses,
    roles,
    accountTypes,
    handleUserSubmit,
    handleUserCancel,
    accounts,
    selectedAccount,
    isAccountDialogOpen,
    linkedAccountCompanyCodes,
    linkedAccountSalesOrgCodes,
    handleAddAccountClick,
    closeLinkedAccountEditor,
    handleAccountClick,
    handleAccountCardSelect,
    handleDeleteAccount,
    handleAccountSaved,
    modalOpen,
    handleDeleteClose,
    handleOk,
  } = useUserAccountManagement();

  const accountColumnDefs = buildAccountColumns({
    f,
    canManageLinkedAccounts,
    handleSelectAccount: handleAccountClick,
    handleDeleteAccount,
  });

  return (
    <Box
      display="flex"
      width="100%"
      justifyContent={lgUp ? 'flex-start' : 'center'}
      marginY="1rem"
    >
      <Grid container direction="column" rowGap="1.5rem" minWidth={0}>
        <Grid item>
          <Typography variant="h1">
            {userId ? f('user.action.edit') : f('user.action.add')}
          </Typography>
        </Grid>

        <Grid item minWidth={0}>
          <UserDetailsForm
            userId={userId}
            login={login}
            loginError={loginError}
            onLoginChange={handleLoginChange}
            firstName={firstName}
            firstNameError={firstNameError}
            onFirstNameChange={handleFirstNameChange}
            lastName={lastName}
            lastNameError={lastNameError}
            onLastNameChange={handleLastNameChange}
            email={email}
            emailError={emailError}
            onEmailChange={handleEmailChange}
            company={company}
            companyError={companyError}
            onCompanyChange={handleCompanyChange}
            status={status}
            statusError={statusError}
            onStatusChange={handleStatusChange}
            accountType={accountType}
            accountTypeError={accountTypeError}
            onAccountTypeChange={handleAccountTypeChange}
            role={role}
            roleError={roleError}
            onRoleChange={handleRoleChange}
            roleFieldDisabled={UserRole.isManager(user?.role)}
            editingPassword={editingPassword}
            onEditingPasswordChange={handleEditingPasswordChange}
            password={password}
            passwordError={passwordError}
            onPasswordChange={handlePasswordChange}
            passwordVisible={passwordVisible}
            onPasswordVisibilityClick={handlePasswordVisibilityClick}
            onPasswordVisibilityMouseDown={handlePasswordVisibilityMouseDown}
            statuses={statuses}
            roles={roles}
            accountTypes={accountTypes}
            onSave={handleUserSubmit}
            onCancel={handleUserCancel}
          />
        </Grid>

        <LinkedAccountsSection
          f={f}
          userId={userId}
          accounts={accounts}
          accountColumnDefs={accountColumnDefs}
          canManageLinkedAccounts={canManageLinkedAccounts}
          onAddAccountClick={handleAddAccountClick}
          onAccountCardSelect={handleAccountCardSelect}
          onDeleteAccount={handleDeleteAccount}
        />
      </Grid>

      <AddEditUserLinkedAccountDialog
        selectedAccount={selectedAccount}
        companyCodes={linkedAccountCompanyCodes}
        salesOrgCodes={linkedAccountSalesOrgCodes}
        isOpen={isAccountDialogOpen}
        onClose={closeLinkedAccountEditor}
        onAccountSaved={handleAccountSaved}
      />
      <DeleteConfirmModal
        open={modalOpen}
        onClose={handleDeleteClose}
        onOk={handleOk}
        message={f('user_account.confirm_delete_card_message')}
      />
    </Box>
  );
}

export default AddEditUserPage;
