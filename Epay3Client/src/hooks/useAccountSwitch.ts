import { useCallback } from 'react';
import { useIntl } from 'react-intl';

import { Account } from 'types/Account';
import { PayerDetails } from 'types/Payment';
import { useEpayToast } from 'providers/EpayToastProvider';
import {
  getEffectivePayerFromAccount,
  extractLastCardNumbers,
  getGatewayCardType,
} from 'utilities/utilities';
import { useAppDispatch, useAppSelector } from 'redux/hooks';
import {
  setSelectedAccount,
  setImpersonatedAccount,
  setSelectedPayer,
} from 'redux/reducers';
import { selectPaymentCards } from 'redux/selectors/configSelectors';

export const useAccountSwitch = () => {
  const dispatch = useAppDispatch();
  const paymentCardsConfig = useAppSelector(selectPaymentCards);
  const { showToastMessage } = useEpayToast();
  const intl = useIntl();
  const f = useCallback(
    (id: string, values?: Record<string, string | number>) =>
      intl.formatMessage({ id, defaultMessage: id }, values),
    [intl],
  );

  const hydratePayerDetails = useCallback(
    (account: Account, payerAcct?: string): PayerDetails | null => {
      const source = account.resolvedPayerDetails;
      if (!source || !payerAcct) {
        return null;
      }

      return {
        ...source,
        customerNumber: source.customerNumber ?? payerAcct,
        companyCode: source.companyCode ?? account.companyCode ?? '',
        paymentCards: (source.paymentCards ?? []).map((card) => ({
          ...card,
        })),
      };
    },
    [],
  );

  const switchAccount = useCallback(
    async (
      account: Account,
      impersonatedUserId?: string, // If present, we are impersonating
      _impersonatedUserAccountType?: string,
    ) => {
      try {
        void _impersonatedUserAccountType;

        if (impersonatedUserId) {
          dispatch(setSelectedAccount({ selectedAccount: account }));
          dispatch(setImpersonatedAccount({ impersonatedAccount: account }));
        } else {
          dispatch(setSelectedAccount({ selectedAccount: account }));
        }

        const payerAcct = getEffectivePayerFromAccount(account);
        dispatch(setSelectedPayer(payerAcct ?? ''));

        if (payerAcct) {
          const payerDetailsSource = hydratePayerDetails(account, payerAcct);
          if (!payerDetailsSource) {
            throw new Error(
              'Resolved payer details not found in accounts response',
            );
          }

          const payerDetails: PayerDetails = {
            ...payerDetailsSource,
            paymentCards: (payerDetailsSource.paymentCards ?? []).map(
              (card) => ({ ...card }),
            ),
          };

          const today = new Date();
          (payerDetails.paymentCards ?? []).forEach((card) => {
            // card.sapCardType = card.sapCardType || card.paymentCardType;
            card.sapCardType = card.sapCardType || '';
            card.gatewayCardType =
              card.gatewayCardType ||
              getGatewayCardType(card.paymentCardType, paymentCardsConfig);
            card.cardLast4Digit =
              card.cardLast4Digit ||
              extractLastCardNumbers(
                card.paymentCardType,
                card.paymentCardToken,
              );
            card.isDefault = card.default === 'X';

            if (card.paymentCardType !== 'EC') {
              if (!card.validTo) return;

              const expirationDate = new Date(card.validTo);
              const daysUntilExpiration = Math.ceil(
                (expirationDate.getTime() - today.getTime()) /
                  (1000 * 60 * 60 * 24),
              );

              const cardIdentifier = extractLastCardNumbers(
                card.paymentCardType,
                card.paymentCardToken,
              );

              if (expirationDate < today) {
                showToastMessage(
                  'warning',
                  f('payment_methods.expired', { last4: cardIdentifier }),
                );
              } else if (daysUntilExpiration <= 30) {
                showToastMessage(
                  'warning',
                  f('payment_methods.expiringSoon', {
                    last4: cardIdentifier,
                    days: daysUntilExpiration,
                  }),
                );
              }
            }
          });
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        showToastMessage('error', errorMessage);
        throw error; // Re-throw so caller can handle if needed
      }
    },
    [dispatch, showToastMessage, f, hydratePayerDetails, paymentCardsConfig],
  );

  return { switchAccount };
};
