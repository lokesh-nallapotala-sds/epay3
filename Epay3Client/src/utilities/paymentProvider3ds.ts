import PaymentProviderDetail from 'types/SapConfig/PaymentProviderDetail';

type PaymentProviderShape = PaymentProviderDetail & {
  Description?: string;
  Provider?: string;
  IsSecure3dsEnabled?: boolean;
  Secure3dsVersion?: string;
};

export const getActiveWorldpayProvider = (
  providers?: PaymentProviderDetail[],
): PaymentProviderDetail | undefined => {
  const providerList = providers ?? [];

  return (
    providerList.find((provider) => {
      const providerData = provider as PaymentProviderShape;
      const description = (
        providerData.description ??
        providerData.Description ??
        ''
      ).toLowerCase();
      const providerCode = (
        providerData.provider ??
        providerData.Provider ??
        ''
      ).toUpperCase();

      return (
        description.includes('worldpay') ||
        providerCode === 'PM' ||
        providerCode === 'WP'
      );
    }) ?? providerList[0]
  );
};

export const isSecure3dsEnabled = (
  provider?: PaymentProviderDetail,
): boolean => {
  const providerData = provider as PaymentProviderShape | undefined;
  return Boolean(
    providerData?.isSecure3dsEnabled ?? providerData?.IsSecure3dsEnabled,
  );
};

export const getSecure3dsVersion = (
  provider?: PaymentProviderDetail,
): string => {
  const providerData = provider as PaymentProviderShape | undefined;
  return (
    providerData?.secure3dsVersion ??
    providerData?.Secure3dsVersion ??
    ''
  ).trim();
};

export const shouldRun3DSForPaymentMethod = (
  paymentMethodType?: string,
  provider?: PaymentProviderDetail,
  isCompany3dsDisabled?: boolean,
): boolean => {
  const normalizedPaymentMethodType = paymentMethodType?.toUpperCase();

  return Boolean(
    normalizedPaymentMethodType &&
    normalizedPaymentMethodType !== 'EC' &&
    !isCompany3dsDisabled &&
    isSecure3dsEnabled(provider),
  );
};
