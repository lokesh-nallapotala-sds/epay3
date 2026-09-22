import { CSSProperties } from 'react';

import { palette as MuiPalette, Theme as MuiTheme } from '@mui/system';

import '@emotion/react';

interface Mixins {
  menu: { minHeight: number };
  border: { color: string };
}
interface PaletteOptions {
  menu?: TypeMenu;
  highlight: {
    main: string;
    contrastText: string;
  };
}
declare module '@mui/material/styles' {
  // Theme-creation side: custom slots readable off ThemeOptions.palette.
  export interface PaletteOptions {
    spinner?: {
      main?: CSSProperties['color'];
    };
  }
  export interface palette extends MuiPalette {
    mode?: 'dark' | 'light' | undefined;
    primary: {
      headerText: CSSProperties['color'];
      main: string;
      hover?: CSSProperties['color'];
      contrastText: CSSProperties['color'];
      borderColor: CSSProperties['color'];
    };
    secondary: {
      main: string;
      contrastText: CSSProperties['color'];
      hover?: CSSProperties['color'];
    };
    text: {
      main?: CSSProperties['color'];
      primary: CSSProperties['color'];
      secondary: CSSProperties['color'];
      disabled: CSSProperties['color'];
      hint?: CSSProperties['color'];
      link?: CSSProperties['color'];
      userActive?: CSSProperties['color'];
      userInactive?: CSSProperties['color'];
    };
    info: {
      main: string;
      contrastText: CSSProperties['color'];
    };
    error: {
      main: string;
      contrastText: CSSProperties['color'];
      border: CSSProperties['color'];
      background: CSSProperties['color'];
      primaryText: CSSProperties['color'];
      secondaryText: CSSProperties['color'];
      label: CSSProperties['color'];
    };
    warning: {
      main: string;
      contrastText: CSSProperties['color'];
    };
    success: {
      main: string;
      contrastText: CSSProperties['color'];
    };
    background: {
      default: CSSProperties['color'];
      paper: CSSProperties['color'];
    };
    spinner: {
      main: CSSProperties['color'];
    };
    buttonBorder: {
      buttonBorderColor: CSSProperties['color'];
      buttonBorderHoverColor: CSSProperties['color'];
    };
    menu: {
      main: CSSProperties['color'];
      active: CSSProperties['color'];
      contrastText: CSSProperties['color'];
      hover: CSSProperties['color'];
    };
    highlight: {
      main: CSSProperties['color'];
      contrastText: CSSProperties['color'];
    };
    interactiveColor: CSSProperties['color'];
  }

  export interface Theme extends Partial<MuiTheme> {
    palette: palette;
    shape: {
      borderRadius: CSSProperties['borderRadius'];
    };
    mixins: Mixins;
    typography: {
      fontFamily: CSSProperties['fontFamily'];
      fontSize: CSSProperties['fontSize'];
      h1: {
        fontWeight: CSSProperties['fontWeight'];
        fontSize: CSSProperties['fontSize'];
        letterSpacing: CSSProperties['letterSpacing'];
        opacity: CSSProperties['opacity'];
      };
      h2: {
        fontWeight: CSSProperties['fontWeight'];
        fontSize: CSSProperties['fontSize'];
        letterSpacing: CSSProperties['letterSpacing'];
        opacity: CSSProperties['opacity'];
      };
      h3: {
        fontWeight: CSSProperties['fontWeight'];
        fontSize: CSSProperties['fontSize'];
        letterSpacing: CSSProperties['letterSpacing'];
        opacity: CSSProperties['opacity'];
      };
      h4: {
        fontWeight: CSSProperties['fontWeight'];
        fontSize: CSSProperties['fontSize'];
        letterSpacing: CSSProperties['letterSpacing'];
        opacity: CSSProperties['opacity'];
      };
      h5: {
        fontWeight: CSSProperties['fontWeight'];
        fontSize: CSSProperties['fontSize'];
        letterSpacing: CSSProperties['letterSpacing'];
        opacity: CSSProperties['opacity'];
      };
      header: {
        fontWeight: CSSProperties['fontWeight'];
        fontSize: CSSProperties['fontSize'];
        lineHeight: CSSProperties['lineHeight'];
        color: CSSProperties['color'];
      };
      subheader: {
        fontWeight: CSSProperties['fontWeight'];
        fontSize: CSSProperties['fontSize'];
        lineHeight: CSSProperties['lineHeight'];
        color: CSSProperties['color'];
      };
      menu: {
        fontWeight: CSSProperties['fontWeight'];
        fontSize: CSSProperties['fontSize'];
        letterSpacing: CSSProperties['letterSpacing'];
        opacity: CSSProperties['opacity'];
        color: CSSProperties['color'];
        '&:hover': {
          color: CSSProperties['color'];
          fontWeight: CSSProperties['fontWeight'];
        };
        '&:active': {
          color: CSSProperties['color'];
          fontWeight: CSSProperties['fontWeight'];
        };
      };
      body1: {
        fontWeight: CSSProperties['fontWeight'];
        fontSize: CSSProperties['fontSize'];
        letterSpacing: CSSProperties['letterSpacing'];
        opacity: CSSProperties['opacity'];
      };
      body2: {
        fontWeight: CSSProperties['fontWeight'];
        fontSize: CSSProperties['fontSize'];
        letterSpacing: CSSProperties['letterSpacing'];
        opacity: CSSProperties['opacity'];
      };
      fieldHeader: {
        fontWeight: CSSProperties['fontWeight'];
        fontSize: CSSProperties['fontSize'];
        letterSpacing: CSSProperties['letterSpacing'];
        color: CSSProperties['color'];
      };
      fieldValue: {
        fontWeight: CSSProperties['fontWeight'];
        fontSize: CSSProperties['fontSize'];
        letterSpacing: CSSProperties['letterSpacing'];
        color: CSSProperties['color'];
      };
      caption: {
        fontWeight: CSSProperties['fontWeight'];
        fontSize: CSSProperties['fontSize'];
        letterSpacing: CSSProperties['letterSpacing'];
        opacity: CSSProperties['opacity'];
      };
      overline: {
        fontWeight: CSSProperties['fontWeight'];
        fontSize: CSSProperties['fontSize'];
        letterSpacing: CSSProperties['letterSpacing'];
        lineHeight: CSSProperties['lineHeight'];
        textTransform: CSSProperties['textTransform'];
        color: CSSProperties['color'];
        opacity: CSSProperties['opacity'];
      };
      overlineActive: {
        fontWeight: CSSProperties['fontWeight'];
        lineHeight: CSSProperties['lineHeight'];
        fontSize: CSSProperties['fontSize'];
        letterSpacing: CSSProperties['letterSpacing'];
        textTransform: CSSProperties['textTransform'];
        color: CSSProperties['color'];
        opacity: CSSProperties['opacity'];
      };
    };
    spacing: (value: number) => 0;
  }
}
