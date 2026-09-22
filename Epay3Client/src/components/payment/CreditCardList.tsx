import { useEffect, useState } from 'react';

import { FormattedMessage } from 'react-intl';

import { Box } from '@mui/system';
import { PaymentCard } from 'types/Payment';
import { Grid } from '@mui/material';

import { CardDetails, type CreditCardListVariant } from './CardDetails';

interface CreditCardListProps {
  cards: PaymentCard[];
  type: string;
  isGuestPayment?: boolean;
  isAutoPayFlagEnabled?: boolean;
  isAutoPayEnrolled?: boolean;
  resetAllCheckboxes?: boolean;
  hideDefault?: boolean;
  variant?: CreditCardListVariant;
}

export const CreditCardList = ({
  cards,
  type,
  isGuestPayment = false,
  isAutoPayFlagEnabled = false,
  isAutoPayEnrolled = false,
  hideDefault = true,
  variant = 'compact',
}: CreditCardListProps) => {
  const [showMessage, setShowMessage] = useState<boolean>(false);
  useEffect(() => {
    setShowMessage(cards.length === 0);
  }, [cards]);

  if (variant === 'settingsGrid') {
    return (
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            md: 'repeat(2, minmax(0, 1fr))',
          },
          columnGap: 2,
          rowGap: 3,
          width: '100%',
        }}
      >
        {showMessage ? (
          <Box sx={{ margin: '5px' }}>
            {type === 'card' ? (
              <FormattedMessage id={'payment_methods.cards_empty'} />
            ) : (
              <FormattedMessage id={'payment_methods.checks_empty'} />
            )}
          </Box>
        ) : (
          cards.map((card) => (
            <Box key={card.paymentCardToken} width="100%" sx={{ pb: 1 }}>
              <CardDetails
                card={card}
                isGuestPayment={isGuestPayment}
                isAutoPayFlagEnabled={isAutoPayFlagEnabled}
                isAutoPayEnrolled={isAutoPayEnrolled}
                hideDefault={hideDefault}
                variant={variant}
              />
            </Box>
          ))
        )}
      </Box>
    );
  }

  return (
    <Grid container>
      {showMessage ? (
        <Grid item sx={{ margin: '5px' }}>
          {type === 'card' ? (
            <FormattedMessage id={'payment_methods.cards_empty'} />
          ) : (
            <FormattedMessage id={'payment_methods.checks_empty'} />
          )}
        </Grid>
      ) : (
        cards.map((card) => (
          <Grid
            xs={12}
            sm={12}
            lg={12}
            item
            key={card.paymentCardToken}
            width="100%"
            sx={{ margin: '5px' }}
          >
            <CardDetails
              card={card}
              isGuestPayment={isGuestPayment}
              isAutoPayFlagEnabled={isAutoPayFlagEnabled}
              isAutoPayEnrolled={isAutoPayEnrolled}
              hideDefault={hideDefault}
              variant={variant}
            />
          </Grid>
        ))
      )}
    </Grid>
  );
};
