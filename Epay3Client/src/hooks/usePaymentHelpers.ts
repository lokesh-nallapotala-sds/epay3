import { useEffect, useMemo, useState } from 'react';
import { useGetPaymentReasonCodesQuery } from 'redux/api/ePayApi';
import { useSelector } from 'react-redux';

import { useAppDispatch, useAppSelector } from 'redux/hooks';
import {
  payerSelector,
  selectAccountState as selectedAccountSelector,
  selectImpersonatedAccountState as impersonatedAccountSelector,
  sessionCardsSelector,
  setIsPartialPaymentAllowed,
  setOverpaymentAllowed,
  setPaymentMethods,
} from 'redux/reducers';
import { EpayApplicationService } from 'services/EpayApplicationService';
import { PaymentCard, PaymentMethod } from 'types/Payment';
import { setPaymentCardsType } from '../redux/reducers/configSlice';
import {
  selectCustomConfig,
  selectPaymentCards,
} from 'redux/selectors/configSelectors';
import {
  enrichPaymentCardTypeFields,
  enrichPaymentMethodTypeFields,
  getEffectivePayerFromAccount,
} from 'utilities/utilities';

const getPaymentMethodIdentity = (method: PaymentMethod) =>
  method.token ||
  method.key ||
  [method.cardType, method.name].filter(Boolean).join('|');

const dedupePaymentMethods = (methods: PaymentMethod[]): PaymentMethod[] =>
  methods.filter(
    (method, index, list) =>
      list.findIndex(
        (candidate) =>
          getPaymentMethodIdentity(candidate) ===
          getPaymentMethodIdentity(method),
      ) === index,
  );

const getPaymentCardIdentity = (card: PaymentCard) =>
  card.paymentCardToken ||
  [card.paymentCardType, card.paymentCardName].filter(Boolean).join('|');

const dedupePaymentCards = (cards: PaymentCard[]): PaymentCard[] =>
  cards.filter(
    (card, index, list) =>
      list.findIndex(
        (candidate) =>
          getPaymentCardIdentity(candidate) === getPaymentCardIdentity(card),
      ) === index,
  );

//TODO: this is just a wrapper around a selector - should be removed
export const usePayer = () => {
  const [payer, setPayer] = useState<string>('');
  const [error] = useState('');
  const account = useAppSelector(selectedAccountSelector);
  useEffect(() => {
    setPayer(account?.primaryAcct ?? '');
  }, []);

  return { payer, error };
};

export const useEffectiveAccount = () => {
  // TODO: needs to be typed - but account slice needs done first
  const activeUserAccount = useAppSelector(selectedAccountSelector);
  const impersonatedUserAccount = useAppSelector(impersonatedAccountSelector);

  const isValidImpersonatedAccount =
    impersonatedUserAccount && Object.keys(impersonatedUserAccount).length > 0;

  return isValidImpersonatedAccount
    ? impersonatedUserAccount
    : activeUserAccount;
};

export const useRelatedAccounts = () => {
  const account = useEffectiveAccount();
  return account?.relatedAccounts ?? [];
};

export const usePaymentMethods = (): {
  methods: PaymentMethod[];
  error: boolean;
} => {
  const dispatch = useAppDispatch();
  const payer = useAppSelector(payerSelector);
  const selectedAccount = useAppSelector(selectedAccountSelector);
  const impersonatedAccount = useAppSelector(impersonatedAccountSelector);
  const sessionCards = useAppSelector(sessionCardsSelector);
  const paymentCardsConfig = useAppSelector(selectPaymentCards);

  const hasImpersonatedAccount =
    impersonatedAccount && Object.keys(impersonatedAccount).length > 0;
  const effectiveAccount = hasImpersonatedAccount
    ? impersonatedAccount
    : selectedAccount;
  const effectivePayer = getEffectivePayerFromAccount(effectiveAccount, payer);
  const effectivePayerDetails = useMemo(() => {
    const source = effectiveAccount?.resolvedPayerDetails;
    if (!source) {
      return null;
    }

    return {
      ...source,
      customerNumber: source.customerNumber ?? effectivePayer ?? '',
      companyCode: source.companyCode ?? effectiveAccount.companyCode ?? '',
      paymentCards: (source.paymentCards ?? []).map((card) => ({ ...card })),
      payerAutoPayStatus: (source.payerAutoPayStatus ?? []).map((status) => ({
        ...status,
      })),
    };
  }, [effectiveAccount, effectivePayer]);

  const mappedMethods: PaymentMethod[] = useMemo(() => {
    const persistedCards = effectivePayerDetails?.paymentCards || [];

    const serverMethods = persistedCards.map((card) => {
      const enrichedCard = enrichPaymentCardTypeFields(card);

      return enrichPaymentMethodTypeFields({
        name: enrichedCard.paymentCardName,
        dropDownDisplayName: `${enrichedCard.paymentCardType} **** ${enrichedCard.cardLast4Digit} - ${enrichedCard.paymentCardName}`,
        key: '',
        cardType: enrichedCard.paymentCardType,
        sapCardType: enrichedCard.sapCardType,
        gatewayCardType: enrichedCard.gatewayCardType,
        default: enrichedCard.default === 'X',
        token: enrichedCard.paymentCardToken,
        validFrom: enrichedCard.validFrom,
        validTo: enrichedCard.validTo,
        isSession: false,
        cardLast4Digit: enrichedCard.cardLast4Digit,
      });
    });

    const sessionEntry = sessionCards.find(
      (entry) =>
        entry.payer === effectivePayer ||
        (entry.payer && effectivePayer && entry.payer.replace(/^0+/, '') === effectivePayer.replace(/^0+/, '')),
    );
    const sessionMethods =
      sessionEntry?.cards.flatMap((entry) =>
        Object.values(entry.card).map((card) => {
          const enrichedCard = enrichPaymentCardTypeFields(card);

          return enrichPaymentMethodTypeFields({
            name: enrichedCard.paymentCardName,
            dropDownDisplayName: `${enrichedCard.paymentCardType} **** ${enrichedCard.cardLast4Digit} - ${enrichedCard.paymentCardName} (session)`,
            key: '',
            cardType: enrichedCard.paymentCardType,
            sapCardType: enrichedCard.sapCardType,
            gatewayCardType: enrichedCard.gatewayCardType,
            default: false,
            token: enrichedCard.paymentCardToken,
            validFrom: enrichedCard.validFrom,
            validTo: enrichedCard.validTo,
            isSession: true,
            cardLast4Digit: enrichedCard.cardLast4Digit,
          });
        }),
      ) || [];

    return dedupePaymentMethods([...serverMethods, ...sessionMethods]);
  }, [
    effectivePayerDetails?.paymentCards,
    sessionCards,
    effectivePayer,
    paymentCardsConfig,
  ]);

  useEffect(() => {
    dispatch(setPaymentMethods(mappedMethods));
  }, [dispatch, mappedMethods]);

  return { methods: mappedMethods, error: false };
};

