import { useState } from 'react';

import { useIntl } from 'react-intl';
import { useLocation } from 'react-router';

import AccountType from 'types/AccountType';
import { InvoiceStatus } from 'types/InvoiceStatus';
import { EpayDocumentType } from 'types/EpayDocumentType';
import {
  AutoPayStatus,
  PayerDetails,
  PaymentCard,
  PaymentCardSubmission,
} from 'types/Payment';
import { CreditCard } from 'types/CreditCard';
import { Invoice, InvoicesSearchRequest } from 'types/InvoicesSearchRequest';
import { useAppDispatch, useAppSelector } from 'redux/hooks';
import {
  useDeletePaymentCardMutation,
  useUpdatePaymentCardMutation,
  useEnableAutoPayMutation,
} from 'redux/api/ePayApi';
import { useEpayLoading } from 'providers/EpayLoadingProvider';
import { useEpayToast } from 'providers/EpayToastProvider';
import { usePayerDetails } from 'providers/PayerDetailsProvider';
import { EpayInvoicesService } from 'services/EpayInvoicesService';
import { EpayPaymentService } from 'services/EpayPaymentService';
import { useFormat } from 'hooks/useFormat';
import {
  clearCurrentPaymentMethodSelection,
  extractLastCardNumbers,
  getAccountIdentity,
  getCurrentPaymentMethodSelection,
  getSelectedSubAccounts,
} from 'utilities/utilities';
import {
  deleteSessionCard,
  impersonatedUserSelector,
  selectedAccountSelector,
  selectUserState as userSelector,
} from 'redux/reducers';

const isAutoPayStatusMatch = (
  status: AutoPayStatus,
  card: PaymentCard,
): boolean => {
  const statusLast4 = status?.cardLast4Digit ?? '';
  const cardLast4 =
    card.cardLast4Digit ||
    extractLastCardNumbers(card.paymentCardType, card.paymentCardToken);

  if (!statusLast4 || !cardLast4 || statusLast4 !== cardLast4) {
    return false;
  }

  const statusMethod = status.paymentMethod?.toUpperCase();
  const isCardEcheck = card.paymentCardType === 'EC';

  return statusMethod === 'EC' ? isCardEcheck : !isCardEcheck;
};

const EMPTY_CREDIT_CARD: CreditCard = {
  cardNumber: '',
  cardName: '',
  cardType: '',
  cardValidationCode: '',
  cardYear: '',
  cardMonth: '',
  makeDefault: false,
  saveOnFile: true,
};

