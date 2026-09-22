import { UserView } from 'types/User';
import { Theme } from '@mui/system';
import { MEDIA_DOWN_MD } from 'shared/theme/breakpoints';
import styled from '@emotion/styled';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Button from '@mui/material/Button';
import UserStatus from 'types/UserStatus';
import MenuItem from '@mui/material/MenuItem';
import Tooltip from '@mui/material/Tooltip';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import { LoggedInUser } from 'types/LoggedInUser';
import DeleteIcon from '@mui/icons-material/Delete';
import SwitchAccountOutlinedIcon from '@mui/icons-material/SwitchAccountOutlined';
import { EpayDataTableColumnDefinition } from 'shared/components/EpayDataTable';
import { FaAngleDown } from 'react-icons/fa6';
import {
  compactFilterMenuItemSx,
  compactFilterSelectProps,
} from 'shared/components/compactFilterSelectStyles';
import { useAutoFlipSelect } from 'shared/components/useAutoFlipSelect';

interface ActionsHelperProps {
  user: UserView;
  currentUser: LoggedInUser;
  impersonatedUserId: string;
  canIImpersonate: boolean;
  canIManageUsers: boolean;
  doFormat: (id: string) => string;
  handleImpersonate: (userId: string) => void;
  handleDelete: (userId: string) => void;
}

const getActionsDisplayContent = (props: ActionsHelperProps) => {
  const {
    user,
    currentUser,
    impersonatedUserId,
    canIImpersonate,
    canIManageUsers,
    doFormat,
    handleImpersonate,
    handleDelete,
  } = props;
  const userIdToImpersonate = impersonatedUserId
    ? impersonatedUserId
    : (user.userId ?? '');
  const enableImpersonation =
    canIImpersonate &&
    currentUser.userId !== user.userId &&
    (!impersonatedUserId || impersonatedUserId === user.userId);
  const impersonateText = doFormat('user.impersonate');
  const deleteText = doFormat('user.action.delete');

  return (
    <Grid
      container
      direction="row"
      justifyContent="space-evenly"
      alignItems="center"
      columnGap="1rem"
    >
      <Grid item>
        <IconButton
          title={impersonateText}
          aria-label={impersonateText}
          disabled={!enableImpersonation}
          onClick={() => handleImpersonate(userIdToImpersonate)}
          sx={{ padding: 0 }}
        >
          <SwitchAccountOutlinedIcon
            sx={{ cursor: 'pointer', fontSize: '1.5rem' }}
          />
        </IconButton>
      </Grid>
      <Grid item>
        <IconButton
          color="primary"
          title={deleteText}
          aria-label={deleteText}
          disabled={!canIManageUsers}
          onClick={() => handleDelete(user.userId ?? '')}
          sx={{ padding: 0 }}
        >
          <DeleteIcon sx={{ fontSize: '1.5rem' }} />
        </IconButton>
      </Grid>
    </Grid>
  );
};

interface StatusDisplayHelperProps {
  theme: Theme;
  doFormat: (id: string) => string;
  sapStatus: string;
}

const getStatusDisplayContent = (props: StatusDisplayHelperProps) => {
  const { theme, doFormat, sapStatus } = props;
  const status = sapStatus.toLowerCase();
  const statusResId = UserStatus.getResourceId(status);

  if (statusResId) {
    const statusText = doFormat(statusResId);
    const color =
      status === 'active'
        ? theme.palette.text.userActive
        : theme.palette.text.userInactive;
    return (
      <Typography variant="body2" color={`${color}`}>
        {statusText}
      </Typography>
    );
  } else {
    return <Typography variant="body2" />;
  }
};

const SelectFlex = styled('div')(() => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-start',
  height: '100%',
  width: '100%',
  minWidth: 0,
}));

const SelectText = styled('span')(() => ({
  display: 'block',
  flex: 1,
  minWidth: 0,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
}));

const mobileDropdownTextSx = {
  [MEDIA_DOWN_MD]: {
    fontSize: '14px',
    fontWeight: 500,
  },
} as const;

