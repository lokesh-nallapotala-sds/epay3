import {
  ChangeEvent,
  MouseEvent,
  ReactNode,
  SyntheticEvent,
  useCallback,
  useMemo,
  useRef,
  useState,
} from 'react';

import { Box } from '@mui/system';
import Grid from '@mui/material/Grid';
import { mobileCardStyles } from 'shared/components/common/mobileCardStyles';
import Switch from '@mui/material/Switch';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import type { SelectProps } from '@mui/material/Select';
import type { SxProps, Theme } from '@mui/material/styles';
import { useTheme } from '@mui/material/styles';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import VisibilityOutlined from '@mui/icons-material/VisibilityOutlined';
import VisibilityOffOutlined from '@mui/icons-material/VisibilityOffOutlined';
import { useFormat } from 'hooks/useFormat';
import {
  compactFilterMenuItemSx,
  compactFilterSelectProps,
} from 'shared/components/compactFilterSelectStyles';
import { getCompactFilterFieldSx } from 'shared/components/compactFilterFieldStyles';

export interface SelectOption {
  key: string;
  displayText: string;
}

export interface UserDetailsFormProps {
  userId: string;

  login: string;
  loginError: string;
  onLoginChange: (e: ChangeEvent<HTMLInputElement>) => void;

  firstName: string;
  firstNameError: string;
  onFirstNameChange: (e: ChangeEvent<HTMLInputElement>) => void;

  lastName: string;
  lastNameError: string;
  onLastNameChange: (e: ChangeEvent<HTMLInputElement>) => void;

  email: string;
  emailError: string;
  onEmailChange: (e: ChangeEvent<HTMLInputElement>) => void;

  company: string;
  companyError: string;
  onCompanyChange: (e: ChangeEvent<HTMLInputElement>) => void;

  status: string;
  statusError: string;
  onStatusChange: (e: ChangeEvent<HTMLInputElement>) => void;

  accountType: string;
  accountTypeError: string;
  onAccountTypeChange: (e: ChangeEvent<HTMLInputElement>) => void;

  role: string;
  roleError: string;
  onRoleChange: (e: ChangeEvent<HTMLInputElement>) => void;
  roleFieldDisabled: boolean;

  editingPassword: boolean;
  onEditingPasswordChange: (e: ChangeEvent<HTMLInputElement>) => void;

  password: string;
  passwordError: string;
  onPasswordChange: (e: ChangeEvent<HTMLInputElement>) => void;

  passwordVisible: boolean;
  onPasswordVisibilityClick: () => void;
  onPasswordVisibilityMouseDown: (e: MouseEvent<HTMLButtonElement>) => void;

  statuses: SelectOption[];
  roles: SelectOption[];
  accountTypes: SelectOption[];

  onSave: (e: MouseEvent<HTMLButtonElement>) => void;
  onCancel: () => void;
}

type FieldOrder = Record<string, number>;

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

interface UserSelectFieldProps {
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  error: string;
  options: SelectOption[];
  tabIndex: number;
  disabled?: boolean;
}

function UserSelectField({
  value,
  onChange,
  error,
  options,
  tabIndex,
  disabled = false,
}: UserSelectFieldProps) {
  const fieldRef = useRef<HTMLDivElement>(null);
  const [menuAnchorEl, setMenuAnchorEl] = useState<HTMLElement | null>(null);
  const [menuPlacement, setMenuPlacement] = useState<'top' | 'bottom'>(
    'bottom',
  );

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
        options.length * MENU_ITEM_ESTIMATED_HEIGHT + MENU_VERTICAL_PADDING,
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
    [options.length],
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
      sx={(muiTheme) => ({
        ...getCompactFilterFieldSx(muiTheme),
      })}
      value={value}
      onChange={onChange}
      error={!!error}
      helperText={error}
      tabIndex={tabIndex}
      disabled={disabled}
      SelectProps={resolvedSelectProps}
    >
      {options.map((option) => (
        <MenuItem
          key={option.key}
          value={option.key}
          sx={compactFilterMenuItemSx}
        >
          <Typography variant="body2">{option.displayText}</Typography>
        </MenuItem>
      ))}
    </TextField>
  );
}

