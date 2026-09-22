import styled from '@emotion/styled';
import { useAppSelector } from 'redux/hooks';
import { selectUserState } from 'redux/selectors/uiSelectors';
import { useUiState } from 'providers/UiStateProvider';
import {
  Divider,
  ListItemIcon,
  Menu,
  MenuItem,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  compactFilterMenuItemSx,
  compactFilterSelectProps,
} from 'shared/components/compactFilterSelectStyles';

import useHeaderMenuContent from './useHeaderMenuContent';

interface HeaderMenuProps {
  handleMenuClose(): void;
  menuAnchorEl: HTMLElement | undefined;
}

export default function HeaderMenu(props: HeaderMenuProps) {
  const { handleMenuClose, menuAnchorEl } = props;
  const user = useAppSelector(selectUserState);
  const { setNavSelection } = useUiState();
  const menuItems = useHeaderMenuContent();
  if (!user) return null;
  const SpecialMenuItem = styled(MenuItem)(() => ({
    '&:hover': {
      backgroundColor: 'rgba(0, 0, 0, 0.04)',
    },
  }));

  return (
    <Menu
      id="header-menu"
      anchorEl={menuAnchorEl}
      open={!!menuAnchorEl}
      onClose={handleMenuClose}
      MenuListProps={{
        'aria-labelledby': 'header-avatar-button',
        sx: compactFilterSelectProps.MenuProps.MenuListProps.sx,
      }}
    >
      {user.login?.trim() !== user.email?.trim() && (
        <Typography variant="h6" sx={{ color: '#1A202C', marginLeft: '1rem' }}>
          {user.login}
        </Typography>
      )}
      <Tooltip title={user.email} arrow>
        <Typography
          variant="caption"
          sx={{
            color: '#1A202C',
            marginLeft: '1rem',
            textOverflow: 'ellipsis',
            paddingRight: '1rem',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            maxWidth: '200px',
            display: 'block',
          }}
        >
          {user.email}
        </Typography>
      </Tooltip>
      <Divider sx={{ marginTop: '1rem', marginBottom: '1rem' }} />
      {menuItems.map((i) => (
        <SpecialMenuItem
          key={i.label}
          sx={compactFilterMenuItemSx}
          onClick={() => {
            if (i.action) i.action();
            handleMenuClose();
            setNavSelection(i.id);
          }}
        >
          <ListItemIcon sx={{ minWidth: '24px !important' }}>
            {i.icon}
          </ListItemIcon>
          <Typography variant="fieldHeader">{i.label}</Typography>
        </SpecialMenuItem>
      ))}
    </Menu>
  );
}
