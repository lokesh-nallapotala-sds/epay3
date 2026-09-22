import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  ChangeEvent,
  MouseEvent,
} from 'react';

import { useIntl } from 'react-intl';

import Ability from 'types/Ability';
import { useTheme } from '@mui/system';
import { PaymentMethod } from 'types/Payment';
import { EditNoteTwoTone } from '@mui/icons-material';
import { toCurrencySymbol } from 'utilities/utilities';
import { useEpayToast } from 'providers/EpayToastProvider';
import { useAppDispatch, useAppSelector } from 'redux/hooks';
import {
  compactFilterMenuItemSx,
  compactFilterSelectProps,
} from 'shared/components/compactFilterSelectStyles';
import { getCompactFilterFieldSx } from 'shared/components/compactFilterFieldStyles';
import {
  selectCompanyCodes,
  selectIsCVVAllowedFromCustomConfig,
} from 'redux/selectors/configSelectors';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import {
  useAllPaymentCardsForPayer,
  useEffectiveAccount,
  usePaymentMethods,
} from 'hooks/usePaymentHelpers';
import {
  Box,
  Button,
  Grid,
  MenuItem,
  TextField,
  Typography,
} from '@mui/material';
import {
  setPaymentMethodIsCreditCard,
  setPaymentMethodIsEditable,
  userHasAbility,
  selectUserState as userSelector,
} from 'redux/reducers';
import { PaymentTypes } from '../../constants/UiOptions';

import { ManagePaymentMethods } from './ManagePaymentMethods';
import { useFormat } from 'hooks/useFormat';

interface PaymentMethodSelectorProps {
  selectedMethod: PaymentMethod | null;
  onMethodSelect: (method: PaymentMethod) => void;
  onMethodComplete: (method: PaymentMethod, cvv: string) => void;
  externalCvvError?: string;
  onClearExternalCvvError?: () => void;
  cvvValue?: string;
  onCvvChange?: (cvv: string) => void;
  validateInvoiceData?: () => boolean;
  config?: {
    maximumAllowedCCAmount?: number;
    maximumAllowedECAmount?: number;
  };
  currencyKey?: string;
  disableSessionMethods?: boolean;
}

