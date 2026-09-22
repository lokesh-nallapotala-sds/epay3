import { palette } from '@mui/material';
import { ExpandMoreOutlined } from '@mui/icons-material';
import { BreakpointsOptions, ThemeOptions } from '@mui/material/styles';
import {
  TypographyOptions,
  TypographyStyleOptions,
} from '@mui/material/styles/createTypography';
import type {} from '@mui/x-date-pickers/themeAugmentation';
import { BREAKPOINT_VALUES } from 'shared/theme/breakpoints';
import { defaultSelectMenuProps } from 'shared/components/selectMenuProps';

declare module '@mui/material/styles' {
  interface TypographyVariants {
    menu: TypographyStyleOptions;
    header: TypographyStyleOptions;
    subheader: TypographyStyleOptions;
    fieldHeader: TypographyStyleOptions;
    fieldValue: TypographyStyleOptions;
    textHeader: TypographyStyleOptions;
  }
  interface TypographyVariantsOptions {
    menu?: TypographyStyleOptions;
    header: TypographyStyleOptions;
    subheader: TypographyStyleOptions;
    fieldHeader: TypographyStyleOptions;
    fieldValue: TypographyStyleOptions;
    textHeader: TypographyStyleOptions;
  }
  interface Mixins {
    menu?: {
      minHeight: number;
    };
    border: { color: string };
    modal: {
      borderRadius: string;
      dividerColor: string;
      confirmMaxWidth: string;
      headerPadding: string;
      bodyPadding: string;
      formBodyPadding: string;
      confirmBodyPadding: string;
      confirmBodyTopMargin: string;
      confirmMinHeight: string;
      footerPadding: string;
      confirmBodyMinHeight: string;
      actionGap: string;
      contentGap: string;
    };
  }

  export interface TypeText {
    primary: string;
    secondary: string;
    disabled: string;
    hint: string;
  }
}

declare module '@mui/material/Button' {
  interface ButtonPropsVariantOverrides {
    link: true;
  }
}

declare module '@mui/material/TextField' {
  interface TextFieldPropsSizeOverrides {
    large: true;
  }
}

declare module '@mui/material/Typography' {
  interface TypographyPropsVariantOverrides {
    menu: true;
    header: true;
    subheader: true;
    fieldHeader: true;
    fieldValue: true;
    textHeader: true;
  }
}

const breakpointOptions: BreakpointsOptions = {
  values: { ...BREAKPOINT_VALUES },
};

const paletteOptions: palette = {
  primary: {
    main: '#1B75BB',
    contrastText: '#FFF',
    borderColor: '#DFE1E6',
    headerText: '#0D0D12',
  },
  secondary: {
    main: '#0D0D12',
    contrastText: '#FFF',
  },
  text: {
    primary: '#0D0D12',
    secondary: '#175788',
    main: '#808897',
    disabled: '#D0D0D0',
    hint: '#A4ABB8',
    link: '#38A9DD',
    userActive: '#00B700',
    userInactive: 'red',
  },
  info: {
    main: '#30A8DF',
    contrastText: '#FFF',
  },
  error: {
    main: '#FF0B1E',
    contrastText: '#FFF',
    border: '#E53935',
    background: '#FDECEA',
    primaryText: '#E53935',
    secondaryText: '#B71C1C',
    label: '#C62828',
  },
  warning: {
    main: '#FFBA00',
    contrastText: '#FFF',
  },
  success: {
    main: '#78BE21',
    contrastText: '#FFF',
  },
  background: {
    default: '#F8F8F8',
    paper: '#FFFFFF',
  },
  spinner: {
    main: '#616161',
  },
  buttonBorder: {
    buttonBorderColor: '#ffffff',
    buttonBorderHoverColor: '#ffffff',
  },
  menu: {
    main: '#4A4A4A',
    active: '#F0AE13',
    contrastText: '#FFF',
    hover: '#1B75BB',
  },
  highlight: {
    main: '#EDF4FA', // was #C1CDD8
    contrastText: '#0D0D12', // was #EDF4FA
  },
  interactiveColor: '#000000',
};