export const useAllPaymentCardsForPayer = (): PaymentCard[] => {
  const impersonatedAccount = useSelector(impersonatedAccountSelector);
  const selectedAccount = useSelector(selectedAccountSelector);
  const payer = useSelector(payerSelector);
  const sessionCards = useSelector(sessionCardsSelector);
  const paymentCardsConfig = useSelector(selectPaymentCards);

  const hasImpersonatedAccount =
    impersonatedAccount && Object.keys(impersonatedAccount).length > 0;
  const effectiveAccount = hasImpersonatedAccount
    ? impersonatedAccount
    : selectedAccount;
  const effectivePayer = getEffectivePayerFromAccount(effectiveAccount, payer);
  const effectiveDetails = useMemo(() => {
    const source = effectiveAccount?.resolvedPayerDetails;
    if (!source) {
      return null;
    }

    return {
      ...source,
      customerNumber: source.customerNumber ?? effectivePayer ?? '',
      companyCode: source.companyCode ?? effectiveAccount.companyCode ?? '',
      paymentCards: (source.paymentCards ?? []).map((card) => ({ ...card })),
      payerAutoPayStatus: (source.payerAutoPayStatus ?? []).map((status) => ({
        ...status,
      })),
    };
  }, [effectiveAccount, effectivePayer]);

  return useMemo(() => {
    const persistedCards = (effectiveDetails?.paymentCards || []).map((card) =>
      enrichPaymentCardTypeFields(card),
    );

    const sessionCardEntry = sessionCards.find(
      (entry) =>
        entry.payer === effectivePayer ||
        (entry.payer && effectivePayer && entry.payer.replace(/^0+/, '') === effectivePayer.replace(/^0+/, '')),
    );
    const sessionPaymentCards =
      sessionCardEntry?.cards?.flatMap((c) =>
        Object.values(c.card).map((card) => ({
          ...enrichPaymentCardTypeFields(card),
          isSession: true,
        })),
      ) || [];

    return dedupePaymentCards([...persistedCards, ...sessionPaymentCards]);
  }, [
    effectiveDetails?.paymentCards,
    sessionCards,
    effectivePayer,
    paymentCardsConfig,
  ]);
};

export const useGetReasonCodes = (type: string) => {
  const { data: allCodes = [], error } = useGetPaymentReasonCodesQuery();
  const reasonCodes = useMemo(
    () =>
      type === ''
        ? allCodes
        : allCodes.filter((rc) => rc.paymentTypeCode === type),
    [allCodes, type],
  );
  return { reasonCodes, error };
};

export const useSetGlobalSettings = () => {
  const dispatch = useAppDispatch();
  const customConfig = useAppSelector(selectCustomConfig);

  useEffect(() => {
    if (!customConfig) return;

    dispatch(
      setIsPartialPaymentAllowed(
        customConfig.generalData?.isPartialPaymentAllowed ?? false,
      ),
    );

    const hasPaymentTypeO =
      customConfig.paymentTypes?.some(
        (method) =>
          method.paymentTypeCode === 'O' && method.isOverpaymentAllowed,
      ) ?? false;
    dispatch(setOverpaymentAllowed(hasPaymentTypeO));

    if (Array.isArray(customConfig.paymentCards)) {
      const types = customConfig.paymentCards
        .map((card) => card.paymentCardType?.toUpperCase())
        .filter(Boolean);
      dispatch(setPaymentCardsType(types.join(',')));
    } else {
      dispatch(setPaymentCardsType(''));
    }
  }, [customConfig, dispatch]);
};
export const useGetPaymentCardType = () => {
  const getCustomConfig = EpayApplicationService.usePaymentCardTypeConfig();
  const dispatch = useAppDispatch();

  useEffect(() => {
    getCustomConfig().then((config: string) => {
      dispatch(setPaymentCardsType(config));
    });
  }, []);
};
