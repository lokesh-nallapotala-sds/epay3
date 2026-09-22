import { ChangeEvent, MouseEvent, useState, FormEvent } from 'react';

import { useIntl } from 'react-intl';
import { useParams } from 'react-router';

import { Box } from '@mui/system';
import { Link } from '@mui/material';
import Grid from '@mui/material/Grid';
import { useTheme } from '@mui/system';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import useMediaQuery from '@mui/material/useMediaQuery';
import InputAdornment from '@mui/material/InputAdornment';
import VisibilityOutlined from '@mui/icons-material/VisibilityOutlined';
import VisibilityOffOutlined from '@mui/icons-material/VisibilityOffOutlined';

import { validatePassword } from 'utilities/utilities';
import { EpayUserService } from 'services/EpayUserService';
import { useEpayToast } from 'providers/EpayToastProvider';
import { PASSWORD_LENGTH_MIN } from 'constants/authConstants';
import { getCompactFilterFieldSx } from 'shared/components/compactFilterFieldStyles';

export default function CreateNewPassword() {
  const theme = useTheme();
  const lgUp = useMediaQuery(theme.breakpoints.up('lg'));
  const mdUp = useMediaQuery(theme.breakpoints.up('md'));
  const { id } = useParams<string>();
  const intl = useIntl();
  const f = (id: string) => intl.formatMessage({ id: id });

  const createPassword = EpayUserService.useCreatePassword();
  const completeRegistration = EpayUserService.useCompleteRegistration();

  const { showToastMessage } = useEpayToast();

  const MarginX = lgUp ? 3 : mdUp ? 2 : 0.75; //in rem

  const [newPasswordText, setNewPasswordText] = useState('');
  const [newPasswordDirty, setNewPasswordDirty] = useState(false);
  const [newPasswordVisible, setNewPasswordVisible] = useState(false);
  const [newPasswordError, setNewPasswordError] = useState('');
  const [confirmPasswordText, setConfirmPasswordText] = useState('');
  const [confirmPasswordDirty, setConfirmPasswordDirty] = useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);
  const [confirmPasswordError, setConfirmPasswordError] = useState('');

  function handleNewPasswordTextChange(e: ChangeEvent<HTMLInputElement>): void {
    const s = e.currentTarget.value;
    const wasDirty = newPasswordDirty;

    setNewPasswordText(s);
    setNewPasswordDirty(true);

    checkPasswords(s, wasDirty, e.currentTarget.value, confirmPasswordDirty);
  }
  function handleNewPasswordVisibilityMouseDown(
    e: MouseEvent<HTMLButtonElement>,
  ) {
    e.preventDefault();
  }
  function handleNewPasswordVisibilityChange() {
    setNewPasswordVisible((visible) => !visible);
  }

  function handleConfirmPasswordTextChange(
    e: ChangeEvent<HTMLInputElement>,
  ): void {
    const s = e.currentTarget.value;
    const wasDirty = confirmPasswordDirty;

    setConfirmPasswordText(s);
    setConfirmPasswordDirty(true);

    checkPasswords(s, wasDirty, e.currentTarget.value, true);
  }
  function handleConfirmPasswordVisibilityMouseDown(
    e: MouseEvent<HTMLButtonElement>,
  ) {
    e.preventDefault();
  }
  function handleConfirmPasswordVisibilityChange() {
    setConfirmPasswordVisible((visible) => !visible);
  }

  function checkPasswords(
    newPw: string,
    wasNewPwDirty: boolean,
    confirmPw: string,
    wasConfirmPwDirty: boolean,
  ): void {
    let hasNewPwError = false;
    let hasConfPwError = false;

    // new password (only) checks
    if (newPw.length === 0 && wasNewPwDirty) {
      hasNewPwError = true;
      setNewPasswordError(
        f('settings.account.update_password.new_password_required'),
      );
    } else if (newPw.trim().length < PASSWORD_LENGTH_MIN) {
      hasNewPwError = true;
      setNewPasswordError(
        f('user.password.invalid.message').replace(
          '{minLength}',
          PASSWORD_LENGTH_MIN.toString(),
        ),
      );
    } else if (!validatePassword(newPw)) {
      hasNewPwError = true;
      setNewPasswordError(
        f('user.password.invalid.message').replace(
          '{minLength}',
          PASSWORD_LENGTH_MIN.toString(),
        ),
      );
    } else {
      setNewPasswordError('');
    }

    // password confirmation (only) checks
    if (confirmPw.trim().length === 0 && wasConfirmPwDirty) {
      hasConfPwError = true;
      setConfirmPasswordError(
        f('settings.account.update_password.confirm_password_required'),
      );
    } else if (confirmPw.trim().length < PASSWORD_LENGTH_MIN) {
      hasConfPwError = true;
      setConfirmPasswordError(
        f('user.password.invalid.message').replace(
          '{minLength}',
          PASSWORD_LENGTH_MIN.toString(),
        ),
      );
    } else if (!validatePassword(confirmPw)) {
      hasConfPwError = true;
      setConfirmPasswordError(
        f('user.password.invalid.message').replace(
          '{minLength}',
          PASSWORD_LENGTH_MIN.toString(),
        ),
      );
    } else {
      setConfirmPasswordError('');
    }

    // new & confirmation password (as combo) checks
    if (!hasNewPwError && !hasConfPwError) {
      if (newPw !== confirmPw) {
        setNewPasswordError(
          f('settings.account.update_password.new_password_mismatch'),
        );
        setConfirmPasswordError(
          f('settings.account.update_password.new_password_mismatch'),
        );
      }
    }
  }

  function allFieldsPopulated(): boolean {
    return newPasswordText.length > 0 && confirmPasswordText.length > 0;
  }
  function isNewPasswordValid(): boolean {
    return (
      newPasswordText.length >= PASSWORD_LENGTH_MIN &&
      confirmPasswordText.length >= PASSWORD_LENGTH_MIN &&
      newPasswordText === confirmPasswordText
    );
  }

  function resetInputs(): void {
    setNewPasswordText('');
    setConfirmPasswordText('');
  }

  function handleSubmit(e: FormEvent): void {
    e.preventDefault();
    const tokenValue = id || '';
    const isRegister = location.pathname.includes('/register/');

    const action = isRegister ? completeRegistration : createPassword;

    action(tokenValue, newPasswordText, confirmPasswordText)
      .then((resp) => {
        if (resp.code && resp.code === 200) {
          showToastMessage(
            'success',
            f('user.account.create_password.success'),
          );
        } else if (resp.code && resp.code === 400) {
          showToastMessage(
            'error',
            resp?.message ??
              f('settings.account.update_password.new_password_mismatch'),
          );
        } else {
          showToastMessage('error', resp?.message ?? f('error.unknown'));
        }
      })
      .catch((err) => {
        if (err && err.code) {
          if (err.code === 401) {
            showToastMessage('error', f('error.user.badcredentials'));
          } else {
            showToastMessage(
              'error',
              f('error.api')
                .replace('{statusCode}', `${err.code}`)
                .replace('{statusText}', `${err.text}`),
            );
          }
        } else {
          showToastMessage('error', f('error.unknown'));
        }
      })
      .finally(() => {
        resetInputs();
      });
  }

  return (
    <Box
      display="flex"
      width={`calc(100% - ${2 * MarginX}rem)`}
      marginX={`${MarginX}rem`}
      justifyContent={mdUp ? 'flex-start' : 'center'}
    >
      <Grid container xs={12} direction="column" rowGap="2rem" marginY="1rem">
        <Grid item>
          <Box
            display="flex"
            width="100%"
            paddingBottom="1rem"
            borderBottom={`1px solid ${theme?.components?.MuiPaper?.defaultProps?.sx?.borderColor}`}
          >
            <Grid
              container
              direction="column"
              alignItems="flex-start"
              rowGap=".5rem"
              marginX={lgUp ? 0 : '.5rem'}
            >
              <Grid item>
                <Typography variant="h1">
                  {f('user.password.create_new')}
                </Typography>
              </Grid>
            </Grid>
          </Box>
        </Grid>
        <Grid
          item
          container
          direction="column"
          rowGap="1.5rem"
          paddingX={lgUp ? '2rem' : '.5rem'}
          paddingTop={lgUp ? '.5rem' : undefined}
        >
          <Grid item>
            <Grid
              container
              direction={lgUp ? 'row' : 'column'}
              alignItems={lgUp ? 'center' : undefined}
              rowSpacing={!lgUp ? '0.35rem' : undefined}
            >
              <Grid item xs={12} lg={6} display="flex">
                <Typography variant="fieldHeader">
                  {f('settings.account.update_password.password_new.label1')}
                </Typography>
                <Typography variant="fieldHeader" color="red" ml=".25rem">
                  {f('app.common.required_indicator')}
                </Typography>
              </Grid>
              <Grid item xs={12} lg={6}>
                <TextField
                  type={newPasswordVisible ? 'text' : 'password'}
                  fullWidth
                  value={newPasswordText}
                  onChange={handleNewPasswordTextChange}
                  error={!!newPasswordError}
                  helperText={newPasswordError}
                  sx={(muiTheme) => ({
                    ...getCompactFilterFieldSx(muiTheme),
                  })}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          edge="end"
                          tabIndex={-1}
                          onClick={handleNewPasswordVisibilityChange}
                          onMouseDown={handleNewPasswordVisibilityMouseDown}
                        >
                          {newPasswordVisible ? (
                            <VisibilityOffOutlined />
                          ) : (
                            <VisibilityOutlined />
                          )}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
            </Grid>
          </Grid>
          <Grid item>
            <Grid
              container
              direction={lgUp ? 'row' : 'column'}
              alignItems={lgUp ? 'center' : undefined}
              rowSpacing={!lgUp ? '0.35rem' : undefined}
            >
              <Grid item xs={12} lg={6} display="flex">
                <Typography variant="fieldHeader">
                  {f('settings.account.update_password.password_new.label2')}
                </Typography>
                <Typography variant="fieldHeader" color="red" ml=".25rem">
                  {f('app.common.required_indicator')}
                </Typography>
              </Grid>
              <Grid item xs={12} lg={6}>
                <TextField
                  type={confirmPasswordVisible ? 'text' : 'password'}
                  fullWidth
                  value={confirmPasswordText}
                  onChange={handleConfirmPasswordTextChange}
                  error={!!confirmPasswordError}
                  helperText={confirmPasswordError}
                  sx={(muiTheme) => ({
                    ...getCompactFilterFieldSx(muiTheme),
                  })}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          edge="end"
                          tabIndex={-1}
                          onClick={handleConfirmPasswordVisibilityChange}
                          onMouseDown={handleConfirmPasswordVisibilityMouseDown}
                        >
                          {confirmPasswordVisible ? (
                            <VisibilityOffOutlined />
                          ) : (
                            <VisibilityOutlined />
                          )}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
            </Grid>
          </Grid>
          <Grid
            item
            container
            direction="row"
            justifyContent="flex-end"
            columnGap={mdUp ? '1.5rem' : undefined}
            marginTop="1rem"
          >
            <Grid item>
              <Grid item>
                <Link
                  href="/"
                  sx={{
                    textDecoration: 'none',
                  }}
                >
                  <Button
                    variant="outlined"
                    color="secondary"
                    sx={{
                      width: '12rem',
                    }}
                  >
                    {f('app.common.cancel')}
                  </Button>
                </Link>
              </Grid>
            </Grid>
            <Grid item>
              <Button
                variant="contained"
                color="primary"
                onClick={handleSubmit}
                disabled={!allFieldsPopulated() || !isNewPasswordValid()}
                sx={{
                  width: '12rem',
                  ...(allFieldsPopulated() && {
                    border: `1px solid ${theme.palette.buttonBorder.buttonBorderColor}`,
                    '&:hover': {
                      border: `1px solid ${theme.palette.buttonBorder.buttonBorderHoverColor}`,
                    },
                  }),
                }}
              >
                {f('app.common.save')}
              </Button>
            </Grid>
          </Grid>
        </Grid>
        <Grid
          item
          container
          justifyContent="center"
          marginTop="1.3rem"
          borderTop={`1px solid ${theme?.components?.MuiPaper?.defaultProps?.sx?.borderColor}`}
        >
          <Grid item margin="1rem">
            <Link
              href="/"
              sx={{
                textDecoration: 'none',
              }}
            >
              <Typography
                variant="body1"
                sx={{ color: theme.palette.interactiveColor }}
              >
                {f('user.go_back_login')}
              </Typography>
            </Link>
          </Grid>
        </Grid>
      </Grid>
    </Box>
  );
}
