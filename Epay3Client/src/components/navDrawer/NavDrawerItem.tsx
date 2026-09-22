import { memo } from 'react';

import { styled } from '@mui/material/styles';
import {
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
} from '@mui/material';

import { NavDrawerItemType } from './NavDrawerItemType';

interface StyleListItemButtonProps {
  active?: string;
}

const StyleListItemButton = styled(ListItemButton)<StyleListItemButtonProps>(
  ({ theme, active }) => ({
    fontFamily: theme.typography.fontFamily,
    cursor: 'pointer',
    color: active ? theme.palette.menu.active : theme.palette.menu.main,
    '& > span': {
      '&:hover': {
        color: active ? theme.palette.menu.main : theme.palette.menu.hover,
      },
    },
  }),
);

// Define the prop type for the styled component
interface StyleListItemTextProps {
  active?: string;
}

// Correctly style the ListItemText
const CustomListItemText = styled(ListItemText)<StyleListItemTextProps>(
  ({ theme, active }) => ({
    color: active ? theme.palette.menu.active : theme.palette.menu.main,
    '& > span': {
      '&:hover': {
        color: active ? theme.palette.menu.active : theme.palette.menu.main,
        fontWeight: '500',
        fontSize: '15px',
      },
    },
    '& span': {
      color: active ? theme.palette.menu.active : theme.palette.menu.main,
      fontWeight: '500',
      fontSize: '15px',
    },
  }),
);

const NavDrawerItem = memo((props: NavDrawerItemType) => {
  const { action, active, afterClick, icon, label, setter } = props;
  return (
    <StyleListItemButton
      onClick={() => {
        if (setter) setter();
        if (action) action();
        if (afterClick) afterClick();
      }}
      active={active ? 'active' : ''}
      sx={{
        height: '40px',
        paddingLeft: '5px',
        display: 'flex',
        alignItems: 'center',
      }}
    >
      <ListItemIcon
        sx={{
          color: 'inherit',
          minWidth: '20px',
          height: '18px',
          alignItems: 'center',
        }}
      >
        {icon}
      </ListItemIcon>
      <CustomListItemText
        active={active ? 'active' : ''}
        sx={{
          width: '150px',
          height: 'auto',
          paddingLeft: '10px',
          marginTop: '7px',
          display: 'flex',
          alignItems: 'center',
        }}
        primary={<Typography variant="menu">{label}</Typography>}
      />
    </StyleListItemButton>
  );
});

export default NavDrawerItem;
