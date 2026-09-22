import { ChangeEvent, useState } from 'react';

import { useIntl } from 'react-intl';
import { useSearchParams } from 'react-router';

import EpayBox from 'shared/components/EpayBox';
import useEpayNavigate from 'hooks/useEpayNavigate';
import { EpayAdminService } from 'services/EpayAdminService';
import { useEpayToast } from 'providers/EpayToastProvider';
import { Button, Grid, MenuItem, TextField, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { getCompactFilterFieldSx } from 'shared/components/compactFilterFieldStyles';

import { validatePassword } from 'utilities/utilities';

type AdminRecoveryFormProps = {
  adminAccessKey: string;
};

function AdminRecoveryNotFound() {
  return (
    <div
      style={{
        fontFamily: 'sans-serif',
        textAlign: 'center',
        padding: '4rem',
      }}
    >
      <h1>404</h1>
      <p>Not Found</p>
    </div>
  );
}

function AdminRecoveryForm({ adminAccessKey }: AdminRecoveryFormProps) {
  const { navigate } = useEpayNavigate();
  const theme = useTheme();
  const intl = useIntl();
  const f = (id) => intl.formatMessage({ id: id });
  const PostAdminRecovery = EpayAdminService.usePostAdminRecovery();
  const StartAdminRecovery = EpayAdminService.useStartAdminRecovery();
  const { showToastMessage } = useEpayToast();

  // fields
  const [recoveryKey, setRecoveryKey] = useState('');
  const [recoveryKeyError, setRecoveryKeyError] = useState('');

  const [user, setUser] = useState('');
  const [userError, setUserError] = useState('');

  const [firstName, setFirstName] = useState('');
  const [firstNameError, setFirstNameError] = useState('');

  const [lastName, setLastName] = useState('');
  const [lastNameError, setLastNameError] = useState('');

  const [company, setCompany] = useState('');
  const [companyError, setCompanyError] = useState('');

  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');

  const [primaryAccountType, setPrimaryAccountType] = useState('Payer');

  const [userRole, setUserRole] = useState('User');

  const [newPassword, setNewPassword] = useState('');
  const [newPasswordError, setNewPasswordError] = useState('');

  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [confirmNewPasswordError, setConfirmNewPasswordError] = useState('');

  const [selectedRecoveryMode, setSelectedRecoveryMode] = useState('Recovery');

  const [isCreate, setIsCreate] = useState(false);

  const changeRecoveryMode = (event) => {
    setSelectedRecoveryMode(event.target.value);
    if (event.target.value.toLowerCase() == 'create') {
      setIsCreate(true);
    } else {
      setIsCreate(false);
      setNewPassword('');
      setConfirmNewPassword('');
      setNewPasswordError('');
      setConfirmNewPasswordError('');
    }
  };

  const changeAccountType = (event) => {
    setPrimaryAccountType(event.target.value);
  };

  const changeUserRole = (event) => {
    setUserRole(event.target.value);
  };

  const recoveryModeData = [
    { recoveryName: 'Create' },
    { recoveryName: 'Recovery' },
  ];

  const userRoleData = [
    { name: 'Admin' },
    { name: 'Manager' },
    { name: 'Internal' },
    { name: 'User' },
  ];

  const accountTypeData = [{ name: 'Payer' }, { name: 'Sold To' }];
  const PASSWORD_LENGTH_MIN = 8;

  function handleRecoveryKeyChange(e: ChangeEvent<HTMLInputElement>): void {
    const s = e.currentTarget.value;
    setRecoveryKey(s);
    if (s.length > 0) setRecoveryKeyError('');
  }

  function handleUserChange(e: ChangeEvent<HTMLInputElement>): void {
    const s = e.currentTarget.value;
    setUser(s);
    if (s.length > 0) setUserError('');
  }

  function handleFirstNameChange(e: ChangeEvent<HTMLInputElement>): void {
    const s = e.currentTarget.value;
    setFirstName(s);
    if (s.length > 0) setFirstNameError('');
  }

  function handleLastNameChange(e: ChangeEvent<HTMLInputElement>): void {
    const s = e.currentTarget.value;
    setLastName(s);
    if (s.length > 0) setLastNameError('');
  }

  function handleCompanyChange(e: ChangeEvent<HTMLInputElement>): void {
    const s = e.currentTarget.value;
    setCompany(s);
    if (s.length > 0) setCompanyError('');
  }

  function handleEmailChange(e: ChangeEvent<HTMLInputElement>): void {
    const s = e.currentTarget.value;
    setEmail(s);
    if (s.length > 0) setEmailError('');
  }

  function handleNewPasswordChange(e: ChangeEvent<HTMLInputElement>): void {
    const s = e.currentTarget.value;
    setNewPassword(s);
    if (s.length > 0) setNewPasswordError('');
  }

  function handleConfirmNewPasswordChange(
    e: ChangeEvent<HTMLInputElement>,
  ): void {
    const s = e.currentTarget.value;
    setConfirmNewPassword(s);
    if (s.length > 0) setConfirmNewPasswordError('');
  }

  function handleSubmit(e) {
    e.preventDefault();
    const mode = selectedRecoveryMode.toLowerCase() == 'create' ? 'C' : 'R';
    const res = /^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/;

    let hasError = false;
    if (mode === 'C') {
      if (firstName.trim().length === 0) {
        setFirstNameError(f('admin.firstname.error'));
        hasError = true;
      }

      if (lastName.trim().length === 0) {
        setLastNameError(f('admin.lastname.error'));
        hasError = true;
      }

      if (company.trim().length === 0) {
        setCompanyError(f('admin.company.error'));
        hasError = true;
      }

      if (email.trim().length === 0) {
        setEmailError(f('admin.email.error'));
        hasError = true;
      } else if (!res.test(email.toLowerCase())) {
        setEmailError(f('admin.recovery.invalidemail'));
        hasError = true;
      }
    }
    if (recoveryKey.trim().length === 0) {
      setRecoveryKeyError(f('admin.recoverykey.error'));
      hasError = true;
    }
    if (user.trim().length === 0) {
      setUserError(f('admin.user.error'));
      hasError = true;
    }

    if (mode === 'C') {
      if (newPassword.trim().length === 0) {
        setNewPasswordError(f('admin.newpassword.error'));
        hasError = true;
      } else if (!validatePassword(newPassword)) {
        setNewPasswordError(
          f('user.password.invalid.message').replace(
            '{minLength}',
            PASSWORD_LENGTH_MIN.toString(),
          ),
        );
        hasError = true;
      }

      if (confirmNewPassword.trim().length === 0) {
        setConfirmNewPasswordError(f('admin.confirmnewpassword.error'));
        hasError = true;
      } else if (newPassword !== confirmNewPassword) {
        setConfirmNewPasswordError(
          f('settings.account.update_password.new_password_mismatch'),
        );
        hasError = true;
      }
    }

    if (hasError) return;

    if (mode === 'R') {
      StartAdminRecovery(adminAccessKey, recoveryKey, user)
        .then((resp) => {
          navigate(`/reset-password/${encodeURIComponent(resp.resetToken)}`);
        })
        .catch((err) => {
          const errMsg = (err.message as string)?.replace('\n', '; ');
          showToastMessage('error', errMsg);
        });
      return;
    }

    PostAdminRecovery(
      adminAccessKey,
      recoveryKey,
      user,
      mode,
      newPassword,
      firstName,
      lastName,
      company,
      email,
      primaryAccountType,
      userRole?.toLowerCase(),
    )
      .then(() => {
        navigate('/success-confirmation/success', {
          state: { page: 'recoverysuccess' },
        });
      })
      .catch((err) => {
        const errMsg = (err.message as string)?.replace('\n', '; '); //is it possible to force line breaks?
        showToastMessage('error', errMsg);
      });
  }

  return (
    <Grid container direction="column" sm={12} md={6} lg={6}>
      <EpayBox sx={{ padding: '0px' }}>
        <Grid
          item
          sx={{
            borderBottom: '1px solid',
            borderBottomColor: '#E0E0E0',
            padding: '20px',
          }}
        >
          <Typography variant="h5" align="left">
            {f('admin.header')}
          </Typography>
        </Grid>

        <Grid
          item
          container
          direction="column"
          rowGap="1.25rem"
          sx={{ padding: '20px' }}
        >
          <Grid item container direction={'column'} spacing={0.5}>
            <Grid item>
              <Typography
                variant="body2"
                fontWeight="500"
                sx={{
                  '&::after': {
                    content: '" *"',
                    color: 'red',
                    marginTop: '4px',
                  },
                }}
              >
                {f('admin.recoverymode')}
              </Typography>
            </Grid>
            <Grid item>
              <TextField
                select
                onChange={changeRecoveryMode}
                fullWidth
                value={selectedRecoveryMode}
                sx={(muiTheme) => ({
                  ...getCompactFilterFieldSx(muiTheme),
                })}
              >
                {recoveryModeData.length != 0 ? (
                  recoveryModeData.map((option) => (
                    <MenuItem
                      key={option.recoveryName}
                      value={option.recoveryName}
                    >
                      {option.recoveryName}
                    </MenuItem>
                  ))
                ) : (
                  <MenuItem key={''}>{''}</MenuItem>
                )}
              </TextField>
            </Grid>
          </Grid>

          <Grid item container direction={'row'} spacing={10}>
            <Grid item container direction={'column'} sm={6} md={6} lg={6}>
              <Grid item>
                <Typography
                  variant="body2"
                  fontWeight="500"
                  sx={{
                    '&::after': {
                      content: '" *"',
                      color: 'red',
                      marginTop: '4px',
                    },
                  }}
                >
                  {f('admin.recoverykey')}
                </Typography>
              </Grid>
              <Grid item>
                <TextField
                  type="text"
                  fullWidth
                  value={recoveryKey}
                  onChange={handleRecoveryKeyChange}
                  error={!!recoveryKeyError}
                  helperText={recoveryKeyError}
                  sx={(muiTheme) => ({
                    ...getCompactFilterFieldSx(muiTheme),
                  })}
                />
              </Grid>
            </Grid>
            <Grid item container direction={'column'} sm={6} md={6} lg={6}>
              <Grid item>
                <Typography
                  variant="body2"
                  fontWeight="500"
                  sx={{
                    '&::after': {
                      content: '" *"',
                      color: 'red',
                      marginTop: '4px',
                    },
                  }}
                >
                  {f('admin.user')}
                </Typography>
              </Grid>
              <Grid item>
                <TextField
                  type="text"
                  fullWidth
                  value={user}
                  onChange={handleUserChange}
                  error={!!userError}
                  helperText={userError}
                  sx={(muiTheme) => ({
                    ...getCompactFilterFieldSx(muiTheme),
                  })}
                />
              </Grid>
            </Grid>
          </Grid>
          {/*Row*/}
          <Grid
            item
            container
            direction={'row'}
            spacing={10}
            display={isCreate ? 'flex' : 'none'}
          >
            <Grid item container direction={'column'} sm={6} md={6} lg={6}>
              <Grid item>
                <Typography
                  variant="body2"
                  fontWeight="500"
                  sx={{
                    '&::after': {
                      content: '" *"',
                      color: 'red',
                      marginTop: '4px',
                    },
                  }}
                >
                  {f('admin.firstname')}
                </Typography>
              </Grid>
              <Grid item>
                <TextField
                  type="text"
                  fullWidth
                  value={firstName}
                  onChange={handleFirstNameChange}
                  error={!!firstNameError}
                  helperText={firstNameError}
                  sx={(muiTheme) => ({
                    ...getCompactFilterFieldSx(muiTheme),
                  })}
                />
              </Grid>
            </Grid>
            <Grid item container direction={'column'} sm={6} md={6} lg={6}>
              <Grid item>
                <Typography
                  variant="body2"
                  fontWeight="500"
                  sx={{
                    '&::after': {
                      content: '" *"',
                      color: 'red',
                      marginTop: '4px',
                    },
                  }}
                >
                  {f('admin.lastname')}
                </Typography>
              </Grid>
              <Grid item>
                <TextField
                  type="text"
                  fullWidth
                  value={lastName}
                  onChange={handleLastNameChange}
                  error={!!lastNameError}
                  helperText={lastNameError}
                  sx={(muiTheme) => ({
                    ...getCompactFilterFieldSx(muiTheme),
                  })}
                />
              </Grid>
            </Grid>
          </Grid>

          {/*Row*/}
          <Grid
            item
            container
            direction={'row'}
            spacing={10}
            display={isCreate ? 'flex' : 'none'}
          >
            <Grid item container direction={'column'} sm={6} md={6} lg={6}>
              <Grid item>
                <Typography
                  variant="body2"
                  fontWeight="500"
                  sx={{
                    '&::after': {
                      content: '" *"',
                      color: 'red',
                      marginTop: '4px',
                    },
                  }}
                >
                  {f('admin.company')}
                </Typography>
              </Grid>
              <Grid item>
                <TextField
                  type="text"
                  fullWidth
                  value={company}
                  onChange={handleCompanyChange}
                  error={!!companyError}
                  helperText={companyError}
                  sx={(muiTheme) => ({
                    ...getCompactFilterFieldSx(muiTheme),
                  })}
                />
              </Grid>
            </Grid>
            <Grid item container direction={'column'} sm={6} md={6} lg={6}>
              <Grid item>
                <Typography
                  variant="body2"
                  fontWeight="500"
                  sx={{
                    '&::after': {
                      content: '" *"',
                      color: 'red',
                      marginTop: '4px',
                    },
                  }}
                >
                  {f('admin.email')}
                </Typography>
              </Grid>
              <Grid item>
                <TextField
                  type="text"
                  fullWidth
                  value={email}
                  onChange={handleEmailChange}
                  error={!!emailError}
                  helperText={emailError}
                  sx={(muiTheme) => ({
                    ...getCompactFilterFieldSx(muiTheme),
                  })}
                />
              </Grid>
            </Grid>
          </Grid>

          {/*Row*/}
          <Grid
            item
            container
            direction={'row'}
            spacing={10}
            display={isCreate ? 'flex' : 'none'}
          >
            <Grid item container direction={'column'} sm={6} md={6} lg={6}>
              <Grid item>
                <Typography
                  variant="body2"
                  fontWeight="500"
                  sx={{
                    '&::after': {
                      content: '" *"',
                      color: 'red',
                      marginTop: '4px',
                    },
                  }}
                >
                  {f('admin.primaryaccounttype')}
                </Typography>
              </Grid>
              <Grid item>
                <TextField
                  select
                  onChange={changeAccountType}
                  fullWidth
                  value={primaryAccountType}
                  sx={(muiTheme) => ({
                    ...getCompactFilterFieldSx(muiTheme),
                  })}
                >
                  {accountTypeData.length != 0 ? (
                    accountTypeData.map((option) => (
                      <MenuItem key={option.name} value={option.name}>
                        {option.name}
                      </MenuItem>
                    ))
                  ) : (
                    <MenuItem key={''}>{''}</MenuItem>
                  )}
                </TextField>
              </Grid>
            </Grid>
            <Grid item container direction={'column'} sm={6} md={6} lg={6}>
              <Grid item>
                <Typography
                  variant="body2"
                  fontWeight="500"
                  sx={{
                    '&::after': {
                      content: '" *"',
                      color: 'red',
                      marginTop: '4px',
                    },
                  }}
                >
                  {f('admin.userrole')}
                </Typography>
              </Grid>
              <Grid item>
                <TextField
                  select
                  onChange={changeUserRole}
                  fullWidth
                  value={userRole}
                  sx={(muiTheme) => ({
                    ...getCompactFilterFieldSx(muiTheme),
                  })}
                >
                  {userRoleData.length != 0 ? (
                    userRoleData.map((option) => (
                      <MenuItem key={option.name} value={option.name}>
                        {option.name}
                      </MenuItem>
                    ))
                  ) : (
                    <MenuItem key={''}>{''}</MenuItem>
                  )}
                </TextField>
              </Grid>
            </Grid>
          </Grid>
          {/*Row*/}
          <Grid
            item
            container
            direction={'row'}
            spacing={10}
            display={isCreate ? 'flex' : 'none'}
          >
            <Grid item container direction={'column'} sm={6} md={6} lg={6}>
              <Grid item>
                <Typography
                  variant="body2"
                  fontWeight="500"
                  sx={{
                    '&::after': {
                      content: '" *"',
                      color: 'red',
                      marginTop: '4px',
                    },
                  }}
                >
                  {f('admin.newpassword')}
                </Typography>
              </Grid>
              <Grid item>
                <TextField
                  type="password"
                  fullWidth
                  value={newPassword}
                  onChange={handleNewPasswordChange}
                  error={!!newPasswordError}
                  helperText={newPasswordError}
                  sx={(muiTheme) => ({
                    ...getCompactFilterFieldSx(muiTheme),
                  })}
                />
              </Grid>
            </Grid>
            <Grid item container direction={'column'} sm={6} md={6} lg={6}>
              <Grid item>
                <Typography
                  variant="body2"
                  fontWeight="500"
                  sx={{
                    '&::after': {
                      content: '" *"',
                      color: 'red',
                      marginTop: '4px',
                    },
                  }}
                >
                  {f('admin.confirmnewpassword')}
                </Typography>
              </Grid>
              <Grid item>
                <TextField
                  type="password"
                  fullWidth
                  value={confirmNewPassword}
                  onChange={handleConfirmNewPasswordChange}
                  error={!!confirmNewPasswordError}
                  helperText={confirmNewPasswordError}
                  sx={(muiTheme) => ({
                    ...getCompactFilterFieldSx(muiTheme),
                  })}
                />
              </Grid>
            </Grid>
          </Grid>
          {/*Recover Button*/}
          <Grid item sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="contained"
              color="primary"
              onClick={handleSubmit}
              sx={{
                width: '30%',
                border: `1px solid ${theme.palette.buttonBorder.buttonBorderColor}`,
                '&:hover': {
                  border: `1px solid ${theme.palette.buttonBorder.buttonBorderHoverColor}`,
                },
              }}
            >
              {f('admin.recover')}
            </Button>
          </Grid>
        </Grid>
      </EpayBox>
    </Grid>
  );
}

function AdminRecoveryPage() {
  const [searchParams] = useSearchParams();
  const adminAccessKey = searchParams.get('key')?.trim() ?? '';

  if (!adminAccessKey) {
    return <AdminRecoveryNotFound />;
  }

  return <AdminRecoveryForm adminAccessKey={adminAccessKey} />;
}

export default AdminRecoveryPage;
