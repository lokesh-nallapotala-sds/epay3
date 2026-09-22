import { useCallback } from 'react';
import { useAppSelector } from 'redux/hooks';
import {
  selectCompanyCodes,
  selectPaymentProviders,
} from 'redux/selectors/configSelectors';
import { EpayPaymentService } from 'services/EpayPaymentService';
import { ThreeDSAuthenticationResultResponse } from 'types/AccountResponse';
import { Guest3DSContext } from 'types/Guest3DS';
import { PaymentCardSubmission, PaymentDetail } from 'types/Payment';
import {
  getActiveWorldpayProvider,
  getSecure3dsVersion,
  shouldRun3DSForPaymentMethod,
} from 'utilities/paymentProvider3ds';

const GUEST_CARD_ADD_3DS_PENDING_KEY = 'epay-guest-card-add-3ds-pending';

export interface PendingGuest3DS {
  paymentCard: PaymentCardSubmission;
  context: Guest3DSContext;
  accessToken: string;
}

export const savePendingGuest3DS = (pending: PendingGuest3DS) => {
  sessionStorage.setItem(
    GUEST_CARD_ADD_3DS_PENDING_KEY,
    JSON.stringify(pending),
  );
};

export const getPendingGuest3DS = (): PendingGuest3DS | null => {
  const value = sessionStorage.getItem(GUEST_CARD_ADD_3DS_PENDING_KEY);
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

export const clearPendingGuest3DS = () => {
  sessionStorage.removeItem(GUEST_CARD_ADD_3DS_PENDING_KEY);
};

interface Guest3DSValidationOptions {
  paymentCard: PaymentCardSubmission;
  context: Guest3DSContext;
  redirectUri: string;
  paymentDetail?: PaymentDetail;
}

export const useGuest3DSValidation = () => {
  const paymentProviders = useAppSelector(selectPaymentProviders);
  const companyCodes = useAppSelector(selectCompanyCodes);
  const getGuestTransactionAccessToken =
    EpayPaymentService.useGetGuestTransactionAccessToken();
  const getGuest3DSAuthenticationResult =
    EpayPaymentService.useGetGuest3DSAuthenticationResult();
  const paymetric3DSCheck = EpayPaymentService.useGetPaymetric3DSCheck();

  return useCallback(
    async ({
      paymentCard,
      context,
      redirectUri,
      paymentDetail,
    }: Guest3DSValidationOptions): Promise<
      ThreeDSAuthenticationResultResponse | undefined
    > => {
      const activeProvider = getActiveWorldpayProvider(paymentProviders);
      const companyCodeDetail = companyCodes?.find(
        (code) => code.companyCode === context.payer.companyCode,
      );
      const shouldRun3DS = shouldRun3DSForPaymentMethod(
        paymentCard.paymentCardType,
        activeProvider,
        companyCodeDetail?.is3dsDisabled,
      );

      if (!shouldRun3DS) {
        return undefined;
      }

      const secure3dsVersion = getSecure3dsVersion(activeProvider);
      if (!secure3dsVersion) {
        throw new Error(
          '3DS is enabled but secure3dsVersion is not configured',
        );
      }

      const transactionPaymentDetail: PaymentDetail = paymentDetail ?? {
        paymentMethod: paymentCard.paymentCardType === 'EC' ? 'EC' : 'CC',
        paymentCardType: paymentCard.sapCardType || paymentCard.paymentCardType,
        paymentCardToken: paymentCard.paymentCardToken,
        paymentCardName: paymentCard.paymentCardName,
        validTo: paymentCard.validTo ? paymentCard.validTo : '',
        electronicCheckAccountType:
          paymentCard.electronicCheckAccountType ?? '',
        electronicCheckRdfiNumber: paymentCard.electronicCheckRdfiNumber ?? '',
        cardValidationCode: paymentCard.cardValidationCode ?? '',
        validFrom: paymentCard.validFrom ?? '',
        companyAddress: context.billingAddress,
      };

      const accessResp = await getGuestTransactionAccessToken({
        payer: context.payer,
        payment: transactionPaymentDetail,
        billingAddress: context.billingAddress,
        amount: context.amount,
        currency: context.currency,
        redirectUri,
        guestUserEmail: context.guestUserEmail,
      });

      const cardType = paymentCard.gatewayCardType!;
      const paymetricData = window.$XIPlugin.createJSRequestPacket(
        accessResp.merchantId,
        accessResp.accessToken,
      );

      paymetricData.addField(
        window.$XIPlugin.createField('PAYMET', false, 'CC'),
      );
      paymetricData.addField(
        window.$XIPlugin.createField('CCINS', false, cardType),
      );
      paymetricData.addField(
        window.$XIPlugin.createField(
          'CCNUM',
          true,
          paymentCard.paymentCardToken,
        ),
      );

      savePendingGuest3DS({
        paymentCard: {
          ...paymentCard,
          paymentCardName:
            paymentCard.paymentCardName || context.billingAddress?.name || '',
        },
        context,
        accessToken: accessResp.accessToken,
      });

      try {
        await paymetric3DSCheck(
          accessResp.paymetricUrl,
          paymetricData,
          secure3dsVersion,
        );
        clearPendingGuest3DS();
      } catch (err: unknown) {
        clearPendingGuest3DS();
        const e = err as Record<string, unknown>;
        const statusObj = e?.status as Record<string, unknown> | undefined;
        const msg =
          (statusObj?.Message as string) ||
          (e?.text_status as string) ||
          (e?.message as string) ||
          '3DS validation failed';
        throw new Error(msg);
      }

      const authResult = await getGuest3DSAuthenticationResult({
        accessToken: accessResp.accessToken,
      });

      return {
        ...authResult,
        accessToken: accessResp.accessToken,
        vRef:
          accessResp.vRef || authResult.vRef || authResult.v_ref || undefined,
      };
    },
    [
      paymentProviders,
      companyCodes,
      getGuestTransactionAccessToken,
      getGuest3DSAuthenticationResult,
      paymetric3DSCheck,
    ],
  );
};
