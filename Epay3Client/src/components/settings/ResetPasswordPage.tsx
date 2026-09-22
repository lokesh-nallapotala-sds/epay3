import {
  ChangeEvent,
  SyntheticEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { useIntl } from 'react-intl';

import { Box } from '@mui/system';
import Grid from '@mui/material/Grid';
import { useTheme } from '@mui/system';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import type { SelectProps } from '@mui/material/Select';
import type { SxProps, Theme } from '@mui/material/styles';
import { useAppSelector, useAppDispatch } from 'redux/hooks';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { EpayUserService } from 'services/EpayUserService';
import { useEpayToast } from 'providers/EpayToastProvider';
import EpayPageHeaderText from 'shared/components/EpayPageHeaderText';
import {
  compactFilterMenuItemSx,
  compactFilterSelectProps,
} from 'shared/components/compactFilterSelectStyles';
import { selectIsAccountLinkingEnabled } from 'redux/selectors/configSelectors';
import {
  impersonatedUserSelector,
  regionalFormatSelector,
  setRegionalFormat,
  userSelector,
} from 'redux/reducers/userSlice';
import {
  AUTOMATIC_REGIONAL_FORMAT,
  REGIONAL_FORMATS,
  getRegionalFormatPreview,
} from 'constants/languages';
import { User, UserView } from 'types/User';
import { ErrorInfo } from 'types/ErrorInfo';
import { usePasswordForm } from 'hooks/usePasswordForm';
import { getCompactFilterFieldSx } from 'shared/components/compactFilterFieldStyles';

import { PasswordField } from './PasswordField';
import LinkedSapAccountsCardsSection from './LinkedSapAccountsCardsSection';

function toApiRegionalFormat(value: string): string {
  return value === '' ? AUTOMATIC_REGIONAL_FORMAT : value;
}

function toDropdownRegionalFormat(value?: string): string {
  return value === AUTOMATIC_REGIONAL_FORMAT ? '' : value || '';
}

const VIEWPORT_PADDING = 8;
const MENU_MAX_HEIGHT = 320;
const MENU_ITEM_ESTIMATED_HEIGHT = 40;
const MENU_VERTICAL_PADDING = 16;

function getSelectAnchorElement(
  fieldElement: HTMLDivElement | null,
): HTMLElement | null {
  if (!fieldElement) {
    return null;
  }

  return (
    fieldElement.querySelector('.MuiInputBase-root') ??
    fieldElement.querySelector('[role="combobox"]') ??
    fieldElement
  );
}

interface RegionalFormatSelectProps {
  value: string;
  helperText: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void | Promise<void>;
  automaticLabel: string;
}

function RegionalFormatSelect({
  value,
  helperText,
  onChange,
  automaticLabel,
}: RegionalFormatSelectProps) {
  const fieldRef = useRef<HTMLDivElement>(null);
  const [menuAnchorEl, setMenuAnchorEl] = useState<HTMLElement | null>(null);
  const [menuPlacement, setMenuPlacement] = useState<'top' | 'bottom'>(
    'bottom',
  );

  const optionCount = REGIONAL_FORMATS.length + 1;

  const handleOpen = useCallback(
    (event: SyntheticEvent) => {
      const anchorElement =
        getSelectAnchorElement(fieldRef.current) ??
        (event.currentTarget as HTMLElement | null);
      setMenuAnchorEl(anchorElement);

      if (!anchorElement) {
        return;
      }

      const triggerRect = anchorElement.getBoundingClientRect();
      const estimatedMenuHeight = Math.min(
        MENU_MAX_HEIGHT,
        optionCount * MENU_ITEM_ESTIMATED_HEIGHT + MENU_VERTICAL_PADDING,
      );
      const availableAbove = Math.max(0, triggerRect.top - VIEWPORT_PADDING);
      const availableBelow = Math.max(
        0,
        window.innerHeight - triggerRect.bottom - VIEWPORT_PADDING,
      );

      if (
        availableBelow < estimatedMenuHeight &&
        availableAbove > availableBelow
      ) {
        setMenuPlacement('top');
        return;
      }

      setMenuPlacement('bottom');
    },
    [optionCount],
  );

  const handleClose = useCallback(() => {
    setMenuAnchorEl(null);
  }, []);

  const resolvedSelectProps = useMemo(() => {
    const isTop = menuPlacement === 'top';
    const paperSx = [
      compactFilterSelectProps.MenuProps?.PaperProps?.sx,
      {
        mt: isTop ? 0 : '2px',
        mb: isTop ? '1px' : 0,
      },
    ].filter(Boolean) as SxProps<Theme>;

    return {
      ...compactFilterSelectProps,
      displayEmpty: true,
      onOpen: handleOpen,
      onClose: handleClose,
      MenuProps: {
        ...compactFilterSelectProps.MenuProps,
        anchorEl: menuAnchorEl,
        anchorOrigin: {
          vertical: isTop ? 'top' : 'bottom',
          horizontal: 'left' as const,
        },
        transformOrigin: {
          vertical: isTop ? 'bottom' : 'top',
          horizontal: 'left' as const,
        },
        PaperProps: {
          ...compactFilterSelectProps.MenuProps?.PaperProps,
          sx: paperSx,
        },
      },
    } satisfies Partial<SelectProps>;
  }, [handleClose, handleOpen, menuAnchorEl, menuPlacement]);

  return (
    <TextField
      ref={fieldRef}
      select
      fullWidth
      value={value}
      onChange={onChange}
      helperText={helperText}
      sx={(muiTheme) => ({
        ...getCompactFilterFieldSx(muiTheme),
      })}
      SelectProps={resolvedSelectProps}
    >
      <MenuItem value="" sx={compactFilterMenuItemSx}>
        <Typography variant="body2">{automaticLabel}</Typography>
      </MenuItem>
      {REGIONAL_FORMATS.map((format) => {
        const preview = getRegionalFormatPreview(format.locale);
        return (
          <MenuItem
            key={format.code}
            value={format.code}
            sx={compactFilterMenuItemSx}
          >
            <Typography variant="body2">
              {format.name} ({preview.number} | {preview.date})
            </Typography>
          </MenuItem>
        );
      })}
    </TextField>
  );
}

// Some server errors (e.g. the rate limiter) return a JSON body like
// { "error": "..." }. Pull the human message out; fall back to the raw text.
function extractErrorMessage(raw: string, fallback: string): string {
  if (!raw) {
    return fallback;
  }
  try {
    const parsed = JSON.parse(raw) as { error?: string; message?: string };
    if (parsed && typeof parsed === 'object') {
      return parsed.error || parsed.message || fallback;
    }
  } catch {
    // Not JSON — the raw text is already the message.
  }
  return raw;
}

export default function ResetPasswordPage() {
  const theme = useTheme();
  const lgUp = useMediaQuery(theme.breakpoints.up('lg'));
  const mdUp = useMediaQuery(theme.breakpoints.up('md'));

  const intl = useIntl();
  const f = (id: string) => intl.formatMessage({ id: id });

  const dispatch = useAppDispatch();
  const saveUser = EpayUserService.useSaveUser();
  const getUserById = EpayUserService.useGetUserById();
  const updateProfile = EpayUserService.useUpdateProfile();
  const requestEmailChange = EpayUserService.useRequestEmailChange();

  const { showToastMessage } = useEpayToast();

  const isAccountLinkingEnabled = useAppSelector(selectIsAccountLinkingEnabled);
  const currentUser = useAppSelector(userSelector);
  const impersonatedUser = useAppSelector(impersonatedUserSelector);
  const regionalFormat = useAppSelector(regionalFormatSelector);

  const {
    currentPasswordText,
    currentPasswordError,
    currentPasswordVisible,
    newPasswordText,
    newPasswordError,
    newPasswordVisible,
    confirmPasswordText,
    confirmPasswordError,
    confirmPasswordVisible,
    allFieldsPopulated,
    isNewPasswordValid,
    handleCurrentPasswordTextChange,
    handleCurrentPasswordVisibilityChange,
    handleNewPasswordTextChange,
    handleNewPasswordVisibilityChange,
    handleConfirmPasswordTextChange,
    handleConfirmPasswordVisibilityChange,
    handleSubmit,
  } = usePasswordForm();

  const handleRegionalFormatChange = async (
    e: ChangeEvent<HTMLInputElement>,
  ): Promise<void> => {
    const newFormat = toApiRegionalFormat(e.target.value);
    const previousFormat = regionalFormat;

    dispatch(setRegionalFormat(newFormat));

    try {
      let fullUser;

      if (impersonatedUser) {
        fullUser = impersonatedUser;
      } else if (currentUser?.userId) {
        fullUser = await getUserById(currentUser.userId);
      } else {
        throw new Error('No user available to update');
      }

      const userToUpdate: User = {
        userId: fullUser.userId,
        login: fullUser.login,
        firstName: fullUser.firstName,
        lastName: fullUser.lastName,
        email: fullUser.email,
        company: fullUser.company,
        primaryAccountType: fullUser.primaryAccountType,
        status: fullUser.status,
        role: fullUser.role,
        regionalFormat: newFormat,
      };

      await saveUser(userToUpdate);
      showToastMessage(
        'success',
        f('settings.account.regional_format.success'),
      );
    } catch (err) {
      dispatch(setRegionalFormat(previousFormat));
      showToastMessage(
        'error',
        err instanceof Error
          ? err.message
          : f('settings.account.regional_format.error'),
      );
    }
  };

  // --- Account details (name / company / email) ---------------------------
  const [baseline, setBaseline] = useState<UserView | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [company, setCompany] = useState('');
  const [email, setEmail] = useState('');
  const [updating, setUpdating] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [reauthPassword, setReauthPassword] = useState('');
  const [reauthPasswordVisible, setReauthPasswordVisible] = useState(false);
  const [reauthPasswordError, setReauthPasswordError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const applyUser = (user: UserView): void => {
      setBaseline(user);
      setFirstName(user.firstName ?? '');
      setLastName(user.lastName ?? '');
      setCompany(user.company ?? '');
      setEmail(user.email ?? '');
    };

    const load = async (): Promise<void> => {
      try {
        if (impersonatedUser) {
          applyUser(impersonatedUser);
        } else if (currentUser?.userId) {
          const fullUser = await getUserById(currentUser.userId);
          if (!cancelled) {
            applyUser(fullUser);
          }
        }
      } catch {
        // Non-fatal: leave the fields blank if the record can't be loaded.
      }
    };

    load();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.userId, impersonatedUser]);

  const currentEmail = (baseline?.email ?? '').trim().toLowerCase();
  const profileDirty =
    !!baseline &&
    (firstName.trim() !== (baseline.firstName ?? '').trim() ||
      lastName.trim() !== (baseline.lastName ?? '').trim() ||
      company.trim() !== (baseline.company ?? '').trim());
  const emailChanged =
    !!email.trim() && email.trim().toLowerCase() !== currentEmail;
  const formComplete =
    !!firstName.trim() &&
    !!lastName.trim() &&
    !!company.trim() &&
    !!email.trim();
  // Changing the email also changes the login, so it requires the current
  // password before the button can be used.
  const emailReady = !emailChanged || !!reauthPassword.trim();
  const canUpdate =
    !!baseline &&
    (profileDirty || emailChanged) &&
    formComplete &&
    emailReady &&
    !updating;

  const handleUpdate = async (): Promise<void> => {
    if (!canUpdate || !baseline) {
      return;
    }
    setEmailError('');
    setReauthPasswordError('');

    try {
      setUpdating(true);

      // Name / company are applied immediately, in place.
      if (profileDirty) {
        const updated = await updateProfile({
          userId: impersonatedUser?.userId ?? currentUser?.userId,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          company: company.trim(),
        });
        setBaseline((prev) =>
          prev
            ? {
                ...prev,
                firstName: updated.firstName,
                lastName: updated.lastName,
                company: updated.company,
              }
            : prev,
        );
      }

      // Email (which is also the login / User ID) requires verification. It is
      // only applied once the confirmation link is clicked, so keep showing the
      // current address until then.
      if (emailChanged) {
        try {
          await requestEmailChange(email.trim(), reauthPassword);
          setEmail(baseline.email ?? '');
          setReauthPassword('');
          showToastMessage(
            'success',
            f('settings.account.details.email_verification_sent'),
          );
        } catch (err) {
          // 422 means the current password was wrong — surface it on that field.
          // (A 401 is deliberately avoided server-side: it would force a logout.)
          if (err instanceof ErrorInfo && err.code === 422) {
            setReauthPasswordError(
              f('settings.account.details.current_password_incorrect'),
            );
          } else if (err instanceof ErrorInfo && err.code === 429) {
            // Rate limited — show the server message as a toast, not inline.
            showToastMessage(
              'error',
              extractErrorMessage(
                err.message,
                f('settings.account.details.rate_limited'),
              ),
            );
          } else {
            setEmailError(
              err instanceof Error
                ? extractErrorMessage(
                    err.message,
                    f('settings.account.details.email_error'),
                  )
                : f('settings.account.details.email_error'),
            );
          }
          // Surface the profile-save success (if any) separately below.
        }
      }

      if (profileDirty) {
        showToastMessage('success', f('settings.account.details.save_success'));
      }
    } catch (err) {
      showToastMessage(
        'error',
        err instanceof Error
          ? extractErrorMessage(
              err.message,
              f('settings.account.details.save_error'),
            )
          : f('settings.account.details.save_error'),
      );
    } finally {
      setUpdating(false);
    }
  };

  const borderColor = theme.components?.MuiPaper?.defaultProps?.sx?.borderColor;

  return (
    <Box sx={{ flexGrow: 1, marginTop: '1rem' }}>
      <Grid container flexDirection="column" rowGap="2rem">
        <Grid
          container
          spacing={{ xs: 2, sm: 0 }}
          paddingBottom="2rem"
          borderBottom={`1px solid ${borderColor}`}
        >
          <EpayPageHeaderText
            header={f('settings.account.header')}
            subheader={f('settings.account.subheader')}
          />
        </Grid>

        {/* Profile section */}
        <Grid
          item
          container
          direction="column"
          rowGap="1.5rem"
          paddingX={lgUp ? '2rem' : undefined}
          paddingBottom="2rem"
          borderBottom={`1px solid ${borderColor}`}
        >
          <Grid item>
            <Typography variant="h3">
              {f('settings.account.profile')}
            </Typography>
          </Grid>

          {/* First Name */}
          <Grid item>
            <Grid
              container
              direction={lgUp ? 'row' : 'column'}
              alignItems={lgUp ? 'center' : undefined}
              rowSpacing={!lgUp ? '0.35rem' : undefined}
            >
              <Grid item xs={12} lg={6} display="flex">
                <Typography variant="fieldHeader">
                  {f('settings.account.details.first_name')}
                </Typography>
                <Typography variant="fieldHeader" color="red" ml="4px">
                  {f('app.common.required_indicator')}
                </Typography>
              </Grid>
              <Grid item xs={12} lg={6}>
                <TextField
                  fullWidth
                  value={firstName}
                  error={!firstName.trim()}
                  onChange={(e) => setFirstName(e.target.value)}
                  sx={(muiTheme) => ({
                    ...getCompactFilterFieldSx(muiTheme),
                  })}
                />
              </Grid>
            </Grid>
          </Grid>

          {/* Last Name */}
          <Grid item>
            <Grid
              container
              direction={lgUp ? 'row' : 'column'}
              alignItems={lgUp ? 'center' : undefined}
              rowSpacing={!lgUp ? '0.35rem' : undefined}
            >
              <Grid item xs={12} lg={6} display="flex">
                <Typography variant="fieldHeader">
                  {f('settings.account.details.last_name')}
                </Typography>
                <Typography variant="fieldHeader" color="red" ml="4px">
                  {f('app.common.required_indicator')}
                </Typography>
              </Grid>
              <Grid item xs={12} lg={6}>
                <TextField
                  fullWidth
                  value={lastName}
                  error={!lastName.trim()}
                  onChange={(e) => setLastName(e.target.value)}
                  sx={(muiTheme) => ({
                    ...getCompactFilterFieldSx(muiTheme),
                  })}
                />
              </Grid>
            </Grid>
          </Grid>

          {/* Company */}
          <Grid item>
            <Grid
              container
              direction={lgUp ? 'row' : 'column'}
              alignItems={lgUp ? 'center' : undefined}
              rowSpacing={!lgUp ? '0.35rem' : undefined}
            >
              <Grid item xs={12} lg={6} display="flex">
                <Typography variant="fieldHeader">
                  {f('settings.account.details.company')}
                </Typography>
                <Typography variant="fieldHeader" color="red" ml="4px">
                  {f('app.common.required_indicator')}
                </Typography>
              </Grid>
              <Grid item xs={12} lg={6}>
                <TextField
                  fullWidth
                  value={company}
                  error={!company.trim()}
                  onChange={(e) => setCompany(e.target.value)}
                  sx={(muiTheme) => ({
                    ...getCompactFilterFieldSx(muiTheme),
                  })}
                />
              </Grid>
            </Grid>
          </Grid>

          {/* Email — also the login / User ID */}
          <Grid item>
            <Grid
              container
              direction={lgUp ? 'row' : 'column'}
              alignItems={lgUp ? 'flex-start' : undefined}
              rowSpacing={!lgUp ? '0.35rem' : undefined}
            >
              <Grid item xs={12} lg={6} display="flex" mt={lgUp ? '1rem' : 0}>
                <Typography variant="fieldHeader">
                  {f('settings.account.details.email')}
                </Typography>
                <Typography variant="fieldHeader" color="red" ml="4px">
                  {f('app.common.required_indicator')}
                </Typography>
              </Grid>
              <Grid item xs={12} lg={6}>
                <TextField
                  fullWidth
                  type="email"
                  value={email}
                  error={!!emailError}
                  helperText={
                    emailError || f('settings.account.details.email.helper')
                  }
                  disabled={!!impersonatedUser}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setEmailError('');
                  }}
                  sx={(muiTheme) => ({
                    ...getCompactFilterFieldSx(muiTheme),
                  })}
                />
              </Grid>
            </Grid>
          </Grid>

          {/* Current password — required to change the email (= login) */}
          {emailChanged && (
            <PasswordField
              label={f('settings.account.details.current_password')}
              value={reauthPassword}
              visible={reauthPasswordVisible}
              error={reauthPasswordError}
              required
              onChange={(e) => {
                setReauthPassword(e.target.value);
                setReauthPasswordError('');
              }}
              onVisibilityToggle={() =>
                setReauthPasswordVisible((visible) => !visible)
              }
            />
          )}

          {/* Single update for all user details */}
          <Grid
            item
            container
            direction="row"
            marginTop="8px"
            sx={{ justifyContent: { xs: 'space-between', sm: 'flex-end' } }}
          >
            <Grid item>
              <Button
                variant="contained"
                color="primary"
                size="small"
                onClick={handleUpdate}
                disabled={!canUpdate}
                sx={{
                  width: '12rem',
                  ...(canUpdate && {
                    border: `1px solid ${theme.palette.buttonBorder.buttonBorderColor}`,
                    '&:hover': {
                      border: `1px solid ${theme.palette.buttonBorder.buttonBorderHoverColor}`,
                    },
                  }),
                }}
              >
                {f('settings.account.details.save')}
              </Button>
            </Grid>
          </Grid>
        </Grid>

        {/* Password change section */}
        <Grid
          item
          container
          direction="column"
          rowGap="1.5rem"
          paddingX={lgUp ? '2rem' : undefined}
        >
          <Grid item>
            <Typography variant="h3">
              {f('settings.account.update_password')}
            </Typography>
          </Grid>

          <PasswordField
            label={f('settings.account.update_password.password_current.label')}
            value={currentPasswordText}
            visible={currentPasswordVisible}
            error={currentPasswordError}
            required
            onChange={handleCurrentPasswordTextChange}
            onVisibilityToggle={handleCurrentPasswordVisibilityChange}
          />
          <PasswordField
            label={f('settings.account.update_password.password_new.label1')}
            value={newPasswordText}
            visible={newPasswordVisible}
            error={newPasswordError}
            required
            onChange={handleNewPasswordTextChange}
            onVisibilityToggle={handleNewPasswordVisibilityChange}
          />
          <PasswordField
            label={f('settings.account.update_password.password_new.label2')}
            value={confirmPasswordText}
            visible={confirmPasswordVisible}
            error={confirmPasswordError}
            required
            onChange={handleConfirmPasswordTextChange}
            onVisibilityToggle={handleConfirmPasswordVisibilityChange}
          />

          <Grid
            item
            container
            direction="row"
            columnGap={mdUp ? '1.5rem' : undefined}
            marginTop="8px"
            sx={{ justifyContent: { xs: 'space-between', sm: 'flex-end' } }}
          >
            <Grid item>
              <Button
                variant="contained"
                color="primary"
                size="small"
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
                {f('app.common.update')}
              </Button>
            </Grid>
          </Grid>
        </Grid>

        {/* Regional format section */}
        <Grid
          item
          container
          direction="column"
          rowGap="1.5rem"
          paddingX={lgUp ? '2rem' : undefined}
          paddingTop="2rem"
          borderTop={`1px solid ${borderColor}`}
        >
          <Grid item>
            <Typography variant="h3">
              {f('settings.account.regional_format')}
            </Typography>
          </Grid>
          <Grid item>
            <Grid
              container
              direction={lgUp ? 'row' : 'column'}
              alignItems={lgUp ? 'center' : undefined}
              rowSpacing={!lgUp ? '0.35rem' : undefined}
            >
              <Grid item xs={12} lg={6}>
                <Typography variant="fieldHeader">
                  {f('settings.account.regional_format.label')}
                </Typography>
              </Grid>
              <Grid item xs={12} lg={6}>
                <RegionalFormatSelect
                  value={toDropdownRegionalFormat(regionalFormat)}
                  onChange={handleRegionalFormatChange}
                  helperText={f('settings.account.regional_format.helper')}
                  automaticLabel={f(
                    'settings.account.regional_format.automatic',
                  )}
                />
              </Grid>
            </Grid>
          </Grid>
        </Grid>

        {/* Linked SAP accounts section */}
        {isAccountLinkingEnabled &&
          currentUser?.userId &&
          !impersonatedUser && (
            <Grid
              item
              container
              direction="column"
              rowGap="1.5rem"
              paddingX={lgUp ? '2rem' : undefined}
            >
              <Grid
                item
                paddingTop="2rem"
                borderTop={`1px solid ${borderColor}`}
              >
                <Typography variant="h3">
                  {f('settings.account.linked_accounts')}
                </Typography>
              </Grid>
              <Grid item>
                <LinkedSapAccountsCardsSection userId={currentUser.userId} />
              </Grid>
            </Grid>
          )}
      </Grid>
    </Box>
  );
}
