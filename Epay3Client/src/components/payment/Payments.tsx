import { useEffect, useMemo, useState, MouseEvent } from 'react';
import { useIntl } from 'react-intl';
import Ability from 'types/Ability';
import { Box, useTheme } from '@mui/system';
import { EditNoteTwoTone } from '@mui/icons-material';
import { useEpayToast } from 'providers/EpayToastProvider';
import EpayAccordion from 'shared/components/EpayAccordion';
import {
  compactFilterMenuItemSx,
  compactFilterSelectProps,
} from 'shared/components/compactFilterSelectStyles';
import { getCompactFilterFieldSx } from 'shared/components/compactFilterFieldStyles';
import { useAutoFlipSelect } from 'shared/components/useAutoFlipSelect';
import { useAppDispatch, useAppSelector } from 'redux/hooks';
import { PaymentCard, PaymentMethod, PaymentParameters } from 'types/Payment';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import { Button, Grid, MenuItem, TextField, Typography } from '@mui/material';
import {
  clearCurrentPaymentMethodSelection,
  enrichPaymentMethodTypeFields,
  getAccountIdentity,
  getCurrentPaymentMethodSelection,
  rememberCurrentPaymentMethodSelection,
  toCurrencySymbol,
} from 'utilities/utilities';
import {
  useEffectiveAccount,
  useAllPaymentCardsForPayer,
  usePaymentMethods,
} from 'hooks/usePaymentHelpers';
import { usePayerDetails } from 'providers/PayerDetailsProvider';
import {
  addressSelector,
  resetAddressConfirmationState,
  setAddressValidationIsEnabled,
  setPaymentMethodIsCreditCard,
  setPaymentMethodIsEditable,
  userHasAbility,
  selectUserState as userSelector,
} from 'redux/reducers';
import AddressValidation from './AddressValidation';
import AddressZipValidation from './AddressZipValidation';
import { ManagePaymentMethods } from './ManagePaymentMethods';
import PaymentTotalsSummary from './PaymentTotalsSummary';
import {
  selectAddressValidationOptions,
  selectCompanyCodes,
  selectEnablePreAuth,
  selectIsAutoPayEnabled,
  selectIsCVVAllowedFromCustomConfig,
  selectPaymentConfigLoaded,
  selectPaymentConfig,
} from '../../redux/selectors/configSelectors';
import {
  ADDRESS_VALIDATION_OFF,
  ADDRESS_VALIDATION_ZIP,
  CVV_RULES,
  DefaultPaymentMethod,
  PaymentTypes,
  URL_PARAM_ACCESS_TOKEN,
} from '../../constants/UiOptions';
import { usePaymentExecution } from 'hooks/usePaymentExecution';
import { useFormat } from 'hooks/useFormat';

