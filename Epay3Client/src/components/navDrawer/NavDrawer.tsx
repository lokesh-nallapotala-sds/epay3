import { memo, useEffect } from 'react';
import { styled, useTheme } from '@mui/material/styles';
import { ExpandMoreOutlined } from '@mui/icons-material';
import MenuOpenIcon from '@mui/icons-material/MenuOpen';
import ArrowOutwardIcon from '@mui/icons-material/ArrowOutward';
import {
  Box,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useAppDispatch } from 'redux/hooks';
import { useEpayLocale } from 'providers/EpayIntlProvider';
import { getLanguageOptions } from 'constants/languages';
import { setLanguage } from 'redux/reducers';
import { useUiState } from 'providers/UiStateProvider';
import { NavIdentifierType } from 'types/NavIdentifier';
import AppLogo from '../logo/AppLogo';
import NavDrawerItem from './NavDrawerItem';
import NavDrawerContent from './NavDrawerContent';
import { NavDrawerItemType } from './NavDrawerItemType';
import {
  compactFilterMenuItemSx,
  compactFilterSelectProps,
} from 'shared/components/compactFilterSelectStyles';
import { getCompactFilterFieldSx } from 'shared/components/compactFilterFieldStyles';

interface StyledListItemProps {
  active?: string;
}

interface StyledDrawerProps {
  drawerwidth: number;
}

const StyleListItem = styled(ListItem)<StyledListItemProps>(({ active }) => ({
  ...(active && {
    outlineWidth: '1px',
    outlineStyle: 'solid',
    outlineColor: 'transparent',
    borderRadius: 4,
  }),
  '&:hover': {
    borderRadius: '4px',
    outlineWidth: active ? '1px' : '0px',
    outlineStyle: active ? 'solid' : '',
    outlineColor: 'transparent',
  },
}));

const StyledDrawer = styled(Drawer)<StyledDrawerProps>(({ drawerwidth }) => ({
  flexShrink: 0,
  '& .MuiDrawer-paper': {
    width: drawerwidth,
    boxSizing: 'border-box',
    borderWidth: 0,
    borderRightWidth: '1px',
    borderRightColor: '#e0e0e0',
    borderRadius: 0,
  },
}));

const getCurrentPage = (path: string, content: NavDrawerItemType[]) => {
  let result: NavIdentifierType | undefined;

  // Extract pathname without query parameters
  const pathname = path.split('?')[0];

  for (let i = 0; i < content.length; i++) {
    const id = content[i].id;
    const children = content[i].children ?? [];

    if (content[i].path === pathname && !!id) {
      result = id;
      break;
    }
    if (children.length) {
      for (let j = 0; j < children.length; j++) {
        const id = children[j].id;
        if (children[j].path === pathname && id) {
          result = id;
          break;
        }
      }
    }
  }
  return result;
};