const typographyOptions: TypographyOptions = {
  fontFamily: "'Inter Variable', 'Inter', 'sans-serif'",
  fontSize: 14,
  // note, the fontSize-in-px approximations below assume a base size of 14
  h1: {
    fontSize: '2rem', // 28px
    fontWeight: 'bold',
    letterSpacing: '0.17px',
    opacity: 1,
  },
  h2: {
    fontSize: '1.715rem', // ~24px
    fontWeight: 'bold',
    letterSpacing: '0.1px',
    opacity: 1,
  },
  h3: {
    fontSize: '1.43rem', // ~20px
    fontWeight: 'bold',
    letterSpacing: '0.1px',
    opacity: 1,
  },
  h4: {
    fontSize: '1.43rem', // ~20px
    fontWeight: 550,
    letterSpacing: '0.1px',
    opacity: 1,
  },
  h5: {
    fontSize: '1.145rem', // ~16px
    fontWeight: 'bold',
    letterSpacing: '0px',
    opacity: 1,
    //  color: '#666D80',
    color: paletteOptions.secondary.main,
  },
  h6: {
    fontSize: '1.145rem', // ~16px
    fontWeight: 500,
    letterSpacing: '0px',
    opacity: 1,
    color: paletteOptions.secondary.main,
  },
  header: {
    fontWeight: '600',
    fontSize: '18px',
    letter: '2%',
    lineHeight: '25.2px',
    color: paletteOptions.secondary.main,
  },
  subheader: {
    fontWeight: '500',
    fontSize: '14px',
    letter: '2%',
    lineHeight: '19.6px',
    color: '#666D80',
  },
  body1: {
    fontSize: '16px',
    fontWeight: '600',
    letterSpacing: '0.24px',
    opacity: 1,
    color: '#666D80',
  },
  body2: {
    fontWeight: '500',
    fontSize: '14px',
    letterSpacing: '0px',
    lineHeight: '18px',
    opacity: 1,
  },

  textHeader: {
    fontWeight: '600',
    fontSize: '14px',
    lineHeight: '21px',
    color: paletteOptions.secondary.main,
  },

  fieldHeader: {
    fontWeight: 500,
    fontSize: '14px',
    lineHeight: '21px',
    color: paletteOptions.text.main,
  },
  fieldValue: {
    fontWeight: 500,
    fontSize: '12px',
    lineHeight: '18px',
    color: paletteOptions.text.primary,
  },
  caption: {
    fontWeight: 'normal',
    fontSize: '0.75rem', //12px
    letterSpacing: '0.24px',
    opacity: 1,
  },
  overline: {
    fontSize: '0.75rem',
    fontWeight: 'bold',
    letterSpacing: '1.2px',
    lineHeight: '1.75',
    textTransform: 'uppercase',
    color: '#A3A3A3',
    opacity: 1,
    '&:active': {
      color: paletteOptions.text?.secondary,
    },
  },
  menu: {
    fontWeight: 'normal',
    fontSize: '16px',
    letterSpacing: '0.1px',
    opacity: 1,
    color: paletteOptions.menu?.main,
    '&:hover': {
      color: paletteOptions.menu?.hover,
      fontWeight: 'bold',
    },
  },
};