const mobileDropdownMenuItemSx = {
  [MEDIA_DOWN_MD]: {
    minHeight: 32,
    py: 0.5,
    px: 2,
    display: 'flex',
    alignItems: 'center',
  },
} as const;

const linkedAccountMenuWidth = {
  xs: '10rem',
  sm: '15rem',
  md: '14rem',
  lg: '15rem',
} as const;

const linkedAccountFieldSx = {
  width: '100%',
  maxWidth: { xs: '13rem', sm: '15rem', md: '14rem', lg: '15rem' },
  '& .MuiInputBase-input.Mui-disabled': mobileDropdownTextSx,
  '& .MuiInputBase-root': {
    [MEDIA_DOWN_MD]: {
      paddingLeft: 0,
      paddingRight: '0.625rem',
    },
  },
} as const;

const linkedAccountMenuPaperSx = {
  width: linkedAccountMenuWidth,
  maxWidth: linkedAccountMenuWidth,
  overflowX: 'hidden',
  overflowY: 'auto',
  [MEDIA_DOWN_MD]: {
    maxHeight: '260px',
  },
} as const;

const linkedAccountMenuItemSx = {
  ...compactFilterMenuItemSx,
  ...mobileDropdownMenuItemSx,
  width: '100%',
  minWidth: 0,
} as const;

const linkedAccountMenuItemLabelSx = {
  display: 'block',
  minWidth: 0,
  width: '100%',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
} as const;

interface LinkedAccountOption {
  account: string;
  name: string;
}

function LinkedAccountsSelect({
  sapAccounts,
  noAccountsLabel,
}: {
  sapAccounts: LinkedAccountOption[];
  noAccountsLabel: string;
}) {
  const { fieldRef, resolvedSelectProps } = useAutoFlipSelect({
    optionCount: sapAccounts.length,
    selectProps: {
      ...compactFilterSelectProps,
      IconComponent: FaAngleDown,
      sx: {
        '& .MuiSelect-select': {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-start',
          textAlign: 'left',
          height: '100%',
          minHeight: 0,
          minWidth: 0,
          overflow: 'hidden',
          whiteSpace: 'nowrap',
          textOverflow: 'ellipsis',
          paddingLeft: '0 !important',
          paddingTop: '0 !important',
          paddingBottom: '0 !important',
          paddingRight: '14px !important',
          ...mobileDropdownTextSx,
        },
      },
      renderValue: (selected) => {
        const sap = sapAccounts.find((account) => account.account === selected);
        if (!sap) return '';

        return (
          <SelectFlex>
            <Box
              component={SelectText}
              sx={{
                ...mobileDropdownTextSx,
                paddingRight: 0,
                textAlign: 'left',
                marginLeft: {
                  xs: '15px',
                  md: 0,
                  lg: 0,
                },
                marginTop: {
                  xs: 0,
                  md: 0,
                  lg: '2px',
                },
              }}
            >
              {sap.account} - {sap.name}
            </Box>
          </SelectFlex>
        );
      },
    },
    paperSx: linkedAccountMenuPaperSx,
  });

  if (sapAccounts.length === 0) {
    return (
      <TextField
        size="small"
        variant="outlined"
        value={noAccountsLabel}
        disabled
        sx={linkedAccountFieldSx}
      />
    );
  }

  return (
    <TextField
      ref={fieldRef}
      select
      size="small"
      variant="outlined"
      value={sapAccounts[0]?.account ?? ''}
      sx={linkedAccountFieldSx}
      SelectProps={resolvedSelectProps}
    >
      {sapAccounts.map((sap, idx) => (
        <MenuItem key={idx} value={sap.account} sx={linkedAccountMenuItemSx}>
          <Box component="span" sx={linkedAccountMenuItemLabelSx}>
            {sap.account} - {sap.name}
          </Box>
        </MenuItem>
      ))}
    </TextField>
  );
}

export interface UserColumnsConfig {
  f: (id: string) => string;
  theme: Theme;
  currentUser: LoggedInUser;
  impersonatedUserId: string;
  canImpersonate: boolean;
  canManageUsers: boolean;
  handleUserClick: (user: UserView) => void;
  handleImpersonateClick: (userId: string) => void;
  handleDeleteClick: (userId: string) => void;
}