export default function PaymentMethodSelector({
  selectedMethod,
  onMethodSelect,
  onMethodComplete,
  externalCvvError,
  onClearExternalCvvError,
  cvvValue,
  onCvvChange,
  validateInvoiceData,
  config,
  currencyKey = 'USD',
  disableSessionMethods = false,
}: PaymentMethodSelectorProps) {
  const intl = useIntl();
  const f = useFormat();
  const { showToastMessage } = useEpayToast();
  const theme = useTheme();
  const dispatch = useAppDispatch();

  const selectedAccount = useEffectiveAccount();
  const cards = useAllPaymentCardsForPayer();
  const isCVVAllowed = useAppSelector(selectIsCVVAllowedFromCustomConfig);
  const user = useAppSelector(userSelector);
  const { methods } = usePaymentMethods();
  const companyCodes = useAppSelector(selectCompanyCodes);

  const companyCodeDetail = useMemo(() => {
    return companyCodes?.find(
      (code) => code.companyCode === selectedAccount?.companyCode,
    );
  }, [companyCodes, selectedAccount?.companyCode]);

  const [showManagePayments, setShowManagePayments] = useState(false);
  const [cvv, setCVV] = useState('');
  const [isCvvError, setIsCvvError] = useState(false);
  const [cvvError, setCvvError] = useState('');
  const [paymentNote, setPaymentNote] = useState('');

  const canManagePaymentMethods = userHasAbility(
    user,
    Ability.ManagePaymentMethods,
  );

  const defaultPaymentMethod = useMemo<PaymentMethod>(
    () => ({
      name: ' ',
      dropDownDisplayName: intl.formatMessage({
        id: 'payment.pay_with',
        defaultMessage: 'payment.pay_with',
      }),
      key: 'dummy',
      cardType: '',
      token: '-----',
      default: false,
    }),
    [intl],
  );

  const isSamePaymentMethod = (
    option: PaymentMethod,
    method: PaymentMethod,
  ) => {
    const optionIds = [option.token, option.key].filter(Boolean);
    const methodIds = [method.token, method.key].filter(Boolean);

    return optionIds.some((id) => methodIds.includes(id));
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
    method: PaymentMethod | null,
    list: PaymentMethod[],
  ) => {
    if (!method) {
      return null;
    }

    return (
      list.find((pm) => isSamePaymentMethod(pm, method)) ||
      list.find(
        (pm) =>
          getPaymentMethodDisplaySignature(pm) ===
          getPaymentMethodDisplaySignature(method),
      ) ||
      null
    );
  };

  const paymentMethodsList = useMemo(() => {
    if (!methods?.length) {
      return [];
    }

    const filtered = companyCodeDetail?.isEcheckEnabled
      ? methods
      : methods.filter((card) => card.cardType !== PaymentTypes.EC);

    return filtered.filter((card) => Boolean(card.token));
  }, [methods, companyCodeDetail?.isEcheckEnabled]);

  const isMethodDisabled = useCallback(
    (method: PaymentMethod | null | undefined) =>
      Boolean(disableSessionMethods && method?.isSession),
    [disableSessionMethods],
  );

  const enabledPaymentMethodsList = useMemo(
    () => paymentMethodsList.filter((method) => !isMethodDisabled(method)),
    [paymentMethodsList, isMethodDisabled],
  );

  const arePaymentMethodDetailsEqual = (
    matchingSelectedMethod: PaymentMethod | null,
    selectedMethod: PaymentMethod | null,
  ) => {
    if (!matchingSelectedMethod || !selectedMethod) {
      return matchingSelectedMethod === selectedMethod;
    }

    return (
      matchingSelectedMethod.token === selectedMethod.token &&
      matchingSelectedMethod.key === selectedMethod.key &&
      matchingSelectedMethod.name === selectedMethod.name &&
      matchingSelectedMethod.cardType === selectedMethod.cardType &&
      matchingSelectedMethod.validTo === selectedMethod.validTo &&
      matchingSelectedMethod.validFrom === selectedMethod.validFrom &&
      matchingSelectedMethod.default === selectedMethod.default
    );
  };

  useEffect(() => {
    const matchingSelectedMethod = findMatchingPaymentMethod(
      selectedMethod,
      paymentMethodsList,
    );

    if (matchingSelectedMethod && !isMethodDisabled(matchingSelectedMethod)) {
      if (
        !arePaymentMethodDetailsEqual(matchingSelectedMethod, selectedMethod)
      ) {
        onMethodSelect(matchingSelectedMethod);
      }
      return;
    }

    if (
      selectedMethod &&
      selectedMethod.token !== defaultPaymentMethod.token &&
      !isMethodDisabled(selectedMethod)
    ) {
      return;
    }

    const initialMethod =
      enabledPaymentMethodsList.find((pm) => pm.default === true) ||
      defaultPaymentMethod;

    if (!arePaymentMethodDetailsEqual(selectedMethod, initialMethod)) {
      onMethodSelect(initialMethod);
    }

    dispatch(
      setPaymentMethodIsCreditCard(initialMethod.cardType !== PaymentTypes.EC),
    );
  }, [
    defaultPaymentMethod,
    dispatch,
    enabledPaymentMethodsList,
    isMethodDisabled,
    onMethodSelect,
    paymentMethodsList,
    selectedMethod,
  ]);

  useEffect(() => {
    if (selectedMethod && selectedMethod.cardType && config) {
      const ccMaxAllowedAmount = config.maximumAllowedCCAmount || 0;
      const ecMaxAllowedAmount = config.maximumAllowedECAmount || 0;

      const formattedCCAmount = `${toCurrencySymbol(currencyKey)}${ccMaxAllowedAmount}`;
      const formattedECAmount = `${toCurrencySymbol(currencyKey)}${ecMaxAllowedAmount}`;

      if (selectedMethod.cardType === 'EC') {
        if (config?.maximumAllowedECAmount == 0) {
          setPaymentNote(' ');
        } else {
          setPaymentNote(
            f('payment.eclimt').replace('{amount}', formattedECAmount),
          );
        }
      } else {
        if (config?.maximumAllowedCCAmount == 0) {
          setPaymentNote(' ');
        } else {
          setPaymentNote(
            f('payment.cclimt').replace('{amount}', formattedCCAmount),
          );
        }
      }
    } else {
      setPaymentNote('');
    }
  }, [selectedMethod, config, currencyKey]);

  useEffect(() => {
    if (!externalCvvError) {
      return;
    }

    setIsCvvError(true);
    setCvvError(externalCvvError);
  }, [externalCvvError]);

  useEffect(() => {
    if (cvvValue !== undefined && cvvValue !== cvv) {
      setCVV(cvvValue);
    }
  }, [cvvValue, cvv]);

  const handlePaymentMethodChange = (e: ChangeEvent<HTMLInputElement>) => {
    const methodToken = e.target.value;
    if (methodToken === defaultPaymentMethod.token) {
      onMethodSelect(defaultPaymentMethod);
      setCVV('');
      onCvvChange?.('');
      setIsCvvError(false);
      setCvvError('');
      onClearExternalCvvError?.();
      setPaymentNote('');
      dispatch(setPaymentMethodIsCreditCard(false));
      return;
    }

    const selectedCard = paymentMethodsList.find(
      (card) => card.token === e.target.value,
    );

    if (selectedCard && !isMethodDisabled(selectedCard)) {
      onMethodSelect(selectedCard);
      setCVV('');
      onCvvChange?.('');
      setIsCvvError(false);
      setCvvError('');
      onClearExternalCvvError?.();
      setPaymentNote('');
      dispatch(
        setPaymentMethodIsCreditCard(selectedCard.cardType !== PaymentTypes.EC),
      );
    }

    dispatch(setPaymentMethodIsEditable(false));
  };

  const toggleShowManagePayments = (e: MouseEvent) => {
    e.preventDefault();
    setShowManagePayments(!showManagePayments);
  };

  const handleCvvChange = (e: ChangeEvent<HTMLInputElement>) => {
    const nextCvv = e.target.value;
    setCVV(nextCvv);
    onCvvChange?.(nextCvv);
    setIsCvvError(false);
    setCvvError('');
    onClearExternalCvvError?.();
    if (!nextCvv) {
      showToastMessage('error', f('payment.error.cvv_empty'));
    }
  };

  const handleCvvErrorCheck = () => {
    if (selectedMethod?.cardType === 'EC') {
      setIsCvvError(false);
      setCvvError('');
      return;
    }

    let pattern = /\d{3}/;
    let length = 3;

    if (selectedMethod?.cardType === 'AMEX') {
      pattern = /\d{4}/;
      length = 4;
    }

    if (!pattern.test(cvv) || cvv.length !== length) {
      setIsCvvError(true);
      setCvvError(f('payment.invalidcvv'));
    } else {
      setIsCvvError(false);
      setCvvError('');
    }
  };

  const handleContinue = () => {
    if (validateInvoiceData) {
      const isValid = validateInvoiceData();
      if (!isValid) {
        return;
      }
    }
    if (!selectedMethod || (selectedMethod && !selectedMethod.token)) {
      showToastMessage('error', f('payment.pay_with'));
      return;
    }
    if (isCVVAllowed) {
      if (selectedMethod?.cardType !== 'EC' && !cvv) {
        showToastMessage('error', f('payment.error.cvv_empty'));
        return;
      }
    }

    if (isCVVAllowed) {
      if (selectedMethod?.cardType !== 'EC' && isCvvError) {
        showToastMessage('error', f('payment.invalidcvv'));
        return;
      }
    }

    onMethodComplete(selectedMethod!, cvv);
  };

  const selectedDropdownMethod = selectedMethod
    ? findMatchingPaymentMethod(selectedMethod, paymentMethodsList)
    : null;
  const shouldRenderSelectedMethodOption =
    selectedMethod &&
    selectedMethod.token &&
    selectedMethod.token !== defaultPaymentMethod.token &&
    !selectedDropdownMethod;
  const renderedPaymentMethodsList = (
    shouldRenderSelectedMethodOption
      ? [selectedMethod, ...paymentMethodsList]
      : paymentMethodsList
  ).filter(
    (option, index, list) =>
      list.findIndex(
        (candidate) =>
          getPaymentMethodDisplaySignature(candidate) ===
          getPaymentMethodDisplaySignature(option),
      ) === index,
  );
  const selectedDropdownValue =
    selectedDropdownMethod?.token ||
    (shouldRenderSelectedMethodOption ? selectedMethod.token : '') ||
    defaultPaymentMethod.token;
  const selectedDropdownLabel =
    selectedDropdownMethod?.dropDownDisplayName ||
    selectedMethod?.dropDownDisplayName ||
    defaultPaymentMethod.dropDownDisplayName;

  if (!user) {
    return null;
  }

  return (
    <Box id="payment-content">
      <Box mb="0.5rem">
        <Typography variant="fieldHeader">{f('payment.method')}</Typography>
      </Box>

      <Box mb="1.3rem">
        <TextField
          select
          fullWidth
          value={selectedDropdownValue}
          onChange={handlePaymentMethodChange}
          sx={getCompactFilterFieldSx}
          SelectProps={{
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
          }}
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
          {renderedPaymentMethodsList.length !== 0 &&
            renderedPaymentMethodsList.map((option) => (
              <MenuItem
                key={option.token}
                value={option.token}
                disabled={isMethodDisabled(option)}
                sx={compactFilterMenuItemSx}
              >
                <Typography
                  variant="body2"
                  sx={{
                    lineHeight: '1.5rem',
                    verticalAlign: 'middle',
                  }}
                >
                  {option.dropDownDisplayName || option.name}
                </Typography>
              </MenuItem>
            ))}
        </TextField>
      </Box>

      {selectedMethod && selectedMethod.cardType && paymentNote && (
        <Box
          mb="1rem"
          sx={{
            color: 'error.main',
            minHeight: paymentNote?.trim() == '' ? '1px' : 'auto',
          }}
        >
          <Typography variant="fieldHeader">{paymentNote}</Typography>
        </Box>
      )}

      {isCVVAllowed &&
        selectedMethod &&
        selectedMethod.cardType &&
        selectedMethod.cardType !== 'EC' && (
          <Box mb="1.3rem">
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
                  selectedMethod.cardType?.toLowerCase() === 'amex'
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
                hideDefault={true}
              />
            </Box>
          )}
        </Grid>
      )}

      {selectedMethod && selectedMethod.token !== '-----' && (
        <Grid item container justifyContent="flex-end">
          <Grid item justifyContent="flex-end">
            <Button
              variant="contained"
              onClick={handleContinue}
              sx={{
                ...(!(
                  selectedMethod.cardType !== 'EC' &&
                  (!cvv || isCvvError)
                ) && {
                  border: `1px solid ${theme.palette.buttonBorder.buttonBorderColor}`,
                  '&:hover': {
                    border: `1px solid ${theme.palette.buttonBorder.buttonBorderHoverColor}`,
                  },
                }),
              }}
              disabled={
                selectedMethod.cardType !== 'EC' &&
                isCVVAllowed &&
                (!cvv || isCvvError)
              }
            >
              {f('user.register.continue')}
            </Button>
          </Grid>
        </Grid>
      )}
    </Box>
  );
}