const options: ThemeOptions = {
  breakpoints: breakpointOptions,
  palette: paletteOptions,
  mixins: {
    menu: {
      minHeight: 50,
    },
    border: { color: '#DFE1E6' },
    modal: {
      borderRadius: '15px',
      dividerColor: '#E0E0E0',
      confirmMaxWidth: '460px',
      headerPadding: '1.25rem 1.5rem',
      bodyPadding: '1.5rem',
      formBodyPadding: '1.5rem',
      confirmBodyPadding: '1.25rem 1.5rem 2.25rem',
      confirmBodyTopMargin: '1.5rem',
      confirmMinHeight: '140px',
      footerPadding: '1.5rem',
      confirmBodyMinHeight: '140px',
      actionGap: '1rem',
      contentGap: '1rem',
    },
  },
  shape: {
    borderRadius: 10,
  },
  typography: typographyOptions,
  components: {
    MuiTextField: {
      styleOverrides: {
        root: {
          borderColor: 'inherit',
          '& .MuiInputBase-root': {
            fontSize: '1rem',
            fontWeight: 500,
            color: paletteOptions.text.primary,
            backgroundColor: paletteOptions.background.paper,
            height: '48px',
            paddingLeft: '1rem',
            paddingRight: '1rem',
            borderWidth: '1px',
            borderStyle: 'solid',
            borderColor: paletteOptions.primary.borderColor,
            '&.MuiInputBase-multiline': {
              height: 'auto',
            },
            '&:hover': {
              borderColor: paletteOptions.text.main,
            },
            '& fieldset': {
              borderWidth: 0,
            },
            '& input[type=color]': {
              marginRight: '.75rem',
            },
          },
          //&[size="medium"]
          '& .MuiInputBase-sizeMedium': {
            height: '48px',
          },
          //&[size="small"]
          '& .MuiInputBase-sizeSmall': {
            height: '32px',
          },
          //&[size="large"]
          '& .MuiInputBase-sizeLarge': {
            height: '56px',
          },
          '& .MuiInputBase-input': {
            fontSize: '1rem',
            padding: '0px',
          },
          '& .MuiInputBase-input::placeholder': {
            color: paletteOptions.text.hint,
            opacity: 1,
          },
          '& .MuiInputLabel-root': {
            fontSize: '1rem',
            color: '#808897',
          },
          '& input[type=number]': {
            MozAppearance: 'textfield',
          },
          '& .MuiOutlinedInput-input': {
            '&:-webkit-autofill': {
              backgroundColor: '#ffffff !important', // Background color for autofill
              color: paletteOptions.text.primary, // Text color for autofill
              transition: 'background-color 5000s ease-in-out 0s', // Prevent the blue background from showing
            },
          },
          '& .MuiSelect-select': {
            paddingTop: '.5rem',
            paddingBottom: '.5rem',
            display: 'flex',
            alignItems: 'center',
            height: '32px',
            background: '#fffff',
            color: paletteOptions.text.primary,
            borderRadius: '1px',
            borderColor: '#DFE1E6',
            '& .MuiSelect-nativeInput': {
              borderColor: '#DFE1E6',
            },
          },
          '& input[type=number]::-webkit-outer-spin-button, & input[type=number]::-webkit-inner-spin-button':
            {
              WebkitAppearance: 'none',
              margin: 0,
            },
        },
      },
      defaultProps: {
        inputProps: { autoComplete: 'off' },
        SelectProps: {
          MenuProps: defaultSelectMenuProps,
          IconComponent: ExpandMoreOutlined,
        },
      },
    },
    MuiSelect: {
      defaultProps: {
        MenuProps: defaultSelectMenuProps,
        IconComponent: ExpandMoreOutlined,
      },
    },
    MuiMenu: {
      defaultProps: defaultSelectMenuProps,
    },
    MuiPaper: {
      defaultProps: {
        sx: {
          boxShadow: 'none',
          borderWidth: '1px',
          borderColor: '#DFE1E6',
          borderStyle: 'solid',
          borderRadius: '10px',
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: ({ theme }) => ({
          borderRadius: theme.mixins.modal.borderRadius,
          overflow: 'hidden',
          color: theme.palette.text.primary,
        }),
      },
    },
    MuiDialogTitle: {
      defaultProps: {
        component: 'div',
      },
      styleOverrides: {
        root: ({ theme }) => ({
          padding: theme.mixins.modal.headerPadding,
          borderBottom: `1px solid ${theme.mixins.modal.dividerColor}`,
          color: theme.palette.text.primary,
        }),
      },
    },
    MuiDialogContent: {
      styleOverrides: {
        root: ({ theme }) => ({
          padding: theme.mixins.modal.bodyPadding,
          boxSizing: 'border-box',
          color: theme.palette.text.primary,
          '&.MuiDialogContent-root:first-of-type': {
            padding: theme.mixins.modal.bodyPadding,
          },
          '&.MuiDialogContent-dividers': {
            padding: theme.mixins.modal.bodyPadding,
            borderTop: 'none',
            borderBottom: 'none',
          },
        }),
      },
    },
    MuiDialogActions: {
      styleOverrides: {
        root: ({ theme }) => ({
          padding: theme.mixins.modal.footerPadding,
          borderTop: `1px solid ${theme.mixins.modal.dividerColor}`,
          gap: theme.mixins.modal.actionGap,
          justifyContent: 'flex-end',
          alignItems: 'center',
          flexWrap: 'wrap',
          color: theme.palette.text.primary,
          '& > :not(style) + :not(style)': {
            marginLeft: '0',
          },
        }),
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: paletteOptions.background.paper,
          borderRadius: 0,
          borderWidth: 0,
          borderBottomWidth: 1,
          color: '#0D0D12',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          fontSize: '16px',
          fontWeight: 'bold',
          textTransform: 'capitalize',
          borderRadius: '12px',
          height: '48px',
          //&[size="medium"]
          '&.MuiButton-sizeMedium': {
            height: '48px',
          },
          //&[size="small"]
          '&.MuiButton-sizeSmall': {
            height: '32px',
          },
          //&[size="large"]
          '&.MuiButton-sizeLarge': {
            height: '56px',
          },
          '&.MuiButton-colorSecondary': {
            backgroundColor: paletteOptions.background.paper,
          },
        },
      },
      variants: [
        {
          props: { variant: 'link' },
          style: {
            fontSize: '1rem',
            fontWeight: 'normal',
            textDecoration: 'underline',
            textTransform: 'none',
            color: paletteOptions.info.main,
            backgroundColor: 'transparent',
            cursor: 'pointer',
            border: 'none',
            outline: 'none',
            padding: '.5rem',
            '&:hover': {
              backgroundColor: 'transparent',
            },
            '&:disabled': {
              opaacity: 0.85,
              cursor: 'not-allowed',
            },
            '&> *': {
              verticalAlign: 'middle',
            },
          },
        },
      ],
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          '&.Mui-disabled': {
            '& svg': {
              color: paletteOptions.text.main,
            },
          },
        },
      },
    },
    MuiLink: {
      defaultProps: {
        color: paletteOptions.primary.main,
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          display: 'flex',
          alignItems: 'center',
          fontSize: '14px',
          color: '#313131',
          backgroundColor: '#fffff',
          '&.Mui-selected': {
            backgroundColor: paletteOptions.highlight.main,
          },
        },
      },
    },
    MuiCheckbox: {
      styleOverrides: {
        root: {
          color: paletteOptions.primary.borderColor,
          fontSize: '1.2rem', // Icon size
          padding: '9px 5px',
          '&:hover': {
            backgroundColor: 'transparent', // Remove hover background effect
          },
        },
      },
    },
    MuiAvatar: {
      styleOverrides: {
        root: {
          color: paletteOptions.background.paper,
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: ({ theme }) => ({
          borderBottomColor: theme.mixins.border.color,
          color: theme.palette.text.primary,
          padding: '0.75rem 0.875rem',
        }),
        head: ({ theme }) => ({
          backgroundColor: '#F8F9FB',
          color: theme.palette.text.main,
          fontSize: '14px',
          fontWeight: 600,
          lineHeight: '18px',
          '& .MuiTypography-root': {
            color: 'inherit',
            fontSize: 'inherit',
            fontWeight: 'inherit',
            lineHeight: 'inherit',
          },
        }),
        body: {
          fontSize: '14px',
          fontWeight: 500,
          lineHeight: '18px',
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: ({ theme }) => ({
          '&:last-child td, &:last-child th': {
            borderBottom: 'none',
          },
          '&:not(:last-child) td, &:not(:last-child) th': {
            borderBottomColor: theme.mixins.border.color,
          },
        }),
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          borderRadius: '10px',
          textTransform: 'capitalize',
          color: paletteOptions.text.primary,
        },
      },
    },
    MuiAccordionSummary: {
      styleOverrides: {
        root: {
          padding: '0',
          '&.Mui-expanded': {
            margin: '0',
            padding: '0',
            minHeight: '100%',
          },
        },
        content: {
          cursor: 'auto',
          margin: '0',
          '&.Mui-expanded': {
            margin: '0',
          },
        },
      },
    },
    MuiAccordionDetails: {
      styleOverrides: {
        root: {
          padding: '1rem 1.3rem 1.3rem',
        },
      },
    },
    MuiPickersDay: {
      styleOverrides: {
        root: ({ theme }) => ({
          color: theme.palette.text.primary,
          fontSize: '0.875rem',
          fontWeight: 400,
          '&:hover': {
            backgroundColor:
              theme.palette.highlight?.main || paletteOptions.highlight.main,
          },
          '&.Mui-selected': {
            backgroundColor: theme.palette.primary.main,
            color: theme.palette.primary.contrastText,
            fontWeight: 500,
            '&:hover': {
              backgroundColor: theme.palette.primary.main,
            },
            '&:focus': {
              backgroundColor: theme.palette.primary.main,
            },
          },
          '&.MuiPickersDay-today': {
            border: `1px solid ${theme.palette.primary.main}`,
            fontWeight: 500,
          },
        }),
      },
    },
    MuiDateCalendar: {
      styleOverrides: {
        root: ({ theme }) => ({
          backgroundColor: theme.palette.background.paper,
          border: `1px solid ${theme.palette.primary.borderColor || paletteOptions.primary.borderColor}`,
          borderRadius: '10px',
          paddingBottom: '0.75rem',
          '& .MuiDayCalendar-root': {
            paddingBottom: '0.5rem',
          },
          '& .MuiDayCalendar-weekContainer': {
            '& .MuiPickersDay-root': {
              '&.Mui-selected': {
                backgroundColor: theme.palette.primary.main,
                color: theme.palette.primary.contrastText,
              },
            },
          },
        }),
      },
    },
    MuiDayCalendar: {
      styleOverrides: {
        weekDayLabel: ({ theme }) => ({
          color: theme.palette.text.primary,
          fontSize: '0.875rem',
          fontWeight: 400,
        }),
      },
    },
    MuiPickersCalendarHeader: {
      styleOverrides: {
        root: ({ theme }) => ({
          backgroundColor: theme.palette.background.paper,
          color: theme.palette.text.primary,
          padding: '0.5rem 0.75rem',
          '& .MuiIconButton-root': {
            color:
              theme.palette.interactiveColor || paletteOptions.interactiveColor,
            '&:hover': {
              backgroundColor:
                (theme as any).calendarHoverColor ||
                theme.palette.highlight?.main ||
                paletteOptions.highlight.main,
            },
          },
        }),
        labelContainer: {
          '& .MuiPickersCalendarHeader-label': ({ theme }) => ({
            color: theme.palette.text.primary,
            fontWeight: 500,
            fontSize: '0.875rem',
          }),
        },
        switchViewButton: ({ theme }) => ({
          color: theme.palette.text.primary,
          '&:hover': {
            backgroundColor:
              theme.palette.highlight?.main || paletteOptions.highlight.main,
          },
        }),
      },
    },
    MuiPickersArrowSwitcher: {
      styleOverrides: {
        root: ({ theme }) => ({
          '& .MuiIconButton-root': {
            color:
              theme.palette.interactiveColor || paletteOptions.interactiveColor,
            '&:hover': {
              backgroundColor:
                (theme as any).calendarHoverColor ||
                theme.palette.highlight?.main ||
                paletteOptions.highlight.main,
            },
          },
        }),
      },
    },
    MuiPickersPopper: {
      styleOverrides: {
        paper: ({ theme }) => ({
          border: `1px solid ${theme.palette.primary.borderColor || paletteOptions.primary.borderColor}`,
          borderRadius: '10px',
          boxShadow: 'none',
        }),
      },
    },
  },
};

export { options as MuiTheme };
