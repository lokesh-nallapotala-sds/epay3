import { useEffect, useState } from 'react';

import {
  ApplicationConfigRequest,
  ApplicationLinkItem,
} from 'types/AppConfigRequest';
import { useEpayToast } from 'providers/EpayToastProvider';
import { EpayApplicationService } from 'services/EpayApplicationService';
import { useAppDispatch, useAppSelector } from 'redux/hooks';
import { selectedAccountSelector } from 'redux/reducers';
import { languageSelector, refreshConfig } from 'redux/reducers/configSlice';
import {
  ScheduledPaymentPolicy,
  EMPTY_POLICY,
  fromServerPolicy,
  toServerPolicy,
  ServerScheduledPaymentPolicy,
} from 'types/ScheduledPaymentPolicy';
import {
  selectApplicationConfig,
  selectCompanyCodes,
  selectEnablePreAuth,
} from 'redux/selectors/configSelectors';
import { urlRegex } from './urlRegex';
import {
  createApplicationLinkItem,
  getApplicationLinksFromConfig,
  normalizeApplicationLinkUrl,
} from 'utilities/applicationLinks';

const DEFAULT_PAYMENT_DISABLE_MESSAGE_TEXT = {
  en: '',
  fr: '',
  de: '',
  es: '',
  it: '',
  ja: '',
  pt: '',
  ru: '',
};

const REGISTRATION_EMAIL_EXPIRATION_OPTIONS = ['6', '12', '24', '48', 'Never'];
const MESSAGE_LANGUAGE_OPTIONS = [
  'en',
  'fr',
  'de',
  'es',
  'it',
  'ja',
  'pt',
  'ru',
];
const ADDRESS_VALIDATION_OPTIONS = ['Off', 'zip', 'full'];
const PAYMENT_INTEGRATION_TYPE_OPTIONS = ['iframe', 'hosted'] as const;

const getConfigString = (value: unknown, fallback = '') => {
  if (value === null || value === undefined || value === 'null')
    return fallback;
  return String(value);
};

const getConfigOption = <T extends string>(
  value: unknown,
  options: readonly T[],
  fallback: T,
) => {
  const stringValue = getConfigString(value);
  return options.includes(stringValue as T) ? (stringValue as T) : fallback;
};

const normalizeScheduledPaymentPolicy = (
  policy: ApplicationConfigRequest['scheduledPaymentPolicy'],
  isEnabled: boolean,
) => {
  const normalizedPolicy = fromServerPolicy(policy);

  if (isEnabled && normalizedPolicy.mode === 'None') {
    return {
      ...normalizedPolicy,
      mode: 'Daily' as const,
    };
  }

  return normalizedPolicy;
};