export function buildUserColumns({
  f,
  theme,
  currentUser,
  impersonatedUserId,
  canImpersonate,
  canManageUsers,
  handleUserClick,
  handleImpersonateClick,
  handleDeleteClick,
}: UserColumnsConfig): EpayDataTableColumnDefinition<UserView>[] {
  return [
    {
      header: f('user.loginid'),
      field: 'login',
      sortable: true,
      alignment: 'center',
      display: { xs: 'none', sm: 'none', md: 'table-cell', lg: 'table-cell' },
      renderer: (user: UserView) => {
        const login = user.login || '';
        return (
          <Tooltip title={login} enterTouchDelay={200}>
            <span
              style={{
                display: 'inline-flex',
                minWidth: 0,
                maxWidth: '100%',
              }}
            >
              <Button
                variant="link"
                size="small"
                disabled={!canManageUsers}
                onClick={() => handleUserClick(user)}
                sx={{
                  maxWidth: { md: '8rem', lg: '14rem' },
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                <span>{login}</span>
              </Button>
            </span>
          </Tooltip>
        );
      },
    },
    {
      header: f('user.name'),
      field: 'firstName',
      sortable: true,
      alignment: 'center',
      display: { xs: 'none', sm: 'none', md: 'table-cell', lg: 'table-cell' },
      renderer: (user: UserView) =>
        user.firstName || user.lastName
          ? `${''}${user.firstName} ${user.lastName}${''}`
          : '',
    },
    {
      header: f('user.email'),
      field: 'email',
      sortable: true,
      alignment: 'center',
      display: { xs: 'none', sm: 'none', md: 'table-cell', lg: 'table-cell' },
      renderer: (user: UserView) => {
        const email = user.email || '';
        return (
          <Tooltip title={email} enterTouchDelay={200}>
            <Typography
              textOverflow="ellipsis"
              overflow="hidden"
              whiteSpace="nowrap"
              maxWidth={{ md: '8rem', lg: '14rem' }}
              variant="body2"
            >
              {email}
            </Typography>
          </Tooltip>
        );
      },
    },
    {
      header: f('user.user_role'),
      field: 'role',
      sortable: true,
      alignment: 'center',
      width: { sm: '8rem', md: '4rem', lg: '8rem' },
      display: { xs: 'none', sm: 'none', md: 'table-cell', lg: 'table-cell' },
    },
    {
      header: f('user.status'),
      field: 'status',
      sortable: true,
      alignment: 'center',
      width: { md: '7.5rem', lg: 'inherit' },
      display: { xs: 'none', sm: 'none', md: 'table-cell', lg: 'table-cell' },
      renderer: (user: UserView) =>
        getStatusDisplayContent({
          theme,
          doFormat: f,
          sapStatus: user.status ?? '',
        }),
    },
    {
      header: f('user.sapaccount'),
      field: null,
      sortable: false,
      alignment: 'center',
      width: { xs: '13rem', sm: '15rem', md: '14rem', lg: '15rem' },
      display: { xs: 'none', sm: 'none', md: 'table-cell', lg: 'table-cell' },
      renderer: (user: UserView) => {
        const sapAccounts =
          user.linkedAccounts?.map((account) => ({
            account: account.primaryAccount,
            name: account.name,
          })) ?? [];

        return (
          <LinkedAccountsSelect
            sapAccounts={sapAccounts}
            noAccountsLabel={f('user.noaccounts')}
          />
        );
      },
    },
    {
      header: '',
      field: null,
      sortable: true,
      alignment: 'center',
      width: '8rem',
      display: { xs: 'none', sm: 'none', md: 'table-cell', lg: 'table-cell' },
      renderer: (user: UserView) =>
        getActionsDisplayContent({
          user,
          currentUser,
          impersonatedUserId,
          canIImpersonate: canImpersonate,
          canIManageUsers: canManageUsers,
          doFormat: f,
          handleImpersonate: handleImpersonateClick,
          handleDelete: handleDeleteClick,
        }),
    },
  ];
}