export default function Payments({
  data,
  isDeposit,
  depositDetails,
  validateInvoiceData,
  payer,
  payTotal = 0,
  currencyKey = 'USD',
  setPaymentMethodType,
}: PaymentParameters) {
  const theme = useTheme();
  const intl = useIntl();
  const f = useFormat();

  const dispatch = useAppDispatch();
  const { showToastMessage } = useEpayToast();
  const user = useAppSelector(userSelector);
  const config = useAppSelector(selectPaymentConfig) ?? undefined;
  const isCVVAllowed = useAppSelector(selectIsCVVAllowedFromCustomConfig);

  const canMakePayment = userHasAbility(user, Ability.MakePayment);
  const canManagePaymentMethods = userHasAbility(
    user,
    Ability.ManagePaymentMethods,
  );

  const selectedAccount = useEffectiveAccount();
  const { payerDetails } = usePayerDetails();
  const cards = useAllPaymentCardsForPayer();

  const [paymentTotal, setPaymentTotal] = useState(0);
  const [amountToPay, setAmountToPay] = useState(0);
  const [overPaymentTotal, setOverPaymentTotal] = useState(0);

  const isAutoPayEnabled = useAppSelector(selectIsAutoPayEnabled);
  const paymentConfigLoaded = useAppSelector(selectPaymentConfigLoaded);
  const companyCodes = useAppSelector(selectCompanyCodes);
  const addressValidationOptions = useAppSelector(
    selectAddressValidationOptions,
  );
  const enablePreAuth = useAppSelector(selectEnablePreAuth);

  const companyCodeDetail = useMemo(() => {
    return companyCodes?.find(
      (code) => code.companyCode === selectedAccount?.companyCode,
    );
  }, [companyCodes, selectedAccount?.companyCode]);
  const accountIdentity = getAccountIdentity(selectedAccount);

  const defaultPaymentMethod = useMemo<PaymentMethod>(
    () => ({
      name: '',
      dropDownDisplayName: f('payment.pay_with'),
      key: DefaultPaymentMethod.key,
      cardType: DefaultPaymentMethod.cardType,
      token: DefaultPaymentMethod.token,
      default: DefaultPaymentMethod.default,
      cardLast4Digit: '',
    }),
    [intl],
  );
  const [paymentCard, setPaymentCard] = useState<PaymentMethod>(() => {
    const rememberedMethod = getCurrentPaymentMethodSelection(
      payer,
      accountIdentity,
    );
    return rememberedMethod ?? defaultPaymentMethod;
  });

  const isStripeCard = useMemo(
    () =>
      Boolean(
        paymentCard?.token?.startsWith('pm_') ||
        paymentCard?.token?.startsWith('tok_') ||
        paymentCard?.key?.startsWith('pm_')
      ),
    [paymentCard]
  );
  const [cvv, setCVV] = useState('');
  const [isCvvError, setIsCvvError] = useState(false);
  const [cvvError, setCvvError] = useState('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [creditAmount, setCreditAmount] = useState<number>(0);
  const [paymentNote, setpaymentNote] = useState('');
  const [showManagePayments, setShowManagePayments] = useState(() => {
    const search = new URLSearchParams(window.location.search);
    return search.has(URL_PARAM_ACCESS_TOKEN) || search.has('access_token');
  });
  const [startPay, setStartPay] = useState<boolean>(false);
  const [paymentMethodsList, setPaymentMethodsList] = useState<PaymentMethod[]>(
    [],
  );
  const {
    addressValidationIsEditable,
    paymentMethodIsExpanded,
    paymentMethodIsComplete,
    paymentMethodIsEditable,
    paymentMethodIsCreditCard,
  } = useAppSelector(addressSelector);

  const { methods } = usePaymentMethods();

  const arePaymentMethodDetailsEqual = (
    currentMethod: PaymentMethod | null | undefined,
    nextMethod: PaymentMethod | null | undefined,
  ) => {
    if (!currentMethod || !nextMethod) {
      return currentMethod === nextMethod;
    }

    return (
      currentMethod.token === nextMethod.token &&
      currentMethod.key === nextMethod.key &&
      currentMethod.name === nextMethod.name &&
      currentMethod.cardType === nextMethod.cardType &&
      currentMethod.validTo === nextMethod.validTo &&
      currentMethod.validFrom === nextMethod.validFrom &&
      currentMethod.default === nextMethod.default &&
      currentMethod.cardLast4Digit === nextMethod.cardLast4Digit
    );
  };

  const isSamePaymentMethod = (
    left: PaymentMethod | null | undefined,
    right: PaymentMethod | null | undefined,
  ) => {
    if (!left || !right) {
      return left === right;
    }

    const leftIds = [left.token, left.key].filter(Boolean);
    const rightIds = [right.token, right.key].filter(Boolean);

    return leftIds.some((id) => rightIds.includes(id));
  };

  const getPaymentMethodDisplaySignature = (
    paymentMethod: PaymentMethod | null | undefined,
  ) =>
    [
      paymentMethod?.dropDownDisplayName || '',
      paymentMethod?.cardType || '',
      paymentMethod?.name || '',
      paymentMethod?.validTo || '',
      paymentMethod?.validFrom || '',
    ].join('|');

  const findMatchingPaymentMethod = (
    target: PaymentMethod | null | undefined,
    list: PaymentMethod[],
  ) => {
    if (!target) {
      return null;
    }

    return (
      list.find((pm) => isSamePaymentMethod(pm, target)) ||
      list.find(
        (pm) =>
          getPaymentMethodDisplaySignature(pm) ===
          getPaymentMethodDisplaySignature(target),
      ) ||
      null
    );
  };

  useEffect(() => {
    if (addressValidationOptions) {
      dispatch(setAddressValidationIsEnabled(addressValidationOptions));
    }
  }, [addressValidationOptions, dispatch]);

  useEffect(() => {
    dispatch(resetAddressConfirmationState());
  }, [dispatch]);

  useEffect(() => {
    if (!isDeposit) {
      if (data) {
        const updateData = data.map((item) => ({
          ...item,
          overPayment:
            item.paymentAmount > (item.openAmount || 0)
              ? item.paymentAmount - (item.openAmount || 0)
              : 0,
          paymentAmount:
            item.paymentAmount > (item.openAmount || 0)
              ? item.openAmount || 0
              : item.paymentAmount,
        }));

        let paymentAmountTotal = 0;
        paymentAmountTotal = updateData
          .filter((invoice) => invoice.invoiceStatus !== 'Credit')
          .reduce((total, current) => total + (current.paymentAmount || 0), 0);
        setPaymentTotal(paymentAmountTotal);
        let credit = 0;
        credit = updateData
          .filter((invoice) => invoice.invoiceStatus === 'Credit')
          .reduce((sum, invoice) => sum + invoice.paymentAmount, 0);
        setCreditAmount(credit);

        let overPayment = 0;
        overPayment = updateData
          .filter((invoice) => invoice.invoiceStatus !== 'Credit')
          .reduce((sum, invoice) => sum + invoice.overPayment, 0);
        setOverPaymentTotal(overPayment);

        let total = 0;
        total = updateData
          .filter((invoice) => invoice.invoiceStatus !== 'Credit')
          .reduce((total, current) => total + current.paymentAmount, 0);
        setAmountToPay(total + credit + overPayment);
      }
    }
  }, [data, isDeposit]);

  useEffect(() => {
    if (!paymentMethodsList?.length) {
      if (!arePaymentMethodDetailsEqual(paymentCard, defaultPaymentMethod)) {
        setPaymentCard(defaultPaymentMethod);
      }
      clearCurrentPaymentMethodSelection();
      dispatch(setPaymentMethodIsCreditCard(false));
      return;
    }

    const matchingPayment = findMatchingPaymentMethod(
      paymentCard,
      paymentMethodsList,
    );

    if (matchingPayment) {
      if (!arePaymentMethodDetailsEqual(paymentCard, matchingPayment)) {
        setPaymentCard(matchingPayment);
      }
      dispatch(
        setPaymentMethodIsCreditCard(
          matchingPayment.cardType !== PaymentTypes.EC,
        ),
      );
      return;
    }

    const rememberedMethod = getCurrentPaymentMethodSelection(
      payer,
      accountIdentity,
    );
    const currentSelectionMethod = findMatchingPaymentMethod(
      rememberedMethod,
      paymentMethodsList,
    );

    if (currentSelectionMethod) {
      if (!arePaymentMethodDetailsEqual(paymentCard, currentSelectionMethod)) {
        setPaymentCard(currentSelectionMethod);
      }
      dispatch(
        setPaymentMethodIsCreditCard(
          currentSelectionMethod.cardType !== PaymentTypes.EC,
        ),
      );
      return;
    }

    clearCurrentPaymentMethodSelection();
    const defaultPayment =
      paymentMethodsList.find((pm) => pm.default === true) ||
      defaultPaymentMethod;

    if (!arePaymentMethodDetailsEqual(paymentCard, defaultPayment)) {
      setPaymentCard(defaultPayment);
    }
    dispatch(
      setPaymentMethodIsCreditCard(defaultPayment.cardType !== PaymentTypes.EC),
    );
  }, [
    payerDetails,
    paymentMethodsList,
    defaultPaymentMethod,
    accountIdentity,
    dispatch,
    paymentCard,
    payer,
  ]);

  useEffect(() => {
    if (!paymentCard) return;
    setCVV('');
    dispatch(
      setPaymentMethodIsCreditCard(paymentCard.cardType !== PaymentTypes.EC),
    );
    setPaymentMethodType?.(paymentCard.cardType || '');
  }, [
    paymentCard?.token,
    paymentCard?.key,
    paymentCard?.cardType,
    dispatch,
    setPaymentMethodType,
  ]);

  useEffect(() => {
    if (!paymentMethodsList.length) {
      return;
    }

    if (paymentCard?.token === defaultPaymentMethod.token) {
      clearCurrentPaymentMethodSelection();
      return;
    }

    const matchingPayment = findMatchingPaymentMethod(
      paymentCard,
      paymentMethodsList,
    );

    if (matchingPayment) {
      rememberCurrentPaymentMethodSelection(
        matchingPayment,
        payer,
        accountIdentity,
      );
    }
  }, [
    accountIdentity,
    defaultPaymentMethod.token,
    payer,
    paymentCard?.token,
    paymentCard?.key,
    paymentMethodsList,
  ]);

  useEffect(() => {
    if (!paymentCard) return;

    const ccMax = config?.maximumAllowedCCAmount || 0;
    const ecMax = config?.maximumAllowedECAmount || 0;
    const symbol = toCurrencySymbol(currencyKey);

    const limits = {
      [PaymentTypes.CC]: {
        max: ccMax,
        noteKey: 'payment.cclimt',
        formatted: `${symbol}${ccMax}`,
      },
      [PaymentTypes.EC]: {
        max: ecMax,
        noteKey: 'payment.eclimt',
        formatted: `${symbol}${ecMax}`,
      },
    };

    const { max, noteKey, formatted } =
      limits[paymentCard.cardType] || limits[PaymentTypes.CC];

    setpaymentNote(max === 0 ? ' ' : f(noteKey).replace('{amount}', formatted));
  }, [paymentCard, config, currencyKey, f]);

  const handlePaymentCardChange = (e) => {
    if (e.target.value === defaultPaymentMethod.token) {
      setPaymentCard(defaultPaymentMethod);
      setCVV('');
      setPaymentMethodType?.('');
      clearCurrentPaymentMethodSelection();
      return;
    }

    setStartPay(false);

    const card = paymentMethodsList?.find(
      (card) => card.token === e.target.value,
    );

    if (card) {
      rememberCurrentPaymentMethodSelection(card, payer, accountIdentity);
      setPaymentCard(card);
      setPaymentMethodType?.(card.cardType);
    }

    dispatch(setPaymentMethodIsEditable(false));
  };

  useEffect(() => {
    const filtered = companyCodeDetail?.isEcheckEnabled
      ? methods
      : methods.filter((card) => card.cardType !== PaymentTypes.EC);

    setPaymentMethodsList(filtered);
  }, [methods, companyCodeDetail?.isEcheckEnabled]);

  const selectedDropdownMethod = findMatchingPaymentMethod(
    paymentCard,
    paymentMethodsList,
  );
  const renderedPaymentMethodsList = paymentMethodsList.filter(
    (option, index, list) =>
      list.findIndex(
        (candidate) =>
          getPaymentMethodDisplaySignature(candidate) ===
          getPaymentMethodDisplaySignature(option),
      ) === index,
  );
  const selectedDropdownValue =
    selectedDropdownMethod?.token || defaultPaymentMethod.token;
  const selectedDropdownLabel =
    selectedDropdownMethod?.dropDownDisplayName ||
    defaultPaymentMethod.dropDownDisplayName;
  const paymentMethodOptionsCount = 1 + renderedPaymentMethodsList.length;
  const { fieldRef: paymentMethodFieldRef, resolvedSelectProps } =
    useAutoFlipSelect({
      optionCount: paymentMethodOptionsCount,
      selectProps: {
        IconComponent: KeyboardArrowDownIcon,
        renderValue: () => selectedDropdownLabel,
        MenuProps: {
          MenuListProps: compactFilterSelectProps.MenuProps.MenuListProps,
        },
        sx: {
          '.MuiSelect-select': {
            display: 'inline-flex',
            alignItems: 'center',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            maxWidth: '100%',
          },
          '.MuiTypography-root': {
            display: 'inline-block',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            maxWidth: '100%',
          },
        },
      },
    });

  useEffect(() => {
    if (payTotal != 0) {
      setAmountToPay(payTotal);
    } else setAmountToPay(paymentTotal + creditAmount);
    if (isDeposit) setPaymentTotal(payTotal);
  }, [paymentTotal, payTotal]);

  const {
    continueClick,
    handlePayment,
    handleAddressValidation,
    handleClearAddressValidation,
    handleEditAddressValidation,
  } = usePaymentExecution({
    payer,
    currencyKey,
    isDeposit,
    depositDetails,
    validateInvoiceData,
    data,
    paymentCard,
    cvv,
    paymentTotal,
    payTotal,
    overPaymentTotal,
    onSetStartPay: setStartPay,
    onSetIsProcessing: setIsProcessing,
    onSetCvvError: (isError, message) => {
      setIsCvvError(isError);
      setCvvError(message);
    },
  });

  const handleCvvChange = (e) => {
    setCVV(e.target.value);
    setCvvError('');
    if (!e) {
      showToastMessage('error', f('payment.error.cvv_empty'));
    }
  };

  const handleCvvErrorCheck = () => {
    if (paymentCard?.cardType === PaymentTypes.EC) {
      setIsCvvError(false);
      setCvvError('');
      return;
    }
    const cardType = paymentCard?.cardType || 'DEFAULT';
    const { pattern, length } = CVV_RULES[cardType] || CVV_RULES.DEFAULT;

    if (!pattern.test(cvv) || cvv.length !== length) {
      setIsCvvError(true);
      setCvvError(f('payment.invalidcvv'));
    } else {
      setIsCvvError(false);
      setCvvError('');
    }
  };

  const handlePaymentMethodAdded = (card: PaymentCard) => {
    const newMethod: PaymentMethod = enrichPaymentMethodTypeFields({
      name: card.paymentCardName,
      dropDownDisplayName: `${card.paymentCardType} **** ${card.cardLast4Digit} - ${card.paymentCardName}`,
      key: card.paymentCardToken,
      cardType: card.paymentCardType,
      sapCardType: card.sapCardType,
      gatewayCardType: card.gatewayCardType,
      default: true,
      token: card.paymentCardToken,
      validTo: card.validTo,
      isSession: true,
      cardLast4Digit: card.cardLast4Digit,
    });
    setPaymentCard(newMethod);
    setPaymentMethodType?.(newMethod.cardType || '');
    setPaymentMethodsList((prev) => [
      newMethod,
      ...prev.filter((p) => p.token !== newMethod.token),
    ]);
    rememberCurrentPaymentMethodSelection(newMethod, payer, accountIdentity);
    setShowManagePayments(false);
  };

  const toggleShowManagePayments = (e: MouseEvent) => {
    e.preventDefault();
    setShowManagePayments(!showManagePayments);
  };

  if (!user) {
    return null;
  }

  return (
    <Box
      id="sidebar"
      width="100%"
      sx={{
        minHeight: '100%',
        pointerEvents: config?.isPaymentDisabled ? 'none' : 'auto',
      }}
      justifyContent="space-between"
    >
      <Grid id="payment-box">
        <EpayAccordion
          expandIcon={<></>}
          title={f('payment.method')}
          sectionType="Payment"
          sectionIsComplete={paymentMethodIsComplete}
          isExpanded={paymentMethodIsExpanded}
          isEditable={
            paymentMethodIsEditable &&
            (isStripeCard ||
              addressValidationIsEditable ||
              addressValidationOptions?.toLowerCase() ===
                ADDRESS_VALIDATION_OFF ||
              !paymentMethodIsCreditCard)
          }
          editIsSelected={handleEditAddressValidation}
        >
          <Box id="payment-content">
            <Box mb="0.5rem">
              <Typography variant="fieldHeader"></Typography>
            </Box>

            <Box mb="1.3rem">
              <TextField
                ref={paymentMethodFieldRef}
                select
                fullWidth
                value={selectedDropdownValue}
                onChange={handlePaymentCardChange}
                sx={getCompactFilterFieldSx}
                SelectProps={resolvedSelectProps}
              >
                <MenuItem
                  key={defaultPaymentMethod.token}
                  value={defaultPaymentMethod.token}
                  sx={compactFilterMenuItemSx}
                >
                  <Typography
                    variant="body2"
                    sx={{
                      lineHeight: '1.5rem',
                      verticalAlign: 'middle',
                    }}
                  >
                    {defaultPaymentMethod.dropDownDisplayName}
                  </Typography>
                </MenuItem>
                {renderedPaymentMethodsList.length != 0 &&
                  renderedPaymentMethodsList.map((option) => (
                    <MenuItem
                      key={option.token}
                      value={option.token}
                      sx={compactFilterMenuItemSx}
                    >
                      <Typography
                        variant="body2"
                        sx={{
                          lineHeight: '1.5rem',
                          verticalAlign: 'middle',
                        }}
                      >
                        {option.dropDownDisplayName}
                      </Typography>
                    </MenuItem>
                  ))}
              </TextField>
            </Box>
            {paymentCard?.cardType && (
              <Box
                mb="1rem"
                sx={{
                  color: theme.palette.error.main,
                  minHeight: paymentNote?.trim() == '' ? '1px' : 'auto',
                }}
              >
                <Typography
                  variant="fieldHeader"
                  display={paymentCard?.cardType === '' ? 'none' : 'block'}
                >
                  {paymentNote}
                </Typography>
              </Box>
            )}
            {isCVVAllowed && (
              <Box
                mb="1.3rem"
                display={
                  paymentCard?.cardType === PaymentTypes.EC ||
                  paymentCard?.cardType === ''
                    ? 'none'
                    : 'block'
                }
              >
                <Box mb="0.5rem">
                  <Typography variant="fieldHeader">
                    {f('payment_methods.cvv')}
                  </Typography>
                </Box>

                <Box>
                  <TextField
                    fullWidth
                    required
                    value={cvv}
                    error={isCvvError}
                    helperText={cvvError}
                    sx={getCompactFilterFieldSx}
                    placeholder={
                      paymentCard?.cardType?.toLowerCase() === 'amex'
                        ? 'XXXX'
                        : 'XXX'
                    }
                    onChange={handleCvvChange}
                    onBlur={handleCvvErrorCheck}
                  />
                </Box>
              </Box>
            )}
            {canManagePaymentMethods && (
              <Grid>
                <Grid
                  id="manage-payments-link"
                  container
                  alignItems="center"
                  spacing={0.75}
                  onClick={toggleShowManagePayments}
                  mb="1.3rem"
                  sx={{
                    cursor: 'pointer',
                    color: theme.palette.interactiveColor,
                  }}
                >
                  <Grid item>
                    <EditNoteTwoTone />
                  </Grid>
                  <Grid item>
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                      {f('payment.method.manage')}
                    </Typography>
                  </Grid>
                </Grid>

                {showManagePayments && (
                  <Box>
                    <ManagePaymentMethods
                      cards={cards}
                      allowEchecks={companyCodeDetail?.isEcheckEnabled}
                      isAutoPayFlagEnabled={isAutoPayEnabled}
                      isAutoPayEnrolled={payerDetails?.isAutoPayEnrolled}
                      onSuccess={handlePaymentMethodAdded}
                    ></ManagePaymentMethods>
                  </Box>
                )}
              </Grid>
            )}
            {!startPay && (
              <Grid item container justifyContent="flex-end">
                <Grid item justifyContent="flex-end">
                  <Button
                    variant="contained"
                    sx={{
                      border: `1px solid ${theme.palette.buttonBorder.buttonBorderColor}`,
                      '&:hover': {
                        border: `1px solid ${theme.palette.buttonBorder.buttonBorderHoverColor}`,
                      },
                    }}
                    onClick={continueClick}
                  >
                    {f('user.register.continue')}
                  </Button>
                </Grid>
              </Grid>
            )}
          </Box>
        </EpayAccordion>
      </Grid>
      {enablePreAuth &&
        !isStripeCard &&
        addressValidationOptions?.toLowerCase() === ADDRESS_VALIDATION_ZIP &&
        paymentMethodIsCreditCard && (
          <AddressZipValidation
            handleAddressValidation={handleAddressValidation}
            editAddressValidation={handleEditAddressValidation}
            clearAddressValidation={handleClearAddressValidation}
          />
        )}

      {enablePreAuth &&
        !isStripeCard &&
        addressValidationOptions?.toLowerCase() !== ADDRESS_VALIDATION_OFF &&
        addressValidationOptions?.toLowerCase() !== ADDRESS_VALIDATION_ZIP &&
        paymentMethodIsCreditCard && (
          <AddressValidation
            handleAddressValidation={handleAddressValidation}
            editAddressValidation={handleEditAddressValidation}
            clearAddressValidation={handleClearAddressValidation}
          />
        )}
      <PaymentTotalsSummary
        isDeposit={!!isDeposit}
        payTotal={payTotal}
        paymentTotal={paymentTotal}
        overPaymentTotal={overPaymentTotal}
        creditAmount={creditAmount}
        currencyKey={currencyKey}
        amountToPay={amountToPay}
        canMakePayment={canMakePayment}
        isProcessing={isProcessing}
        startPay={startPay}
        paymentConfigLoaded={paymentConfigLoaded}
        onPay={handlePayment}
      />
    </Box>
  );
}