export default function UserDetailsForm({
  login,
  loginError,
  onLoginChange,
  firstName,
  firstNameError,
  onFirstNameChange,
  lastName,
  lastNameError,
  onLastNameChange,
  email,
  emailError,
  onEmailChange,
  company,
  companyError,
  onCompanyChange,
  status,
  statusError,
  onStatusChange,
  accountType,
  accountTypeError,
  onAccountTypeChange,
  role,
  roleError,
  onRoleChange,
  roleFieldDisabled,
  editingPassword,
  onEditingPasswordChange,
  password,
  passwordError,
  onPasswordChange,
  passwordVisible,
  onPasswordVisibilityClick,
  onPasswordVisibilityMouseDown,
  statuses,
  roles,
  accountTypes,
  onSave,
  onCancel,
}: UserDetailsFormProps) {
  const theme = useTheme();
  const f = useFormat();

  const paperBorderColor =
    (
      theme.components?.MuiPaper?.defaultProps?.sx as
        | { borderColor?: string }
        | undefined
    )?.borderColor ?? '#E0E0E0';

  const requiredIndicator = (
    <Typography variant="fieldHeader" color="red" ml="4px">
      {f('app.common.required_indicator')}
    </Typography>
  );

  const passwordAdornment = (
    <InputAdornment position="end">
      <IconButton
        edge="end"
        tabIndex={-1}
        onClick={onPasswordVisibilityClick}
        onMouseDown={onPasswordVisibilityMouseDown}
      >
        {passwordVisible ? <VisibilityOffOutlined /> : <VisibilityOutlined />}
      </IconButton>
    </InputAdornment>
  );

  // Single markup for all breakpoints: two columns on lg, one below.
  // `order` keeps the lg pairing (Login|Status, First|Type, ...) while the
  // single column groups text fields first, then selects, then password.
  const fieldBlock = (
    order: FieldOrder,
    labelId: string,
    control: ReactNode,
    required = true,
  ) => (
    <Box
      sx={{
        order,
        display: 'flex',
        flexDirection: 'column',
        rowGap: '.35rem',
        minWidth: 0,
      }}
    >
      <Box display="flex">
        <Typography variant="fieldHeader">{f(labelId)}</Typography>
        {required && requiredIndicator}
      </Box>
      {control}
    </Box>
  );

  return (
    <Box
      display="flex"
      width="100%"
      minWidth={0}
      border={`1px solid ${paperBorderColor}`}
      borderRadius={`${theme.shape.borderRadius}px`}
      sx={{ backgroundColor: theme.palette.background.paper }}
    >
      <Grid
        container
        direction="column"
        rowGap="1.5rem"
        paddingY="1.25rem"
        minWidth={0}
        width="100%"
      >
        <Grid
          item
          paddingX={{ xs: mobileCardStyles.header.bleedX, lg: '1.5rem' }}
          paddingBottom="1rem"
          sx={{
            borderBottomWidth: '1px',
            borderBottomStyle: 'solid',
            borderBottomColor: paperBorderColor,
          }}
        >
          <Typography variant="h5">{f('user.details')}</Typography>
        </Grid>

        <Grid item>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' },
              columnGap: '3rem',
              rowGap: '1.25rem',
              paddingX: { xs: mobileCardStyles.header.bleedX, lg: '1.5rem' },
            }}
          >
            {fieldBlock(
              { xs: 1, lg: 1 },
              'user.loginid',
              <TextField
                type="text"
                fullWidth
                sx={(muiTheme) => ({
                  ...getCompactFilterFieldSx(muiTheme),
                })}
                value={login}
                onChange={onLoginChange}
                error={!!loginError}
                helperText={loginError}
                tabIndex={11}
              />,
            )}
            {fieldBlock(
              { xs: 6, lg: 2 },
              'user.status',
              <UserSelectField
                value={status}
                onChange={onStatusChange}
                error={statusError}
                options={statuses}
                tabIndex={21}
              />,
            )}
            {fieldBlock(
              { xs: 2, lg: 3 },
              'user.givenname',
              <TextField
                type="text"
                fullWidth
                sx={(muiTheme) => ({
                  ...getCompactFilterFieldSx(muiTheme),
                })}
                value={firstName}
                onChange={onFirstNameChange}
                error={!!firstNameError}
                helperText={firstNameError}
                tabIndex={12}
              />,
            )}
            {fieldBlock(
              { xs: 7, lg: 4 },
              'user.accounttype',
              <UserSelectField
                value={accountType}
                onChange={onAccountTypeChange}
                error={accountTypeError}
                options={accountTypes}
                tabIndex={22}
              />,
            )}
            {fieldBlock(
              { xs: 3, lg: 5 },
              'user.surname',
              <TextField
                type="text"
                fullWidth
                sx={(muiTheme) => ({
                  ...getCompactFilterFieldSx(muiTheme),
                })}
                value={lastName}
                onChange={onLastNameChange}
                error={!!lastNameError}
                helperText={lastNameError}
                tabIndex={13}
              />,
            )}
            {fieldBlock(
              { xs: 8, lg: 6 },
              'user.role',
              <UserSelectField
                value={role}
                onChange={onRoleChange}
                error={roleError}
                options={roles}
                tabIndex={23}
                disabled={roleFieldDisabled}
              />,
            )}
            {fieldBlock(
              { xs: 4, lg: 7 },
              'user.email',
              <TextField
                type="text"
                fullWidth
                sx={(muiTheme) => ({
                  ...getCompactFilterFieldSx(muiTheme),
                })}
                value={email}
                onChange={onEmailChange}
                error={!!emailError}
                helperText={emailError}
                tabIndex={14}
              />,
            )}
            {fieldBlock(
              { xs: 9, lg: 8 },
              'user.password.set',
              <Box
                sx={{ display: 'flex', alignItems: 'center', height: '48px' }}
              >
                <Switch
                  checked={editingPassword}
                  onChange={onEditingPasswordChange}
                  tabIndex={24}
                />
              </Box>,
              false,
            )}
            {fieldBlock(
              { xs: 5, lg: 9 },
              'user.company',
              <TextField
                type="text"
                fullWidth
                sx={(muiTheme) => ({
                  ...getCompactFilterFieldSx(muiTheme),
                })}
                value={company}
                onChange={onCompanyChange}
                error={!!companyError}
                helperText={companyError}
                tabIndex={15}
              />,
            )}
            {editingPassword &&
              fieldBlock(
                { xs: 10, lg: 10 },
                'user.password',
                <TextField
                  type={passwordVisible ? 'text' : 'password'}
                  fullWidth
                  sx={(muiTheme) => ({
                    ...getCompactFilterFieldSx(muiTheme),
                  })}
                  value={password}
                  onChange={onPasswordChange}
                  error={!!passwordError}
                  helperText={passwordError}
                  tabIndex={25}
                  inputProps={{
                    name: 'editNewPassword',
                    id: 'editNewPassword',
                    autoComplete: 'editnew-password',
                  }}
                  InputProps={{ endAdornment: passwordAdornment }}
                />,
              )}
          </Box>
        </Grid>

        {/* Save / Cancel buttons */}
        <Grid
          item
          paddingX={{ xs: mobileCardStyles.header.bleedX, lg: '1.5rem' }}
          paddingTop=".25rem"
        >
          <Grid
            container
            direction="row"
            justifyContent="flex-end"
            columnGap="1.5rem"
            rowGap="1rem"
            flexWrap="wrap"
          >
            <Grid item>
              <Button
                variant="outlined"
                color="secondary"
                onClick={onCancel}
                sx={{ width: '8rem' }}
              >
                {f('app.common.cancel')}
              </Button>
            </Grid>
            <Grid item>
              <Button
                variant="contained"
                color="primary"
                onClick={onSave}
                sx={{
                  width: 'auto',
                  border: `1px solid ${theme.palette.buttonBorder.buttonBorderColor}`,
                  '&:hover': {
                    border: `1px solid ${theme.palette.buttonBorder.buttonBorderHoverColor}`,
                  },
                }}
              >
                {f('user.action.save')}
              </Button>
            </Grid>
          </Grid>
        </Grid>
      </Grid>
    </Box>
  );
}
