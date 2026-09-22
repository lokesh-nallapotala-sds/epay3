import { ReactNode, ReactElement } from 'react';
import { useTheme } from '@mui/material/styles';

import Grid from '@mui/material/Grid';
import Button from '@mui/material/Button';
import Avatar from '@mui/material/Avatar';
import Accordion from '@mui/material/Accordion';
import Typography from '@mui/material/Typography';
import CheckIcon from '@mui/icons-material/Check';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import { useIntl } from 'react-intl';

interface CustomAccordionProps {
  title: string | ReactElement;
  sectionType: string;
  sectionIsComplete: boolean;
  children: ReactNode;
  expandIcon?: ReactElement;
  isExpanded?: boolean;
  isEditable?: boolean;
  editIsSelected: (sectionType: string) => void;
}

const EpayAccordion = ({
  title,
  sectionType,
  sectionIsComplete,
  expandIcon,
  isExpanded,
  isEditable,
  editIsSelected,
  children,
}: CustomAccordionProps) => {
  const theme = useTheme();
  const intl = useIntl();
  const f = (id) => intl.formatMessage({ id: id });
  const primaryColor = theme.palette.interactiveColor;
  const borderColor = sectionIsComplete ? primaryColor : '#E0E0E0';
  const textColor = sectionIsComplete
    ? primaryColor
    : theme.palette.text.primary;

  return (
    <Accordion
      expanded={isExpanded}
      sx={{
        border: `1px solid ${borderColor}`,
        borderRadius: '8px',
        boxShadow: 'none',
        '&.Mui-expanded': {
          borderRadius: '8px',
        },
        '&:not(.Mui-expanded)': {
          borderRadius: '8px',
        },
      }}
    >
      <AccordionSummary
        expandIcon={expandIcon || <ExpandMoreIcon />}
        onClick={(event) => event.stopPropagation()}
      >
        <Grid container justifyContent="space-between" alignItems="center">
          <Grid
            id="payment-header"
            item
            container
            sx={{
              width: !sectionIsComplete ? '100%' : 'auto',
              padding: sectionIsComplete ? '0 1.3rem' : '1rem 1.3rem',
              borderBottom: isExpanded ? '1px solid #E0E0E0' : 'none',
              flexDirection: 'row',
              justifyContent: 'flex-start',
              alignItems: 'center',
              gap: 1.5,
              height: '51px',
            }}
          >
            {sectionIsComplete && (
              <Avatar
                sx={{
                  color: primaryColor,
                  border: `1px solid ${primaryColor}`,
                  backgroundColor: '#F8F9F9',
                  width: '2rem',
                  height: '2rem',
                  fontSize: '1.25rem',
                }}
              >
                <CheckIcon fontSize="small" />
              </Avatar>
            )}
            <Typography
              variant="h5"
              sx={{
                color: textColor,
              }}
            >
              {title}
            </Typography>
          </Grid>
          <Grid mr="1rem">
            {isEditable && (
              <Button
                variant="text"
                sx={{
                  textDecoration: 'none',
                  color: primaryColor,
                  fontSize: '0.85rem',
                }}
                onClick={() => {
                  editIsSelected(sectionType);
                }}
              >
                {f('avs.page.header.change')}
              </Button>
            )}
          </Grid>
        </Grid>
      </AccordionSummary>
      <AccordionDetails>{children}</AccordionDetails>
    </Accordion>
  );
};

export default EpayAccordion;
