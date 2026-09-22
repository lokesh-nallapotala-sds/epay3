import {
  useEffect,
  useState,
  ChangeEvent,
  FormEvent,
  KeyboardEvent,
  MouseEvent,
} from 'react';
import { useNavigate } from 'react-router';
import { getLanguageOptions } from 'constants/languages';
import { clearSelectedAccountId } from 'utilities/accountPersistence';
import {
  consumeMaintenanceSignedOut,
  formatMaintenanceMessage,
  isMaintenanceStatusResponse,
} from 'utilities/maintenance';

import { Box } from '@mui/system';
import { useAppDispatch } from 'redux/hooks';
import { useAppSelector } from 'redux/hooks';
import { ApplicationConfigRequest } from 'types/AppConfigRequest';
import { styled, Theme, useTheme } from '@mui/material/styles';
import { ExpandMoreOutlined } from '@mui/icons-material';
import { useEpayToast } from 'providers/EpayToastProvider';
import { useEpayLocale } from 'providers/EpayIntlProvider';
import { EpayLoginService } from 'services/EpayLoginService';
import { LoginResponse } from 'types/LoginResponse';
import UserRole from 'types/UserRole';
import { EpayApplicationService } from 'services/EpayApplicationService';
import { VisibilityOffOutlined, VisibilityOutlined } from '@mui/icons-material';
import {
  Button,
  Divider,
  Grid,
  IconButton,
  InputAdornment,
  MenuItem,
  TextField,
  Typography,
  useMediaQuery,
} from '@mui/material';
import {
  isMaintenanceActiveSelector,
  clearUserStore,
  languageSelector,
  loginFailed,
  loginSuccess,
  maintenanceConfigSelector,
  maintenanceMessageSelector,
  setImpersonatedAccount,
  setLanguage,
  setMaintenanceStatus,
  setMaxCreditAmountAllowed,
  setMaxECAmountAllowed,
  setSelectedAccount,
  unimpersonateUser,
} from 'redux/reducers';
import { useEpayQuery } from 'providers/EpayQueryProvider';
import { refreshConfig } from 'redux/reducers/configSlice';
import AppLogo from '../logo/AppLogo';
import BannerContent from './BannerContent';
import LoginContainer from '../containers/LoginContainer';
import { useGetPaymentCardType } from '../../hooks/usePaymentHelpers';
import { getAppBaseUrl } from 'utilities/utilities';
import { useFormat } from 'hooks/useFormat';
import { getCompactFilterFieldSx } from 'shared/components/compactFilterFieldStyles';

const LoginBox = styled(Box)(({ theme }) => ({
  backgroundColor: theme.palette.background.paper,
  width: '100%',
  minHeight: '100vh',
  display: 'flex',
  position: 'relative',
}));

