import { useIntl } from 'react-intl';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import { PaymentMethod } from 'types/Payment';
import Typography from '@mui/material/Typography';
import EpayMoneyCheckIcon from 'shared/icons/EpayMoneyCheckIcon';
import PaymentIcon from 'shared/components/PaymentIcon';
import { mapPaymentIcon } from 'utilities/utilities';
import { CardType, getCardTypeResourceId } from 'types/SapConfig/CardType';

const getAccountTypeIcon = (accountType: string) => {
  if (accountType === 'EC') {
    return <EpayMoneyCheckIcon sx={{ fontSize: '150%' }} />;
  } else {
    return <PaymentIcon icon={mapPaymentIcon(accountType)} />;
  }
};

const getAccountNumberDisplayText = (
  accountType: string,
  accountSuffix: string,
) => {
  return `**** **** **** ${accountSuffix}`;
};

interface PaymentMethodCardProps {
  paymentMethod: PaymentMethod;
}

function PaymentMethodCard({ paymentMethod }: PaymentMethodCardProps) {
  const intl = useIntl();
  const f = (id) => intl.formatMessage({ id: id });

  // Use the canonical type and suffix
  const acctType = paymentMethod.sapCardType || paymentMethod.cardType;
  const acctSuffix = paymentMethod.cardLast4Digit ?? '';
  const acctName = paymentMethod.name;

  return (
    <Card sx={{ border: '1px solid #E0E0E0', borderRadius: '8px', mb: 2 }}>
      <Grid
        container
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        padding="1rem"
      >
        <Grid item xs={2} sm={1}>
          {getAccountTypeIcon(acctType)}
        </Grid>
        <Grid item xs={10} sm={9}>
          <Grid container direction="column">
            <Grid item>
              <Typography variant="body1" sx={{ fontWeight: 700 }}>
                {acctType === 'EC'
                  ? acctName
                  : f(getCardTypeResourceId(acctType as CardType))}
              </Typography>
            </Grid>
            <Grid item>
              <Typography variant="body2" sx={{ color: '#666D80' }}>
                {getAccountNumberDisplayText(acctType, acctSuffix)}
              </Typography>
            </Grid>
          </Grid>
        </Grid>
      </Grid>
    </Card>
  );
}

export default PaymentMethodCard;
