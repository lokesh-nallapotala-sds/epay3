import { memo, useEffect, ChangeEvent } from 'react';

import { styled, useTheme } from '@mui/material/styles';
import { ExpandMoreOutlined } from '@mui/icons-material';
import { useAppDispatch } from 'redux/hooks';
import MenuOpenIcon from '@mui/icons-material/MenuOpen';
import ArrowOutwardIcon from '@mui/icons-material/ArrowOutward';
import { useEpayLocale } from 'providers/EpayIntlProvider';
import { getLanguageOptions } from 'constants/languages';
import { setLanguage } from 'redux/reducers';
import { useUiState } from 'providers/UiStateProvider';
import {
  Box,
  Divider,
  Drawer,
  IconButton,
  Link,
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

import AppLogo from '../logo/AppLogo';
import NavDrawerContent from './NavDrawerContent';
import {
  compactFilterMenuItemSx,
  compactFilterSelectProps,
} from 'shared/components/compactFilterSelectStyles';
import { getCompactFilterFieldSx } from 'shared/components/compactFilterFieldStyles';
interface StyledDrawerProps {
  drawerwidth: number;
}

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

const LeftDrawer = memo(() => {
  const theme = useTheme();
  const { language, setUserPreferredLocale } = useEpayLocale();
  const { links } = NavDrawerContent();
  const dispatch = useAppDispatch();

  const {
    drawerOpen,
    useOverlayDrawer,
    minimizeDrawer,
    setDrawerOpen,
    setMinimizeDrawer,
  } = useUiState();

  useEffect(() => {
    setMinimizeDrawer(useOverlayDrawer);
  }, [setMinimizeDrawer, useOverlayDrawer]);

  const toggleNavDrawer = () => {
    if (useOverlayDrawer) {
      setDrawerOpen(!drawerOpen);
      setMinimizeDrawer(false);
      return;
    }

    setDrawerOpen(!drawerOpen);
  };

  const languages = getLanguageOptions();

  const changeLanguage = (e: ChangeEvent<HTMLInputElement>) => {
    const lang = e.target.value;
    setUserPreferredLocale(lang);
    dispatch(setLanguage(lang));
  };
  const drawerwidth = 240;
  const DrawerVariant = useOverlayDrawer ? 'temporary' : 'persistent';

  return (
    <StyledDrawer
      drawerwidth={drawerwidth}
      variant={DrawerVariant}
      anchor="left"
      open={drawerOpen && (!useOverlayDrawer || !minimizeDrawer)}
      onClose={() => toggleNavDrawer()}
    >
      <Stack
        direction="row"
        sx={{ marginTop: '.5rem', marginBottom: '2rem', paddingLeft: '1rem' }}
      >
        <Link
          href="/"
          sx={{
            textDecoration: 'none',
          }}
        >
          <AppLogo></AppLogo>
        </Link>
        <IconButton
          onClick={toggleNavDrawer}
          sx={{
            display: 'flex',
            marginRight: 0,
            marginLeft: 'auto',
            color: `${theme.palette.primary?.headerText} !important`,
          }}
        >
          <MenuOpenIcon />
        </IconButton>
      </Stack>

      <List
        sx={{
          marginTop: 'auto',
          paddingLeft: '1rem',
          paddingRight: '1rem',
        }}
      >
        <Divider />
        {links.map((i) => (
          <ListItem key={i.label} disablePadding>
            <ListItemButton
              sx={{
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
                    color: theme.palette.primary?.headerText,
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
                  color: theme.palette.primary?.headerText,
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
                    margin: 0,
                    padding: 0,
                    overflow: 'hidden',
                    boxSizing: 'border-box',
                  },
                },
                MenuListProps: {
                  sx: {
                    p: 0,
                    ...compactFilterSelectProps.MenuProps.MenuListProps.sx,
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
                sx={{
                  fontSize: '12px',
                  boxSizing: 'border-box', // Prevents layout shift
                  m: 0, // Removes default margin
                  p: '6px 16px', // Adjusts padding for consistent alignment
                  ...compactFilterMenuItemSx,
                }}
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
                  margin: '0', // Ensures no extra margin around the text
                }}
              >
                <Typography
                  sx={{
                    fontSize: '12px',
                    margin: '0', // Removes margin for the Typography element
                  }}
                >
                  {import.meta.env.VITE_APP_VERSION}
                </Typography>
              </ListItemText>
            </ListItem>
          </List>
        </Box>
      </List>
    </StyledDrawer>
  );
});

export default LeftDrawer;