export function useCardDetails(card: PaymentCard, isAutoPayEnrolled: boolean) {
  const [selectedCard, setSelectedCard] = useState<CreditCard>({
    ...EMPTY_CREDIT_CARD,
  });
  const [isEditing, setIsEditing] = useState(false);
  const [open, setOpen] = useState(false);
  const [paymentType, setPaymentType] = useState('card');
  const [modalOpen, setModalOpen] = useState(false);
  const [openScheduleWarning, setOpenScheduleWarning] = useState(false);
  const [actionsAnchor, setActionsAnchor] = useState<null | HTMLElement>(null);
  const [deleteErrorModalOpen, setDeleteErrorModalOpen] = useState(false);
  const [scheduledInvoices, setScheduledInvoices] = useState<Invoice[]>([]);

  const [deletePaymentCard] = useDeletePaymentCardMutation();
  const [updateCard] = useUpdatePaymentCardMutation();
  const [enableAutoPay] = useEnableAutoPayMutation();
  const getInvoices = EpayInvoicesService.useGetInvoices();
  const deleteScheduledPayment = EpayPaymentService.useDeleteScheduledPayment();
  const loadingCtx = useEpayLoading();
  const { showToastMessage } = useEpayToast();
  const { refreshPayerDetails, effectivePayer, payerDetails } =
    usePayerDetails();
  const dispatch = useAppDispatch();
  const selectedAccount = useAppSelector(selectedAccountSelector);
  const impersonatedUser = useAppSelector(impersonatedUserSelector);
  const user = useAppSelector(userSelector);
  const impersonatedUserId = impersonatedUser?.userId;

  const location = useLocation();
  const shouldHideAutoPayCheckbox =
    location.pathname.includes('payment/session') ||
    location.pathname.includes('payment/deposits') ||
    location.pathname.includes('payment/scheduled');

  const intl = useIntl();
  const f = useFormat();
  const effectiveUserAccountType =
    impersonatedUser && Object.keys(impersonatedUser).length > 0
      ? (impersonatedUser.primaryAccountType ?? '')
      : (user?.primaryAccountType ?? '');

  const getScheduledInvoicesRequest = (): InvoicesSearchRequest | null => {
    if (!selectedAccount?.primaryAcct) {
      return null;
    }

    return {
      documentType: EpayDocumentType.Invoice,
      status: InvoiceStatus.Scheduled,
      userId: impersonatedUserId,
      selectedAccount: selectedAccount.primaryAcct,
      companyCode: selectedAccount.companyCode,
      subAccounts:
        getSelectedSubAccounts(
          selectedAccount.relatedAccounts ?? [],
          effectiveUserAccountType || AccountType.Payer,
        ) ?? [],
      currencyKey: 'All',
    };
  };

  const getScheduledInvoicesForSelectedAccount = async (): Promise<
    Invoice[]
  > => {
    const request = getScheduledInvoicesRequest();
    if (!request) {
      return [];
    }

    try {
      const resp = await getInvoices(request);
      return resp.filter((invoice) => !!invoice.scheduledId);
    } catch {
      return [];
    }
  };

  const handleClose = () => setOpen(false);
  const closeActionsMenu = () => setActionsAnchor(null);
  const handleDeleteClose = () => setModalOpen(false);
  const handleScheduleWarningClose = () => setOpenScheduleWarning(false);

  const deleteScheduledPaymentsIfAny = async (
    invoices: Invoice[],
  ): Promise<boolean> => {
    try {
      const deletions = invoices
        .filter((invoice) => invoice.scheduledId)
        .map((invoice) =>
          deleteScheduledPayment(
            invoice.scheduledId!,
            selectedAccount?.companyCode ?? '',
            selectedAccount?.primaryAcct ?? '',
            effectivePayer,
            impersonatedUserId,
          ),
        );

      await Promise.all(deletions);
      return true;
    } catch {
      showToastMessage('error', f('schedule.error.delete'));
      return false;
    }
  };

  const deleteAndProceed = async () => {
    setOpenScheduleWarning(false);
    const deleted = await deleteScheduledPaymentsIfAny(scheduledInvoices);
    if (!deleted) return;
    await handleOk();
  };

  const deleteCreditCard = async (): Promise<void> => {
    closeActionsMenu();
    const isEnrolledInAutoPay = payerDetails?.payerAutoPayStatus?.some(
      (status) => isAutoPayStatusMatch(status, card) && status.enrolled,
    );
    const cardLast4 =
      card.cardLast4Digit ||
      extractLastCardNumbers(card.paymentCardType, card.paymentCardToken);

    if (isEnrolledInAutoPay) {
      setDeleteErrorModalOpen(true);
      return;
    }

    const accountScheduledInvoices =
      await getScheduledInvoicesForSelectedAccount();
    const matchedScheduledInvoices = accountScheduledInvoices.filter(
      (invoice) =>
        invoice.scheduledIdDetails?.paymentDetail?.cardLast4Digit === cardLast4,
    );

    if (matchedScheduledInvoices.length > 0) {
      setScheduledInvoices(matchedScheduledInvoices);
      setOpenScheduleWarning(true);
    } else {
      setScheduledInvoices([]);
      setModalOpen(true);
    }
  };

  const editCreditCard = (): void => {
    closeActionsMenu();
    setOpen(true);
    setPaymentType(card.paymentCardType === 'EC' ? 'check' : 'card');
    setIsEditing(true);
    setSelectedCard({
      ...EMPTY_CREDIT_CARD,
      cardNumber: card.cardLast4Digit || '',
      token: card.paymentCardToken,
      cardName: card.paymentCardName,
      cardType: card.gatewayCardType!,
      paymentCardType: card.paymentCardType,
      sapCardType: card.sapCardType,
      gatewayCardType: card.gatewayCardType,
      cardMonth: card.validTo?.split('-')[0] || '',
      cardYear: card.validTo?.split('-')[2] || '',
      makeDefault: card.default === 'X',
      saveOnFile: !card.isSession,
      electronicCheckAccountType: card.electronicCheckAccountType,
      electronicCheckRdfiNumber: card.electronicCheckRdfiNumber,
      cardLast4Digit: card.cardLast4Digit,
    });
  };

  const handleOk = async (): Promise<void> => {
    if (!selectedAccount) return;

    const currentSelection = getCurrentPaymentMethodSelection(
      effectivePayer,
      getAccountIdentity(selectedAccount),
    );
    const isDeletingSelectedMethod =
      !!card.paymentCardToken &&
      !!currentSelection &&
      [currentSelection.token, currentSelection.key]
        .filter(Boolean)
        .includes(card.paymentCardToken);

    if (isDeletingSelectedMethod) {
      clearCurrentPaymentMethodSelection();
    }

    const postCard: PaymentCardSubmission = {
      paymentCardType: card.sapCardType || card.paymentCardType || '',
      paymentCardName: card.paymentCardName,
      validFrom: '',
      electronicCheckAccountType: card.electronicCheckAccountType || '',
      electronicCheckRdfiNumber: card.electronicCheckRdfiNumber || '',
      paymentCardToken: card.paymentCardToken || '',
      validTo: card.validTo,
      isCardAutoPayEnabled: card.isCardAutoPayEnabled,
    };

    if (!card.isSession) {
      const payer: PayerDetails = {
        customerNumber: effectivePayer,
        companyCode: selectedAccount.companyCode,
        paymentCards: [],
      };
      loadingCtx.increment();
      try {
        await deletePaymentCard({
          payerData: payer,
          paymentCard: postCard,
        }).unwrap();
        setModalOpen(false);
        await refreshPayerDetails(true);
      } finally {
        loadingCtx.decrement();
      }
    } else {
      postCard.isSession = true;
      dispatch(
        deleteSessionCard({ paymentCard: postCard, payer: effectivePayer }),
      );
      setModalOpen(false);
    }
  };

  const onAutoPayChange = async (): Promise<void> => {
    if (!selectedAccount) return;
    const isAlreadyEnrolled = payerDetails?.payerAutoPayStatus?.some(
      (status) => isAutoPayStatusMatch(status, card) && status.enrolled,
    );
    if (isAlreadyEnrolled) return;
    loadingCtx.increment();
    try {
      await enableAutoPay({
        selectedAccount: selectedAccount.primaryAcct,
        payer: effectivePayer,
        companyCode: selectedAccount.companyCode,
        cardToken: card.paymentCardToken ?? '',
        isAutoPayEnrolled,
        userId: impersonatedUserId,
      }).unwrap();
      await refreshPayerDetails(true);
    } finally {
      loadingCtx.decrement();
    }
  };

  const onDefaultChange = async (): Promise<void> => {
    if (!selectedAccount) return;
    const isCurrentlyDefault = card.default === 'X' || card.isDefault;
    const newDefaultValue = isCurrentlyDefault ? '' : 'X';
    const updatedCard: PaymentCard = {
      ...card,
      paymentCardType: card.sapCardType || card.paymentCardType || '',
      default: newDefaultValue,
      isDefault: !isCurrentlyDefault,
    };
    const payer: PayerDetails = {
      customerNumber: effectivePayer,
      companyCode: selectedAccount.companyCode,
      paymentCards: [],
    };
    loadingCtx.increment();
    try {
      await updateCard({
        payerData: payer,
        paymentCard: updatedCard,
        userId: impersonatedUserId,
      }).unwrap();
      await refreshPayerDetails(true);
    } finally {
      loadingCtx.decrement();
    }
  };

  const isExpired = Boolean(
    card.validTo && new Date(card.validTo) < new Date(),
  );
  const isDefault = card.isDefault || card.default === 'X';
  const isAutoPaySelected =
    payerDetails?.payerAutoPayStatus?.some(
      (status) => isAutoPayStatusMatch(status, card) && status.enrolled,
    ) || false;

  const formatExpiry = (validTo?: string): string => {
    if (!validTo) return '';
    const dateParts = validTo.split(/[-/]/);
    if (dateParts.length >= 3) {
      const month = dateParts[0].padStart(2, '0');
      const year = dateParts[2].slice(-2);
      return `${month}/${year}`;
    }
    const parsedDate = new Date(validTo);
    if (!Number.isNaN(parsedDate.getTime())) {
      return `${String(parsedDate.getMonth() + 1).padStart(2, '0')}/${String(
        parsedDate.getFullYear(),
      ).slice(-2)}`;
    }
    return validTo;
  };

  const formatECheckAccountType = (accountType?: string): string => {
    switch (accountType?.toUpperCase()) {
      case 'N':
        return 'Saving';
      case 'C':
        return 'Checking';
      default:
        return accountType || '';
    }
  };

  return {
    selectedCard,
    isEditing,
    open,
    paymentType,
    modalOpen,
    openScheduleWarning,
    scheduledInvoices,
    deleteAndProceed,
    actionsAnchor,
    deleteErrorModalOpen,
    setActionsAnchor,
    setDeleteErrorModalOpen,
    handleClose,
    closeActionsMenu,
    handleDeleteClose,
    handleScheduleWarningClose,
    deleteCreditCard,
    editCreditCard,
    handleOk,
    onAutoPayChange,
    onDefaultChange,
    isExpired,
    isDefault,
    isAutoPaySelected,
    shouldHideAutoPayCheckbox,
    formatExpiry,
    formatECheckAccountType,
    f,
    intl,
  };
}