export function useApplicationConfigForm(f: (id: string) => string) {
  const dispatch = useAppDispatch();
  const selectedLanguage = useAppSelector(languageSelector);
  const selectedAccount = useAppSelector(selectedAccountSelector);
  const reduxApplicationConfig = useAppSelector(selectApplicationConfig);
  const companyCodes = useAppSelector(selectCompanyCodes);
  const enablePreAuth = useAppSelector(selectEnablePreAuth);
  const [registrationEmailErrorText, setRegistrationEmailErrorText] =
    useState<string>();
  const [expirationChangeError, setExpirationChangeError] =
    useState<boolean>(false);
  const [expirationChangeErrorText, setExpirationChangeErrorText] =
    useState<string>();
  const [expirationMessageError, setExpirationMessageError] =
    useState<boolean>(false);
  const [expirationMessageErrorText, setExpirationMessageErrorText] =
    useState<string>();
  const [privacyPolicyError, setPrivacyPolicyError] = useState(false);
  const [privacyPolicyErrorText, setPrivacyPolicyErrorText] =
    useState<string>();
  const [selectedLinkId, setSelectedLinkId] = useState('');
  const [linkErrors, setLinkErrors] = useState<Record<string, string>>({});

  const [addressValidationError, setAddressValidationError] =
    useState<boolean>(false);
  const [addressValidationErrorText, setAddressValidationErrorText] =
    useState<string>();

  const [messageLanguageError, setMessageLanguageError] =
    useState<boolean>(false);
  const [messageLanguageErrorText, setMessageLanguageErrorText] =
    useState<string>();
  const [messageTextError, setMessageTextError] = useState<boolean>(false);
  const [messageTextErrorText, setMessageTextErrorText] = useState<string>();
  const [isCompanyCodePaymentDisabled, setIsCompanyCodePaymentDisabled] =
    useState<boolean>(false);
  const [isAutoPayEnabled, setIsAutoPayEnabled] = useState<boolean>(false);
  const [isSchedulePaymentsEnabled, setIsSchedulePaymentsEnabled] =
    useState<boolean>(false);
  const [scheduledPaymentPolicy, setScheduledPaymentPolicy] =
    useState<ScheduledPaymentPolicy>(EMPTY_POLICY);
  const [hasScheduleErrors, setHasScheduleErrors] = useState<boolean>(false);

  const initialApplicationConfigRequest: ApplicationConfigRequest = {
    allowRegistration: false,
    registrationEmail: '',
    registrationEmailExpiration: '',
    expirationMessage: '',
    privacyPolicy: '',
    termsAndConditions: '',
    contactUs: '',
    applicationLinks: [],
    disablePaymentsGlobally: false,
    allowCVV: false,
    allowGuestPayment: false,
    isAccountLinkingEnabled: false,
    messageLanguage: '',
    paymentDisableMessageText: DEFAULT_PAYMENT_DISABLE_MESSAGE_TEXT,
    maxPaymentAllowed: '',
    maxECheckPaymentAllowed: '',
    addressValidationOptions: '',
    isAutoPayEnabled: false,
    isSchedulePaymentsEnabled: false,
    scheduledPaymentPolicy: EMPTY_POLICY,
  };
  const { showToastMessage } = useEpayToast();
  const [applicationConfig, setApplicationConfig] =
    useState<ApplicationConfigRequest>(initialApplicationConfigRequest);
  const updateApplicationConfig =
    EpayApplicationService.useUpdateApplicationConfig();
  const checkEmailTemplates =
    EpayApplicationService.useCheckAllEmailTemplates();

  useEffect(() => {
    const checkTemplates = async () => {
      const result = await checkEmailTemplates(selectedLanguage);

      if (result?.hasMissingTemplates && result?.message) {
        const message = result.message;
        showToastMessage('warning', message);
      }
    };

    checkTemplates();
  }, [selectedLanguage]);

  useEffect(() => {
    if (!selectedAccount?.companyCode || !companyCodes) return;

    const companyCodeMatch = companyCodes.find(
      (item) => item.companyCode === selectedAccount.companyCode,
    );

    setIsCompanyCodePaymentDisabled(
      companyCodeMatch?.isPaymentDisabled ?? false,
    );
  }, [selectedAccount?.companyCode, companyCodes]);

  useEffect(() => {
    if (!reduxApplicationConfig) return;

    const rawConfig = reduxApplicationConfig as ApplicationConfigRequest &
      Record<string, unknown>;
    const isScheduleEnabled =
      !!reduxApplicationConfig.isSchedulePaymentsEnabled;
    const updatedMessageText =
      reduxApplicationConfig.paymentDisableMessageText ||
      DEFAULT_PAYMENT_DISABLE_MESSAGE_TEXT;
    const paymentIntegrationType = getConfigOption(
      getConfigString(
        rawConfig.paymentIntegrationType ?? rawConfig.PaymentIntegrationType,
      ).toLowerCase(),
      PAYMENT_INTEGRATION_TYPE_OPTIONS,
      'iframe',
    );
    const normalizedScheduledPaymentPolicy = normalizeScheduledPaymentPolicy(
      reduxApplicationConfig.scheduledPaymentPolicy,
      isScheduleEnabled,
    );
    const applicationLinks = getApplicationLinksFromConfig(
      reduxApplicationConfig,
    );

    setApplicationConfig({
      ...reduxApplicationConfig,
      registrationEmail: getConfigString(
        reduxApplicationConfig.registrationEmail,
      ),
      registrationEmailExpiration: getConfigOption(
        reduxApplicationConfig.registrationEmailExpiration,
        REGISTRATION_EMAIL_EXPIRATION_OPTIONS,
        '6',
      ),
      expirationMessage: getConfigString(
        reduxApplicationConfig.expirationMessage,
      ),
      maxPaymentAllowed: getConfigString(
        reduxApplicationConfig.maxPaymentAllowed,
      ),
      maxECheckPaymentAllowed: getConfigString(
        reduxApplicationConfig.maxECheckPaymentAllowed,
      ),
      addressValidationOptions: getConfigOption(
        reduxApplicationConfig.addressValidationOptions,
        ADDRESS_VALIDATION_OPTIONS,
        'Off',
      ),
      messageLanguage: getConfigOption(
        reduxApplicationConfig.messageLanguage,
        MESSAGE_LANGUAGE_OPTIONS,
        'en',
      ),
      paymentIntegrationType,
      paymentDisableMessageText: updatedMessageText,
      scheduledPaymentPolicy: normalizedScheduledPaymentPolicy,
      applicationLinks,
    });
    setSelectedLinkId(applicationLinks[0]?.id ?? '');
    setLinkErrors({});

    setIsAutoPayEnabled(!!(reduxApplicationConfig as any).isAutoPayEnabled);
    setIsSchedulePaymentsEnabled(isScheduleEnabled);
    setScheduledPaymentPolicy(normalizedScheduledPaymentPolicy);
  }, [reduxApplicationConfig]);

  const handleOfflineChange = (next: {
    isAutoPayEnabled: boolean;
    isSchedulePaymentsEnabled: boolean;
    policy: ScheduledPaymentPolicy;
  }) => {
    setIsAutoPayEnabled(next.isAutoPayEnabled);
    setIsSchedulePaymentsEnabled(next.isSchedulePaymentsEnabled);
    setScheduledPaymentPolicy(
      normalizeScheduledPaymentPolicy(
        next.policy,
        next.isSchedulePaymentsEnabled,
      ),
    );
  };

  const handleMoveLink = (direction: -1 | 1) => {
    setApplicationConfig((prev) => {
      const links = prev.applicationLinks ?? [];
      const index = links.findIndex((link) => link.id === selectedLinkId);
      const target = index + direction;

      if (index < 0 || target < 0 || target >= links.length) {
        return prev;
      }

      const nextLinks = [...links];
      [nextLinks[index], nextLinks[target]] = [
        nextLinks[target],
        nextLinks[index],
      ];

      return {
        ...prev,
        applicationLinks: nextLinks,
      };
    });
  };

  const addLink = (label: string, url: string) => {
    const newLink = createApplicationLinkItem(label, url);

    setApplicationConfig((prev) => ({
      ...prev,
      applicationLinks: [...(prev.applicationLinks ?? []), newLink],
    }));
    setSelectedLinkId(newLink.id);
    setLinkErrors((prev) => {
      const next = { ...prev };
      delete next[newLink.id];
      return next;
    });
  };

  const updateSelectedLinkUrl = (url: string) => {
    const normalizedUrl = normalizeApplicationLinkUrl(url);

    setApplicationConfig((prev) => ({
      ...prev,
      applicationLinks: (prev.applicationLinks ?? []).map((link) =>
        link.id === selectedLinkId ? { ...link, url: normalizedUrl } : link,
      ),
    }));

    setLinkErrors((prev) => {
      const next = { ...prev };

      if (normalizedUrl && !urlRegex.test(normalizedUrl)) {
        next[selectedLinkId] = f('configuration.application.url.invalid');
      } else {
        delete next[selectedLinkId];
      }

      return next;
    });
  };

  const deleteSelectedLink = () => {
    setApplicationConfig((prev) => {
      const links = prev.applicationLinks ?? [];
      const index = links.findIndex((link) => link.id === selectedLinkId);

      if (index < 0) {
        return prev;
      }

      const nextLinks = links.filter((link) => link.id !== selectedLinkId);
      const nextSelectedLink =
        nextLinks[index]?.id ?? nextLinks[index - 1]?.id ?? '';

      setSelectedLinkId(nextSelectedLink);
      setLinkErrors((current) => {
        const next = { ...current };
        delete next[selectedLinkId];
        return next;
      });

      return {
        ...prev,
        applicationLinks: nextLinks,
      };
    });
  };

  const handleSubmit = () => {
    let hasError = false;

    if (applicationConfig.registrationEmail?.trim().length === 0) {
      setRegistrationEmailErrorText(
        f('configuration.application.registrationemail.required'),
      );
      hasError = true;
    }

    if (applicationConfig.registrationEmailExpiration?.trim().length === 0) {
      setExpirationChangeErrorText(f('Required'));
      hasError = true;
    }

    const nextLinkErrors: Record<string, string> = {};

    for (const link of applicationConfig.applicationLinks ?? []) {
      if (link.url && !urlRegex.test(normalizeApplicationLinkUrl(link.url))) {
        nextLinkErrors[link.id] = f('configuration.application.url.invalid');
      }
    }

    setLinkErrors(nextLinkErrors);

    if (Object.keys(nextLinkErrors).length > 0) {
      hasError = true;
    }
    if (applicationConfig.messageLanguage?.trim().length === 0) {
      setMessageLanguageErrorText(f('Required'));
      hasError = true;
    }
    // Mirrors the select's messageLanguage[0] fallback in PaymentsSection
    const effectiveMessageLanguage = applicationConfig.messageLanguage || 'en';
    if (
      !applicationConfig.paymentDisableMessageText?.[
        effectiveMessageLanguage
      ]?.trim()
    ) {
      setMessageTextError(true);
      setMessageTextErrorText(
        f('configuration.application.messagetext.required'),
      );
      hasError = true;
    }

    if (!applicationConfig.expirationMessage?.trim()) {
      setExpirationMessageError(true);
      setExpirationMessageErrorText(
        f('configuration.application.expirationmessage.required'),
      );
      hasError = true;
    }

    if (hasError || hasScheduleErrors) return;

    const applicationConfigPayload = {
      ...applicationConfig,
      applicationLinks: (applicationConfig.applicationLinks ?? []).map(
        (link): ApplicationLinkItem => ({
          ...link,
          label: link.label.trim(),
          url: normalizeApplicationLinkUrl(link.url),
        }),
      ),
      isAutoPayEnabled,
      isSchedulePaymentsEnabled,
      scheduledPaymentPolicy: isSchedulePaymentsEnabled
        ? toServerPolicy(scheduledPaymentPolicy)
        : ({
            mode: 'None',
            allowedWeekdays: null,
            allowedMonthDays: null,
          } as ServerScheduledPaymentPolicy),
    };

    updateApplicationConfig(applicationConfigPayload, 'en')
      .then(() => {
        dispatch(refreshConfig());
        showToastMessage(
          'success',
          f('configuration.saved_configuration_message'),
        );
      })
      .catch((error: Error) => {
        showToastMessage('error', error.message ?? error.toString());
      });
  };

  return {
    applicationConfig,
    setApplicationConfig,
    selectedLinkId,
    setSelectedLinkId,
    linkErrors,
    handleMoveLink,
    addLink,
    updateSelectedLinkUrl,
    deleteSelectedLink,
    registrationEmailErrorText,
    setRegistrationEmailErrorText,
    expirationChangeError,
    setExpirationChangeError,
    expirationChangeErrorText,
    setExpirationChangeErrorText,
    expirationMessageError,
    setExpirationMessageError,
    expirationMessageErrorText,
    setExpirationMessageErrorText,
    privacyPolicyError,
    setPrivacyPolicyError,
    privacyPolicyErrorText,
    setPrivacyPolicyErrorText,
    addressValidationError,
    setAddressValidationError,
    addressValidationErrorText,
    setAddressValidationErrorText,
    messageLanguageError,
    setMessageLanguageError,
    messageLanguageErrorText,
    setMessageLanguageErrorText,
    messageTextError,
    setMessageTextError,
    messageTextErrorText,
    setMessageTextErrorText,
    isCompanyCodePaymentDisabled,
    isAutoPayEnabled,
    isSchedulePaymentsEnabled,
    scheduledPaymentPolicy,
    setHasScheduleErrors,
    enablePreAuth,
    handleOfflineChange,
    handleSubmit,
  };
}
