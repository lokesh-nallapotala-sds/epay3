import { MouseEvent, useState } from 'react';

import { useIntl } from 'react-intl';
import { useLocation, useNavigate } from 'react-router';

import { useTheme } from '@mui/system';
import { styled } from '@mui/material/styles';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import { useAppSelector } from 'redux/hooks';
import { useTheme as useMuiTheme } from '@mui/material/styles';
import LaunchOutlinedIcon from '@mui/icons-material/LaunchOutlined';
import { useImpersonation } from 'providers/EpayImpersonationProvider';
import ExpandMoreOutlined from '@mui/icons-material/ExpandMoreOutlined';
import {
  AppBar,
  Avatar,
  Badge,
  Box,
  Grid,
  IconButton,
  MenuItem,
  Paper,
  TextField,
  Toolbar,
  Tooltip,
  Typography,
  useMediaQuery,
} from '@mui/material';
import {
  languageSelector,
  selectUserState as userSelector,
} from 'redux/reducers';
import { useUiState } from 'providers/UiStateProvider';

import HeaderMenu from './HeaderMenu';
import AccountSearchDialog from './AccountSearchDialog';
import { getAccountIdentity } from '../../utilities/utilities';
import { getCompactFilterFieldSx } from 'shared/components/compactFilterFieldStyles';
import {
  normalizeCompanyCode,
  useHeaderAccounts,
} from 'hooks/useHeaderAccounts';

const StyledBadge = styled(Badge)(({ theme }) => ({
  '& .MuiBadge-badge': {
    backgroundColor: '#44b700',
    color: '#44b700',
    boxShadow: `0 0 0 2px ${theme.palette.background.paper}`,
  },
}));

interface CardListBoxProps {
  width?: string;
}