const NavDrawer = memo(() => {
  const { language, setUserPreferredLocale } = useEpayLocale();
  const dispatch = useAppDispatch();

  const {
    drawerOpen,
    useOverlayDrawer,
    navSelection,
    setDrawerOpen,
    setNavSelection,
  } = useUiState();

  const theme = useTheme();
  const { content, links } = NavDrawerContent();

  useEffect(
    function setNavSelectionForHighlighting() {
      const handleLocationChange = () => {
        setNavSelection(getCurrentPage(window.location.pathname, content));
      };

      // Set initial selection
      handleLocationChange();

      // Listen for popstate events (back/forward buttons)
      window.addEventListener('popstate', handleLocationChange);

      // Listen for pushstate/replacestate (programmatic navigation)
      const originalPushState = history.pushState;
      const originalReplaceState = history.replaceState;

      history.pushState = function (...args) {
        originalPushState.apply(history, args);
        setTimeout(handleLocationChange, 0);
      };

      history.replaceState = function (...args) {
        originalReplaceState.apply(history, args);
        setTimeout(handleLocationChange, 0);
      };

      return () => {
        window.removeEventListener('popstate', handleLocationChange);
        history.pushState = originalPushState;
        history.replaceState = originalReplaceState;
      };
    },
    [content, setNavSelection],
  );

  const toggleNavDrawer = () => setDrawerOpen(!drawerOpen);
  const closeOverlayDrawerOnSelect = () => {
    if (useOverlayDrawer) {
      setDrawerOpen(false);
    }
  };

  const languages = getLanguageOptions();
  const drawerwidth = 240;
  const DrawerVariant = useOverlayDrawer ? 'temporary' : 'persistent';
  const changeLanguage = (e) => {
    const lang = e.target.value;
    setUserPreferredLocale(lang);
    dispatch(setLanguage(lang));
  };

  return (
    <StyledDrawer
      drawerwidth={drawerwidth}
      variant={DrawerVariant}
      anchor="left"
      open={drawerOpen}
      onClose={() => toggleNavDrawer()}
    >
      <Stack
        direction="row"
        alignItems="center"
        sx={{ marginTop: '.5rem', marginBottom: '2rem', paddingLeft: '1rem' }}
      >
        <AppLogo></AppLogo>

        <IconButton
          onClick={toggleNavDrawer}
          sx={{
            display: 'flex',
            marginRight: 0,
            marginLeft: 'auto',
            color: `${theme.palette.primary.headerText} !important`,
          }}
        >
          <MenuOpenIcon />
        </IconButton>
      </Stack>

      <List>
        {content.map((i) => (
          <Box key={i.label}>
            {i.children?.length ? (
              <List
                sx={{
                  padding: '1rem',
                  // hover states
                  '& .MuiListItemButton-root:hover': {
                    borderRadius: '6px',
                  },
                }}
              >
                <Typography
                  sx={{
                    fontSize: '12px',
                    marginBottom: '6px',
                    color: theme.palette.primary?.headerText,
                  }}
                >
                  {i.label.toUpperCase()}
                </Typography>
                {i.children.map((j) => (
                  <StyleListItem
                    key={j.label}
                    disablePadding
                    active={j.id === navSelection ? 'active ' : ''}
                  >
                    <NavDrawerItem
                      label={j.label}
                      action={j.action}
                      afterClick={closeOverlayDrawerOnSelect}
                      id={j.id}
                      active={j.id === navSelection ? 'active' : ''}
                      setter={() => setNavSelection(j.id)}
                      icon={j.icon}
                    />
                  </StyleListItem>
                ))}
              </List>
            ) : (
              <StyleListItem
                key={i.label}
                disablePadding
                active={i.id === navSelection ? 'active' : ''}
              >
                <NavDrawerItem
                  label={i.label}
                  action={i.action}
                  afterClick={closeOverlayDrawerOnSelect}
                  id={i.id}
                  active={i.id === navSelection ? 'active' : ''}
                  setter={() => setNavSelection(i.id)}
                  icon={i.icon}
                />
              </StyleListItem>
            )}
          </Box>
        ))}
      </List>
      <List
        sx={{
          marginTop: 'auto',
          paddingLeft: '1rem',
          paddingRight: '1rem',
        }}
      >
        <Divider />

        {links.map((i) => (
          <ListItem disablePadding key={i.label}>
            <ListItemButton
              sx={{
                margin: '0px',
                '&:hover': {
                  backgroundColor: 'transparent !important',
                },
              }}
              href={i.href ?? ''}
              target={i.target}
              disableGutters
            >
              <ListItemText sx={{ margin: '0px' }}>
                <Typography
                  sx={{
                    color: theme.palette.primary.headerText,
                    fontSize: '12px',
                    lineHeight: '18px',
                    margin: '0px',
                  }}
                >
                  {i.label}
                </Typography>
              </ListItemText>
              <ListItemIcon
                sx={{
                  marginLeft: 'auto',
                  color: theme.palette.primary.headerText,
                }}
              >
                <ArrowOutwardIcon sx={{ marginLeft: 'auto' }} />
              </ListItemIcon>
            </ListItemButton>
          </ListItem>
        ))}
        <Box
          sx={{
            marginTop: '1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            alignItems: 'flex-start',
          }}
        >
          {/* Language Dropdown */}
          <TextField
            select
            size="small"
            fullWidth
            onChange={changeLanguage}
            value={
              languages.find((lang) => lang.language === language)?.language ||
              ''
            }
            sx={(muiTheme) => ({
              ...getCompactFilterFieldSx(muiTheme),
              '& .MuiInputBase-root': {
                ...getCompactFilterFieldSx(muiTheme)['&& .MuiInputBase-root'],
                borderRadius: '6px !important',
              },
            })}
            InputProps={{
              sx: {
                fontSize: '12px',
                borderRadius: '6px !important',
                cursor: 'pointer',
                minWidth: '207px',
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
                    minWidth: '207px !important',
                  },
                },
                MenuListProps: compactFilterSelectProps.MenuProps.MenuListProps,
              },
              IconComponent: ExpandMoreOutlined,
            }}
          >
            {languages.map((option) => (
              <MenuItem
                key={option.language}
                value={option.language}
                sx={{ fontSize: '12px', ...compactFilterMenuItemSx }}
              >
                {option.title}
              </MenuItem>
            ))}
          </TextField>

          {/* Version Text */}
          <List sx={{ padding: 0, paddingLeft: 0.5 }}>
            <ListItem disablePadding sx={{ paddingLeft: 0 }}>
              <ListItemText
                sx={{
                  margin: '0',
                }}
              >
                <Box
                  sx={{
                    fontSize: '12px',
                    margin: '0',
                    '&:hover': {
                      color: `${theme.palette.primary.headerText} !important`,
                    },
                  }}
                >
                  {import.meta.env.VITE_APP_VERSION}
                </Box>
              </ListItemText>
            </ListItem>
          </List>
        </Box>
      </List>
    </StyledDrawer>
  );
});

export default NavDrawer;
