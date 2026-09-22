import { useIntl } from 'react-intl';

import { useAppSelector } from 'redux/hooks';
import { regionalFormatSelector } from 'redux/reducers';
import { Box, useTheme } from '@mui/system';
import { styled } from '@mui/material/styles';
import { Grid, Typography } from '@mui/material';
import { toCurrencyString, toFormattedDateString } from 'utilities/utilities';
import { Invoice } from 'types';

interface PaymentInvoiceCardProps {
  data: Invoice;
  width: string;
  currency: string;
  theme?: unknown;
}

interface CardListBoxProps {
  selected: boolean;
  width: string;
}

const CardListBox = styled(Box)<CardListBoxProps>(
  ({ theme, width, selected }) => ({
    backgroundColor: selected ? theme.palette.highlight.main : 'inherit',
    borderRadius: `${theme.shape.borderRadius}px`,
    border: `1px solid ${theme.mixins.border.color}`,
    overflowX: 'auto',
    width: width ?? '100%',
    padding: '.5rem .8rem',
    marginBottom: '.8rem',
    justifySelf: 'center',
  }),
);

export default function PaymentInvoiceCard(props: PaymentInvoiceCardProps) {
  const intl = useIntl();
  const f = (id: string) => intl.formatMessage({ id: id });
  const theme = useTheme();
  const regionalFormat = useAppSelector(regionalFormatSelector);

  return (
    <CardListBox
      theme={props.theme as any}
      width={props.width}
      selected={props.data.isSelected ?? false}
    >
      <Grid container justifyContent="space-between">
        <Grid item container flexDirection="column" width="unset">
          <Grid item>
            <Typography variant="body1">
              {`${f('invoices.table.document')} ${
                props.data.billingDocumentNumber
                  ? props.data.billingDocumentNumber?.replace(/^0+/, '')
                  : props.data.documentNumberFinance?.replace(/^0+/, '')
              }`}
            </Typography>
          </Grid>
          <Grid item>
            {f('invoices.table.due')}
            {props.data.dueDate &&
              (new Date(props.data.dueDate) < new Date() ? (
                <Typography color={theme.palette.error.main}>
                  {toFormattedDateString(props.data.dueDate, regionalFormat)}
                </Typography>
              ) : (
                <Typography>
                  {toFormattedDateString(props.data.dueDate, regionalFormat)}
                </Typography>
              ))}
          </Grid>
        </Grid>
      </Grid>

      <Grid container paddingTop=".8rem" justifyContent="space-between">
        <Grid item>{f('invoices.table.open')}</Grid>
        <Grid item>
          {toCurrencyString(
            props.currency,
            props.data.openAmount ?? 0,
            true,
            regionalFormat,
          )}
        </Grid>
      </Grid>
    </CardListBox>
  );
}