const CardListBox = styled(Paper)<CardListBoxProps>(() => ({
  padding: '0.25rem 1rem',
  minWidth: '200px',
  position: 'relative',
}));

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const { drawerOpen, useMobile, useOverlayDrawer, setDrawerOpen } =
    useUiState();

  const theme = useTheme();
  const muiTheme = useMuiTheme();
  const useStackedHeaderControls = useMediaQuery(
    muiTheme.breakpoints.down('md'),
  );

  const intl = useIntl();
  const f = (id: string, values?: Record<string, string | number | boolean>) =>
    intl.formatMessage({ id, defaultMessage: id }, values);

  const { impersonatedUser, unimpersonate } = useImpersonation();
  const user = useAppSelector(userSelector);
  const selectedLanguage = useAppSelector(languageSelector);
  const [menuAnchorEl, setMenuAnchorEl] = useState<undefined | HTMLElement>();

  const {
    accounts,
    account,
    accountSelectOpen,
    setAccountSelectOpen,
    openAccountSearch,
    setOpenAccountSearch,
    selectedCompanyCode,
    distinctAccounts,
    companyCodeOptions,
    changeSelectedAccount,
    changeSelectedCompanyCode,
    handleAccountSearchClick,
    handleAccountSelectedFromSearch,
    getCompanyCodeDisplayParts,
  } = useHeaderAccounts();

  const shouldShiftLayout = drawerOpen && !useOverlayDrawer;
  const DrawerTransitions = muiTheme.transitions.create(['margin', 'width'], {
    easing: muiTheme.transitions.easing.sharp,
    duration: muiTheme.transitions.duration.shortest,
  });
  const MarginLeftTransitions = `${shouldShiftLayout ? 240 : 0}px`;
  const WidthTransitions = shouldShiftLayout ? `calc(100% - ${240}px)` : '100%';

  const AccountSelectPaper = (props: any) => {
    const { children, ref, ...other } = props;

    return (
      <Paper
        ref={ref}
        {...other}
        sx={{
          width: 200,
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            maxHeight: 50 * 4,
            overflowY: 'auto',
          }}
        >
          {children}
        </Box>

        <Box
          onClick={(e) => {
            e.stopPropagation();
            handleAccountSearchClick();
          }}
          sx={{
            height: 30,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 12px',
            borderTop: '1px solid #e0e0e0',
            background: '#fff',
            cursor: 'pointer',
            transition: 'background 0.2s ease',
            '&:hover': {
              background: '#f5f7fa',
            },
          }}
        >
          <Typography variant="h5" lineHeight={1.2}>
            {f('account.search.menuitem')}
          </Typography>
          <LaunchOutlinedIcon
            fontSize="small"
            sx={{
              color: '#666D80',
            }}
          />
        </Box>
      </Paper>
    );
  };

  const handleAvatarClick = (event: MouseEvent<HTMLButtonElement>) => {
    setMenuAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setMenuAnchorEl(undefined);
  };

  const renderAccountSelectors = (mobile: boolean) => {
    if (accounts?.length > 0) {
      return (
        <Grid
          container
          direction={mobile ? 'column' : 'row'}
          spacing={1.5}
          wrap="nowrap"
        >
          <Grid item xs={12} sm="auto">
            <TextField
              select
              fullWidth={mobile}
              value={account?.primaryAcct ?? ''}
              onChange={changeSelectedAccount}
              sx={{
                ...getCompactFilterFieldSx(muiTheme),
                width: mobile ? '100%' : { xs: '240px', sm: '286px' },
                marginLeft: mobile ? 0 : '2px',
              }}
              InputProps={{
                sx: {
                  '& .MuiSelect-select': {
                    paddingLeft: '3px',
                  },
                },
              }}
              SelectProps={{
                IconComponent: ExpandMoreOutlined,
                open: accountSelectOpen,
                onOpen: () => setAccountSelectOpen(true),
                onClose: () => setAccountSelectOpen(false),
                MenuProps: {
                  PaperProps: {
                    component: AccountSelectPaper,
                    sx: {
                      minWidth: 0,
                      width: 200,
                    },
                  },
                  MenuListProps: {
                    disablePadding: true,
                  },
                },
              }}
            >
              {distinctAccounts.map((option, idx) => (
                <MenuItem
                  key={`${option.primaryAcct}-${idx}`}
                  value={option.primaryAcct}
                  sx={{
                    minHeight: 36,
                    padding: '6px 12px 6px 16px',
                    alignItems: 'flex-start',
                  }}
                >
                  <div>
                    <Typography
                      variant="h5"
                      sx={{
                        fontSize: '14px',
                        fontWeight: 'bold',
                        lineHeight: '1.1',
                        marginBottom: '0.4rem',
                      }}
                      mb={0}
                    >
                      {option.primaryAcct}
                    </Typography>
                    <Grid item>
                      <Typography
                        sx={{
                          fontSize: '14px',
                          lineHeight: '1.1',
                        }}
                      >
                        {option.address?.name ?? ''}
                      </Typography>
                    </Grid>
                  </div>
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          {companyCodeOptions.length > 1 && (
            <Grid item xs={12} sm="auto">
              <TextField
                select
                fullWidth={mobile}
                value={normalizeCompanyCode(selectedCompanyCode)}
                sx={{
                  ...getCompactFilterFieldSx(muiTheme),
                  width: mobile ? '100%' : { xs: '200px', sm: '176px' },
                  '& .MuiInputBase-root': {
                    ...getCompactFilterFieldSx(muiTheme)[
                      '&& .MuiInputBase-root'
                    ],
                    height: '48px',
                  },
                }}
                onChange={changeSelectedCompanyCode}
                SelectProps={{
                  IconComponent: ExpandMoreOutlined,
                  renderValue: (value) => {
                    const selectedCode = normalizeCompanyCode(value as string);
                    const option = companyCodeOptions.find(
                      (x) =>
                        normalizeCompanyCode(x.companyCode) === selectedCode,
                    );
                    const { companyCode, description } =
                      getCompanyCodeDisplayParts(option, selectedCode);

                    return (
                      <Box>
                        <Typography
                          variant="h5"
                          sx={{
                            fontSize: '14px',
                            fontWeight: 'bold',
                            lineHeight: '1.1',
                            marginBottom: '0.4rem',
                          }}
                          mb={0}
                        >
                          {companyCode}
                        </Typography>
                        <Typography
                          sx={{
                            fontSize: '14px',
                            lineHeight: '1.1',
                          }}
                        >
                          {description}
                        </Typography>
                      </Box>
                    );
                  },
                }}
              >
                {companyCodeOptions.map((option) => {
                  const { companyCode, description } =
                    getCompanyCodeDisplayParts(option);

                  return (
                    <MenuItem
                      key={getAccountIdentity(option)}
                      value={normalizeCompanyCode(option.companyCode)}
                      sx={{
                        minHeight: 36,
                        padding: '6px 12px 6px 16px',
                        alignItems: 'flex-start',
                      }}
                    >
                      <div>
                        <Typography
                          variant="h5"
                          sx={{
                            fontSize: '14px',
                            fontWeight: 'bold',
                            lineHeight: '1.1',
                            marginBottom: '0.4rem',
                          }}
                          mb={0}
                        >
                          {companyCode}
                        </Typography>
                        <Typography
                          sx={{
                            fontSize: '14px',
                            lineHeight: '1.1',
                          }}
                        >
                          {description}
                        </Typography>
                      </div>
                    </MenuItem>
                  );
                })}
              </TextField>
            </Grid>
          )}
        </Grid>
      );
    }

    if (accounts?.[0]) {
      return (
        <Typography color={theme.palette.menu.contrastText}>
          {`${accounts[0].primaryAcct} ${accounts[0]?.address?.name ?? ''}`}
        </Typography>
      );
    }

    return <Typography color={theme.palette.menu.contrastText} />;
  };

  return (
    <>
      <AppBar
        elevation={0}
        position="fixed"
        sx={{
          marginLeft: MarginLeftTransitions,
          width: WidthTransitions,
          transition: DrawerTransitions,
        }}
        id="header"
      >
        <Toolbar
          sx={{
            paddingLeft: '12px !important',
            paddingRight: '12px !important',
            alignItems: 'center',
            minHeight: 'auto !important',
            height: 'auto',
            paddingTop: useStackedHeaderControls ? '8px' : undefined,
            paddingBottom: useStackedHeaderControls ? '12px' : undefined,
          }}
        >
          <Box
            sx={{
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
            }}
          >
            <Grid
              container
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              wrap="nowrap"
            >
              <Grid
                item
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  minWidth: 0,
                  flex: 1,
                }}
              >
                {(useOverlayDrawer || !drawerOpen) && (
                  <IconButton
                    size="large"
                    edge="start"
                    color="inherit"
                    aria-label={f('aria.menu')}
                    onClick={() => setDrawerOpen(!drawerOpen)}
                    sx={{
                      color: (theme) =>
                        `${theme.palette.primary.headerText} !important`,
                      marginRight: useOverlayDrawer ? 1 : 0,
                    }}
                  >
                    <MenuIcon />
                  </IconButton>
                )}
                {!useStackedHeaderControls && renderAccountSelectors(false)}
              </Grid>

              <Grid item sx={{ flexShrink: 0 }}>
                <Grid
                  container
                  direction="row"
                  justifyContent="flex-end"
                  alignItems="center"
                  wrap="nowrap"
                  sx={{
                    columnGap: { xs: 1, sm: '2rem' },
                    minHeight: '48px',
                  }}
                >
                  <Grid item sx={{ display: 'flex', alignItems: 'center' }}>
                    {impersonatedUser?.login && (
                      <CardListBox
                        sx={{
                          position: 'relative',
                          paddingRight:
                            selectedLanguage === 'ru' ? '32px' : '12px',
                          display: 'flex',
                          alignItems: 'center',
                        }}
                      >
                        <IconButton
                          onClick={() => {
                            unimpersonate();
                            if (
                              location.pathname.toLowerCase() ===
                                '/makepaymentpage' ||
                              location.pathname.toLowerCase() ===
                                '/payment/session' ||
                              location.pathname.toLowerCase() ===
                                '/payment/session/receipt'
                            ) {
                              navigate('/home');
                            }
                          }}
                          sx={{
                            position: 'absolute',
                            top: 2,
                            right: 4,
                            padding: '2px',
                            lineHeight: 1,
                          }}
                        >
                          <CloseIcon fontSize="small" />
                        </IconButton>

                        <Grid
                          container
                          direction="column"
                          alignItems="center"
                          justifyContent="center"
                        >
                          <Grid item>
                            <Typography variant="textHeader">
                              {f('user.impersonating')}
                            </Typography>
                          </Grid>
                          <Grid item>
                            <Typography
                              variant="body2"
                              fontWeight={350}
                              color={theme.palette.text.primary}
                            >
                              {impersonatedUser.login}
                            </Typography>
                          </Grid>
                        </Grid>
                      </CardListBox>
                    )}
                  </Grid>
                  <Grid item sx={{ display: 'flex', alignItems: 'center' }}>
                    <IconButton
                      id="header-avatar-button"
                      aria-controls={menuAnchorEl ? 'basic-menu' : undefined}
                      aria-haspopup="true"
                      aria-expanded={menuAnchorEl ? 'true' : undefined}
                      onClick={handleAvatarClick}
                    >
                      <StyledBadge
                        variant="dot"
                        overlap="circular"
                        anchorOrigin={{
                          vertical: 'bottom',
                          horizontal: 'right',
                        }}
                      >
                        {/* TODO: Put the users image path in src below */}
                        <Tooltip title={user?.login}>
                          <Avatar
                            src={''}
                            alt={user?.login}
                            sx={{
                              textTransform: 'capitalize',
                            }}
                          >
                            {user?.login?.charAt(0) ?? ''}
                          </Avatar>
                        </Tooltip>
                      </StyledBadge>
                    </IconButton>
                  </Grid>
                </Grid>
              </Grid>
            </Grid>

            {useStackedHeaderControls && (
              <Box sx={{ width: '100%', marginTop: 1 }}>
                {renderAccountSelectors(true)}
              </Box>
            )}
          </Box>
        </Toolbar>
      </AppBar>
      <HeaderMenu
        handleMenuClose={handleMenuClose}
        menuAnchorEl={menuAnchorEl}
      />
      <AccountSearchDialog
        open={openAccountSearch}
        onClose={() => setOpenAccountSearch(false)}
        accounts={distinctAccounts}
        onAccountSelect={handleAccountSelectedFromSearch}
      />
    </>
  );
}