export default function LoginPage() {
  const navigate = useNavigate();
  const theme = useTheme();
  const isSmallScreen = useMediaQuery((theme: Theme) =>
    theme.breakpoints.down('lg'),
  );

  const selectedLanguage = useAppSelector(languageSelector);
  const languages = getLanguageOptions();

  const [user, setUser] = useState('');
  const [pwd, setPwd] = useState('');
  const [userError, setUserError] = useState(false);
  const [pwdError, setPwdError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { language, setUserPreferredLocale } = useEpayLocale();
  const [appConfig, setAppConfig] = useState<ApplicationConfigRequest>();

  // Maintenance status is owned centrally (MaintenanceProvider -> Redux).
  const maintenanceConfig = useAppSelector(maintenanceConfigSelector);
  const maintenanceServerMessage = useAppSelector(maintenanceMessageSelector);
  const isMaintenanceActive = useAppSelector(isMaintenanceActiveSelector);

  const f = useFormat();
  const api = useEpayQuery();
  const login = EpayLoginService.usePostLogin();
  const checkEmailTemplates =
    EpayApplicationService.useCheckAllEmailTemplates();
  const dispatch = useAppDispatch();
  const { clearMessages, showToastMessage } = useEpayToast();
  const [showPassword, setShowPassword] = useState(false);

  const getAppConfig = EpayApplicationService.useGetApplicationConfig();

  useGetPaymentCardType();
  // The dedicated admin login (/login/admin) must remain usable during
  // maintenance so admins can sign in and manage/disable it.
  const isAdminLoginPath = window.location.pathname === '/login/admin';
  const isMaintenanceLoginLocked = isMaintenanceActive && !isAdminLoginPath;
  const isDisabled = isSubmitting || isMaintenanceLoginLocked;
  const maintenanceMessage = isMaintenanceLoginLocked
    ? formatMaintenanceMessage(
        maintenanceConfig,
        selectedLanguage,
        maintenanceServerMessage,
      )
    : '';

  const navigateToPublicPath = (path: string, replace = false) => {
    const target = `${getAppBaseUrl()}${path}`;
    if (replace) {
      window.location.replace(target);
      return;
    }

    window.location.assign(target);
  };

  useEffect(() => {
    getAppConfig()
      .then((resp: ApplicationConfigRequest) => {
        setAppConfig(resp);
        if (resp.maxPaymentAllowed) {
          dispatch(setMaxCreditAmountAllowed(resp.maxPaymentAllowed));
        }
        if (resp.maxECheckPaymentAllowed) {
          dispatch(setMaxECAmountAllowed(resp.maxECheckPaymentAllowed));
        }
      })
      .catch((error: Error) => {
        showToastMessage('error', error.message ?? error);
      });
  }, []);

  // Tell users why they landed back here after the maintenance middleware
  // ended their session ('warning': error toasts are suppressed while an
  // unavailable-redirect is pending).
  useEffect(() => {
    if (consumeMaintenanceSignedOut()) {
      showToastMessage('warning', f('login.maintenance_logged_off'));
    }
  }, []);

  const currentBanner = theme.banner?.find((b) => b.language === language);

  const handleClickShowPassword = () => {
    setShowPassword(!showPassword);
  };

  const handleMouseDownPassword = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSubmit(e);
    }
  };

  // While sitting on this page nothing re-checks maintenance status (no
  // navigation happens), so a window opening or SAP going down mid-visit
  // would go unnoticed. Re-sync after every failed login attempt: the redux
  // update shows the banner / disables the form (active) or triggers the
  // provider's redirect to the unavailable page (SAP down).
  const refreshMaintenanceStatus = async () => {
    try {
      const response = await api.getMaintenanceModeStatus();
      if (response.ok) {
        const payload: unknown = await response.json();
        if (isMaintenanceStatusResponse(payload)) {
          dispatch(setMaintenanceStatus(payload));
        }
      }
    } catch {
      // Status probe failed: keep the current state.
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    if (userError || pwdError) {
      return;
    }

    setIsSubmitting(true);
    clearMessages();

    login(user, pwd, window.location.pathname === '/login/admin')
      .then(async (response: LoginResponse) => {
        if (response && UserRole.isAdmin(response.role)) {
          const result = await checkEmailTemplates(selectedLanguage);
          if (result?.hasMissingTemplates) {
            const message = result.message;

            setTimeout(() => {
              showToastMessage('warning', message);
            }, 15000);
          }
        }
        if (response && response.status === 'waiting-confirmation') {
          window.location.href = `/auto-register/waiting-confirmation?email=${encodeURIComponent(user)}`;
        } else {
          sessionStorage.clear();
          clearSelectedAccountId();
          dispatch(clearUserStore());
          dispatch(unimpersonateUser());
          dispatch(setImpersonatedAccount({ impersonatedAccount: null }));
          dispatch(setSelectedAccount({ selectedAccount: null }));
          dispatch(
            loginSuccess({
              user: response.user,
            }),
          );
          // Now authenticated: re-fetch config so the full (auth-tiered) payload
          // replaces the anonymous one in the store. EpayConfigProvider watches
          // configRefreshTrigger and refetches /config/application and /config/custom.
          dispatch(refreshConfig());
          const currentPath = location.pathname;
          if (currentPath != '/login/admin') {
            navigate('/home');
          } else {
            navigate('/admin/maintenance');
          }
        }
      })
      .catch((error: unknown) => {
        void refreshMaintenanceStatus();

        const maintenancePayload =
          error instanceof Error && 'payload' in error
            ? (error as { payload?: unknown }).payload
            : undefined;

        if (isMaintenanceStatusResponse(maintenancePayload)) {
          if (
            maintenancePayload.code === 'maintenance_active' ||
            maintenancePayload.mode === 'maintenance_active'
          ) {
            showToastMessage(
              'error',
              formatMaintenanceMessage(
                maintenancePayload.maintenanceConfig,
                selectedLanguage,
                maintenancePayload.message,
              ),
            );
            dispatch(loginFailed());
            setIsSubmitting(false);
            return;
          }

          if (
            maintenancePayload.code === 'maintenance_unavailable' ||
            maintenancePayload.mode === 'maintenance_unavailable'
          ) {
            return;
          }
        }

        const message = error instanceof Error ? error.message : String(error);
        showToastMessage('error', message || f('login.sap_outage_message'));
        dispatch(loginFailed());
        setIsSubmitting(false); // Re-enable button on error
      });
  };

  const changeLanguage = (e: ChangeEvent<HTMLInputElement>) => {
    const lang = e.target.value;
    setUserPreferredLocale(lang);
    dispatch(setLanguage(lang));
  };

  const handleUserNameChange = (e) => {
    setUser(e.target.value);
    setUserError(false);
  };

  const handlePwdChange = (e) => {
    setPwd(e.target.value);
    setPwdError(false);
  };

  // Links are disabled while maintenance is active, and the destination public
  // pages are guarded centrally (RequireNoMaintenance + server middleware), so
  // a plain navigation is sufficient - no per-link maintenance API call.
  const handlePublicLinkNavigation = (path: string) => () => {
    navigateToPublicPath(path);
  };

  return (
    <LoginContainer>
      <LoginBox>
        <Grid
          container
          sx={{
            height: '100%',
            display: 'flex',
            flexDirection: isSmallScreen ? 'column' : 'row',
            alignItems: isSmallScreen ? 'center' : 'stretch',
            justifyContent: 'center',
          }}
        >
          {!isSmallScreen && (
            <Grid
              item
              xs={12}
              lg={6}
              sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100%',
                width: '100%',
                wordWrap: 'break-word',
              }}
            >
              <BannerContent
                text1={currentBanner?.text1}
                text2={currentBanner?.text2}
                bannerColor={theme.bannerColor}
              />
            </Grid>
          )}
          <Grid
            item
            xs={12}
            lg={6}
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              height: '100vh',
              flexDirection: 'column',
              padding: isSmallScreen ? '2rem' : '4rem',
            }}
          >
            <Box
              sx={{
                width: '100%',
                maxWidth: '400px',
                padding: '1rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                textAlign: 'center',
              }}
            >
              <Box sx={{ width: '100%' }}>
                <Grid container spacing={1} flexDirection={'column'}>
                  <Grid
                    item
                    sx={{
                      marginBottom: '1.5rem',
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      visibility: isMaintenanceLoginLocked
                        ? 'visible'
                        : 'hidden',
                    }}
                  >
                    <Typography
                      variant="body2"
                      sx={{ color: 'red', textAlign: 'center' }}
                    >
                      {maintenanceMessage}
                    </Typography>
                  </Grid>
                  {isSmallScreen && (
                    <Grid
                      item
                      sx={{
                        marginBottom: '1.5rem',
                        display: 'flex',
                        justifyContent: 'center',
                      }}
                    >
                      <AppLogo />
                    </Grid>
                  )}
                  <Grid
                    item
                    sx={{
                      marginBottom: '1.5rem',
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    <Typography variant="h3">
                      {f('configuration.application.signin-header')}
                      {theme.applicationName ? ` ${theme.applicationName}` : ''}
                    </Typography>
                  </Grid>
                  <Grid item sx={{ marginTop: '1rem' }}>
                    <TextField
                      type="text"
                      size="large"
                      fullWidth
                      required
                      value={user}
                      placeholder={f('login.username')}
                      onChange={handleUserNameChange}
                      onKeyDown={handleKeyDown}
                      disabled={isMaintenanceLoginLocked}
                      sx={(muiTheme) => ({
                        ...getCompactFilterFieldSx(muiTheme),
                      })}
                      InputProps={{
                        sx: {
                          paddingLeft: '.25rem',
                          paddingRight: '.25rem',
                        },
                      }}
                    />
                  </Grid>
                  <Grid item sx={{ marginTop: '1rem' }}>
                    <TextField
                      type={showPassword ? 'text' : 'password'}
                      size="large"
                      fullWidth
                      required
                      value={pwd}
                      placeholder={f('login.password')}
                      disabled={isMaintenanceLoginLocked}
                      onChange={handlePwdChange}
                      onKeyDown={handleKeyDown}
                      sx={(muiTheme) => ({
                        ...getCompactFilterFieldSx(muiTheme),
                      })}
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
                    />
                  </Grid>
                  <Grid
                    item
                    sx={{
                      marginTop: '1.5rem',
                      display: 'flex',
                      justifyContent: 'center',
                    }}
                  >
                    <Button
                      variant="link"
                      disabled={isMaintenanceLoginLocked}
                      onClick={handlePublicLinkNavigation('/forgotpassword')}
                      sx={{
                        minWidth: 0,
                        height: 'auto',
                        padding: 0,
                        backgroundColor: 'transparent',
                        color: isMaintenanceLoginLocked
                          ? theme.palette.text.hint
                          : theme.palette.interactiveColor,
                        '&.Mui-disabled': {
                          backgroundColor: 'transparent',
                        },
                      }}
                    >
                      {f('login.forgotPassword')}
                    </Button>
                  </Grid>
                  <Grid item>
                    <Button
                      variant="contained"
                      type="submit"
                      size="large"
                      fullWidth
                      onClick={handleSubmit}
                      disabled={isDisabled}
                      sx={{
                        marginTop: '1rem',
                        ...(!isDisabled && {
                          border: `1px solid ${theme.palette.buttonBorder.buttonBorderColor}`,
                          '&:hover': {
                            border: `1px solid ${theme.palette.buttonBorder.buttonBorderHoverColor}`,
                          },
                        }),
                      }}
                    >
                      {f('login.signin')}
                    </Button>
                  </Grid>
                  {(appConfig?.allowGuestPayment ||
                    appConfig?.allowRegistration) && (
                    <Grid item sx={{ marginTop: '1rem' }}>
                      <Divider>
                        <Typography
                          variant="body2"
                          display="block"
                          gutterBottom
                          sx={{
                            color: theme.palette.text.hint,
                            margin: '10px',
                          }}
                        >
                          {f('login.no_account')}
                        </Typography>
                      </Divider>
                    </Grid>
                  )}
                  <Grid
                    item
                    sm={12}
                    md={12}
                    lg={12}
                    sx={{
                      marginTop: '0.5rem',
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    {appConfig?.allowRegistration && (
                      <Button
                        variant="link"
                        disabled={isMaintenanceLoginLocked}
                        onClick={handlePublicLinkNavigation(
                          '/auto-registration/accounts',
                        )}
                        sx={{
                          minWidth: 0,
                          height: 'auto',
                          padding: 0,
                          backgroundColor: 'transparent',
                          color: isMaintenanceLoginLocked
                            ? 'gray'
                            : theme.palette.interactiveColor,
                          '&.Mui-disabled': {
                            backgroundColor: 'transparent',
                          },
                        }}
                      >
                        {f('login.create_account')}
                      </Button>
                    )}

                    {appConfig?.allowGuestPayment &&
                      appConfig?.allowRegistration && (
                        <Typography
                          variant="body1"
                          display="block"
                          sx={{
                            marginLeft: '10px',
                            marginRight: '10px',
                            marginTop: '5px',
                            color: theme.palette.text.hint,
                          }}
                          gutterBottom
                        >
                          {f('app.common.or')}
                        </Typography>
                      )}
                    {appConfig?.allowGuestPayment && (
                      <Button
                        variant="link"
                        disabled={isMaintenanceLoginLocked}
                        onClick={handlePublicLinkNavigation('/guestdetails')}
                        sx={{
                          minWidth: 0,
                          height: 'auto',
                          padding: 0,
                          backgroundColor: 'transparent',
                          color: isMaintenanceLoginLocked
                            ? 'gray'
                            : theme.palette.interactiveColor,
                          '&.Mui-disabled': {
                            backgroundColor: 'transparent',
                          },
                        }}
                      >
                        {f('login.guest_payment')}
                      </Button>
                    )}
                  </Grid>
                  {!isSmallScreen && (
                    <Grid
                      item
                      sm={12}
                      md={12}
                      lg={12}
                      sx={{
                        marginTop: '1rem',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                      }}
                    >
                      <TextField
                        select
                        size="small"
                        onChange={changeLanguage}
                        value={
                          languages.find((lang) => lang.language === language)
                            ?.language || ''
                        }
                        sx={(muiTheme) => ({
                          ...getCompactFilterFieldSx(muiTheme),
                          '& .MuiInputBase-root': {
                            ...getCompactFilterFieldSx(muiTheme)[
                              '&& .MuiInputBase-root'
                            ],
                            borderRadius: '6px !important',
                          },
                        })}
                        InputProps={{
                          sx: {
                            fontSize: '12px',
                            marginBottom: '20px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                          },
                        }}
                        SelectProps={{
                          MenuProps: {
                            anchorOrigin: {
                              vertical: 'top',
                              horizontal: 'center',
                            },
                            transformOrigin: {
                              vertical: 'bottom',
                              horizontal: 'center',
                            },
                            PaperProps: {
                              sx: {
                                mt: 0,
                              },
                            },
                          },
                          IconComponent: ExpandMoreOutlined,
                        }}
                      >
                        {languages.map((option) => (
                          <MenuItem
                            key={option.language}
                            value={option.language}
                            sx={{ fontSize: '12px' }}
                          >
                            {option.title}
                          </MenuItem>
                        ))}
                      </TextField>
                    </Grid>
                  )}
                </Grid>
              </Box>
            </Box>
          </Grid>
        </Grid>
      </LoginBox>
    </LoginContainer>
  );
}
