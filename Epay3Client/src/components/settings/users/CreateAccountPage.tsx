import { ChangeEvent, MouseEvent, useState } from 'react';

import { useIntl } from 'react-intl';

import {
  Box,
  Button,
  Grid,
  IconButton,
  InputAdornment,
  Link,
  TextField,
  Typography,
  useTheme,
} from '@mui/material';
import { VisibilityOffOutlined, VisibilityOutlined } from '@mui/icons-material';
import EpayBox from 'shared/components/EpayBox';
import useEpayNavigate from 'hooks/useEpayNavigate';
import { validatePassword } from 'utilities/utilities';
import { PASSWORD_LENGTH_MIN } from 'constants/authConstants';
import { EpayUserService } from 'services/EpayUserService';
import { UserAddChangeRequest } from 'types/UserAddChangeRequest';
import { useEpayToast } from 'providers/EpayToastProvider';
import { getCompactFilterFieldSx } from 'shared/components/compactFilterFieldStyles';
import { useAppDispatch, useAppSelector } from 'redux/hooks';
import {
  clearValidatedAccounts,
  validatedAccountsSelector,
} from 'redux/reducers';

function CreateAccountPage() {
  const theme = useTheme();
  const { showToastMessage } = useEpayToast();
  const intl = useIntl();
  const f = (id: string) =>
    intl.formatMessage({
      id: id,
    });

  const { navigate } = useEpayNavigate();
  const dispatch = useAppDispatch();
  const validatedAccounts = useAppSelector(validatedAccountsSelector);
  const saveUser = EpayUserService.useAutoSaveUser();

  const [firstName, setFirstName] = useState('');
  const [firstNameError, setFirstNameError] = useState('');

  const [lastName, setLastName] = useState('');
  const [lastNameError, setLastNameError] = useState('');

  const [company, setCompany] = useState('');
  const [companyError, setCompanyError] = useState('');

  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showVerifyPassword, setShowVerifyPassword] = useState(false);
  const status: string = 'active';
  const accountType: string = 'Payer';
  const role: string = 'user';

  const emailValidationRegex =
    /(?:[a-z0-9!#$%&"*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&"*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9]))\.){3}(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9])|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])/;

  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const [verifyPassword, setVerifyPassword] = useState('');
  const [verifyPasswordError, setVerifyPasswordError] = useState('');

  function handleFirstNameChange(e: ChangeEvent<HTMLInputElement>) {
    const s = e.currentTarget.value;
    setFirstName(s);
    if (s.length > 0) setFirstNameError('');
  }
  function handleLastNameChange(e: ChangeEvent<HTMLInputElement>) {
    const s = e.currentTarget.value;
    setLastName(s);
    if (s.length > 0) setLastNameError('');
  }
  function handleEmailChange(e: ChangeEvent<HTMLInputElement>) {
    const s = e.currentTarget.value;
    setEmail(s);
    if (s.length > 0) setEmailError('');
  }
  function handleCompanyChange(e: ChangeEvent<HTMLInputElement>) {
    const s = e.currentTarget.value;
    setCompany(s);
    if (s.length > 0) setCompanyError('');
  }

  function handlePasswordChange(e: ChangeEvent<HTMLInputElement>) {
    const s = e.currentTarget.value;
    setPassword(s);
    if (s.length > 0) setPasswordError('');
  }
  function handlePasswordBlur(e) {
    const s = e.currentTarget.value;

    if (s.length === 0) {
      setPasswordError('');
    } else if (s.length < 8) {
      setPasswordError(
        f('user.password.invalid.message').replace(
          '{minLength}',
          PASSWORD_LENGTH_MIN.toString(),
        ),
      );
    } else if (!validatePassword(s)) {
      setPasswordError(
        f('user.password.invalid.message').replace(
          '{minLength}',
          PASSWORD_LENGTH_MIN.toString(),
        ),
      );
    } else {
      setPasswordError('');
    }
  }

  function handleVerfiyPasswordChange(e: ChangeEvent<HTMLInputElement>) {
    const s = e.currentTarget.value;

    setVerifyPassword(s);
    setVerifyPasswordError('');
  }
  function handleVerifyPasswordBlur(e) {
    const s = e.currentTarget.value;
    if (password != s) {
      setVerifyPasswordError(f('admin.recovery.pwdmismatch'));
      return;
    } else setVerifyPasswordError('');
  }
  function handleSubmit(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault();

    let hasError = false;

    if (firstName.trim().length === 0) {
      setFirstNameError(f('user.error.givenname'));
      hasError = true;
    }
    if (lastName.trim().length === 0) {
      setLastNameError(f('user.error.surname'));
      hasError = true;
    }
    if (email.trim().length === 0) {
      setEmailError(f('user.error.email'));
      hasError = true;
    } else if (!emailValidationRegex.test(email.trim().toLowerCase())) {
      setEmailError(f('user.error.email.bad'));
      hasError = true;
    }
    if (company.trim().length === 0) {
      setCompanyError(f('user.error.company'));
      hasError = true;
    }
    if (password.trim().length === 0) {
      setPasswordError(f('user.password.required'));
      hasError = true;
    }
    if (verifyPassword.trim().length === 0) {
      setVerifyPasswordError(f('user.verfify_password.required'));
      hasError = true;
    }
    if (password.trim() !== verifyPassword.trim()) {
      setVerifyPasswordError(f('admin.recovery.pwdmismatch'));
      hasError = true;
    }

    if (hasError) return;

    if (validatedAccounts.length === 0) {
      showToastMessage('error', f('header.account.errorMessage'));
      return;
    }

    const req: UserAddChangeRequest = {
      userId: '',
      login: email.trim(),
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
      company: company.trim(),
      primaryAccountType: accountType,
      status: status,
      role: role,
      password: password.trim(),
    };

    saveUser({ user: req, accounts: validatedAccounts })
      .then((response) => {
        const resp = response as any;
        if (resp?.emailError) {
          showToastMessage('warning', f(resp.emailError.code));
        }
        dispatch(clearValidatedAccounts());
        navigate('/success-confirmation/success');
      })
      .catch((err) => {
        const errMsg = (err.message as string)?.replace('\n', '; ');
        showToastMessage('error', errMsg);
      });
  }

  const handleClickShowPassword = () => {
    setShowPassword(!showPassword);
  };

  const handleClickShowVerifyPassword = () => {
    setShowVerifyPassword(!showVerifyPassword);
  };

  const handleMouseDownPassword = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
  };

  return (
    <Grid container item sm={12} md={8} lg={6} direction={'column'}>
      <Grid item marginY="1rem">
        <Typography variant="h1">{f('login.registerAccount')}</Typography>
      </Grid>
      <Grid item>
        <EpayBox sx={{ marginY: '6px', padding: '4px' }}>
          <Grid container direction="column">
            <Grid
              item
              sx={{
                borderBottom: '1px solid',
                borderBottomColor: '#E0E0E0',
                padding: '20px',
              }}
            >
              <Typography variant="h5" align="left">
                {f('login.create_account')}
              </Typography>
            </Grid>
            <Grid
              item
              container
              direction="column"
              spacing={1}
              sx={{ padding: '20px' }}
            >
              <Grid item container direction={'column'}>
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
                    {f('user.email')}
                  </Typography>
                </Grid>
                <Grid item>
                  <TextField
                    type="text"
                    InputProps={{
                      inputProps: { inputMode: 'numeric', pattern: '[0-9]*' },
                    }}
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
              <Grid item container direction={'column'}>
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
                    {f('user.givenname')}
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
              <Grid item container direction={'column'}>
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
                    {f('user.surname')}
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

              <Grid item container direction={'column'}>
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
                    {f('user.company')}
                  </Typography>
                </Grid>
                <Grid item>
                  <TextField
                    type="text"
                    InputProps={{
                      inputProps: { inputMode: 'numeric', pattern: '[0-9]*' },
                    }}
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

              <Grid item container direction={'column'}>
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
                    {f('user.password')}
                  </Typography>
                </Grid>
                <Grid item>
                  <TextField
                    type={showPassword ? 'text' : 'password'}
                    fullWidth
                    value={password}
                    onChange={handlePasswordChange}
                    onBlur={handlePasswordBlur}
                    error={!!passwordError}
                    helperText={passwordError}
                    inputProps={{
                      name: 'newPassword',
                      id: 'newPassword',
                      autoComplete: 'new-password',
                    }}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            aria-label={f('aria.toggle_password_visibility')}
                            onClick={handleClickShowPassword}
                            onMouseDown={handleMouseDownPassword}
                            edge="end"
                            tabIndex={-1}
                          >
                            {showPassword ? (
                              <VisibilityOffOutlined />
                            ) : (
                              <VisibilityOutlined />
                            )}
                          </IconButton>
                        </InputAdornment>
                      ),
                      sx: {
                        paddingLeft: '.25rem',
                      },
                    }}
                    sx={(muiTheme) => ({
                      ...getCompactFilterFieldSx(muiTheme),
                    })}
                  />
                </Grid>
              </Grid>

              <Grid item container direction={'column'}>
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
                    {f('user.password.verify')}
                  </Typography>
                </Grid>
                <Grid item>
                  <TextField
                    type={showVerifyPassword ? 'text' : 'password'}
                    fullWidth
                    value={verifyPassword}
                    onChange={handleVerfiyPasswordChange}
                    onBlur={handleVerifyPasswordBlur}
                    error={!!verifyPasswordError}
                    helperText={verifyPasswordError}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            aria-label={f('aria.toggle_password_visibility')}
                            onClick={handleClickShowVerifyPassword}
                            onMouseDown={handleMouseDownPassword}
                            edge="end"
                            tabIndex={-1}
                          >
                            {showVerifyPassword ? (
                              <VisibilityOffOutlined />
                            ) : (
                              <VisibilityOutlined />
                            )}
                          </IconButton>
                        </InputAdornment>
                      ),
                      sx: {
                        paddingLeft: '.25rem',
                      },
                    }}
                    sx={(muiTheme) => ({
                      ...getCompactFilterFieldSx(muiTheme),
                    })}
                  />
                </Grid>
              </Grid>

              <Grid item sx={{ paddingTop: '20px !important' }}>
                <Grid container direction="row" justifyContent="flex-end">
                  <Grid item>
                    <Button
                      variant="contained"
                      color="primary"
                      sx={{
                        width: '10rem',
                        border: `1px solid ${theme.palette.buttonBorder.buttonBorderColor}`,
                        '&:hover': {
                          border: `1px solid ${theme.palette.buttonBorder.buttonBorderHoverColor}`,
                        },
                      }}
                      onClick={handleSubmit}
                    >
                      {f('admin.recovery.mode.create')}
                    </Button>
                  </Grid>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </EpayBox>
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: '10px' }}>
          <Link
            href="/"
            sx={{
              textDecoration: 'none',
            }}
          >
            <Typography
              onClick={() => {
                dispatch(clearValidatedAccounts());
                navigate('/');
              }}
              variant="body1"
              sx={{ color: theme.palette.interactiveColor }}
            >
              {f('user.go_back_login')}
            </Typography>
          </Link>
        </Box>
      </Grid>
    </Grid>
  );
}

export default CreateAccountPage;
