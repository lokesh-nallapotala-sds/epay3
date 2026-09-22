import { ChangeEvent, useEffect, useState } from 'react';

import { useIntl } from 'react-intl';

import { EmailConfigRequest } from 'types/AppConfigRequest';
import { useEpayToast } from 'providers/EpayToastProvider';
import { EpayConfigService } from 'services/EpayConfigService';

export const MASKED_PASSWORD = '*************************************';

export function useSmtpConfigForm() {
  const intl = useIntl();
  const f = (id) => intl.formatMessage({ id: id });

  const initialEmailConfigRequest: EmailConfigRequest = {
    smtpAddress: '',
    smtpPort: '',
    smtpUseUser: false,
    smtpUser: '',
    smtpPassword: '',
    registrationRequestEmail: '',
    overrideEmail: '',
    securityEmail: '',
    fromAddress: '',
    fromAddressName: '',
    registrationRequestEmailContent: '',
    welcomeEmailContent: '',
    resetPasswordEmailContent: '',
    emailConfirmationContent: '',
    applicationUrl: '',
    companyName: '',
    hasPassword: false,
  };

  const [smtpConfig, setSmtpConfig] = useState<EmailConfigRequest>(
    initialEmailConfigRequest,
  );
  const [testEmail, setTestEmail] = useState<string>('');

  const [smtpAddressError, setSmtpAddressError] = useState<string>('');
  const [smtpPortError, setSmtpPortError] = useState<string>('');
  const [fromAddressError, setFromAddressError] = useState<string>('');
  const [addressNameError, setAddressNameError] = useState<string>('');
  const [testAddressError, setTestAddressError] = useState<string>('');
  const [securityEmailError, setSecurityEmailError] = useState<string>('');
  const [smtpUserError, setSmtpUserError] = useState<string>('');
  const [smtpPasswordError, setSmtpPasswordError] = useState<string>('');
  const [applicationUrlError, setApplicationUrlError] = useState<string>('');
  const [companyNameError, setCompanyNameError] = useState<string>('');
  const { showToastMessage } = useEpayToast();

  const getSmtpConfig = EpayConfigService.useGetSmtpConfig();

  function handleSmtpAddress(event: ChangeEvent<HTMLInputElement>) {
    const s = event.target.value;
    if (s.length > 0) setSmtpAddressError('');
    setSmtpConfig({ ...smtpConfig, smtpAddress: s });
  }

  function handleSmtpPort(event: ChangeEvent<HTMLInputElement>) {
    const s = event.target.value;
    if (s.length > 0) setSmtpPortError('');
    setSmtpConfig({ ...smtpConfig, smtpPort: s });
  }

  function handleFromAddress(event: ChangeEvent<HTMLInputElement>) {
    const s = event.target.value;
    if (s.length > 0) setFromAddressError('');
    setSmtpConfig({ ...smtpConfig, fromAddress: s });
  }

  function handleAddressName(event: ChangeEvent<HTMLInputElement>) {
    const s = event.target.value;
    if (s.length > 0) setAddressNameError('');
    setSmtpConfig({ ...smtpConfig, fromAddressName: s });
  }

  function handleTestAddress(event: ChangeEvent<HTMLInputElement>) {
    const s = event.target.value;
    if (s.length > 0) setTestAddressError('');
    setSmtpConfig({ ...smtpConfig, overrideEmail: s });
  }

  function handleSecurityEmail(event: ChangeEvent<HTMLInputElement>) {
    const s = event.target.value;
    if (s.length > 0) setSecurityEmailError('');
    setSmtpConfig({ ...smtpConfig, securityEmail: s });
  }

  function handleEmailAuth(event: ChangeEvent<HTMLInputElement>) {
    setSmtpConfig({
      ...smtpConfig,
      smtpUseUser: event.target.checked,
    });
  }

  function handleSmtpUser(event: ChangeEvent<HTMLInputElement>) {
    const s = event.target.value;
    if (s.length > 0) setSmtpUserError('');
    setSmtpConfig({ ...smtpConfig, smtpUser: s });
  }

  function handleSmtpPassword(event: ChangeEvent<HTMLInputElement>) {
    const s = event.target.value;
    if (s === MASKED_PASSWORD) return;
    if (s.length > 0) setSmtpPasswordError('');
    setSmtpConfig({ ...smtpConfig, smtpPassword: s });
  }

  const validateAndFormatUrl = (event) => {
    let inputValue = event.target.value;

    if (
      inputValue &&
      !inputValue.includes('http://') &&
      !inputValue.includes('https://')
    ) {
      inputValue = `https://${inputValue}`;
    }

    setSmtpConfig({ ...smtpConfig, applicationUrl: inputValue });
  };

  function handleApplicationUrl(event: ChangeEvent<HTMLInputElement>) {
    const s = event.target.value;
    if (s.length > 0) setApplicationUrlError('');

    setSmtpConfig({ ...smtpConfig, applicationUrl: s });
  }

  function handleCompanyName(event: ChangeEvent<HTMLInputElement>) {
    const s = event.target.value;
    if (s.length > 0) setCompanyNameError('');
    setSmtpConfig({ ...smtpConfig, companyName: s });
  }

  useEffect(() => {
    getSmtpConfig()
      .then((config: EmailConfigRequest) => {
        const cleanedConfig: EmailConfigRequest = {
          smtpAddress: config.smtpAddress ?? '',
          smtpPort: config.smtpPort ?? '',
          smtpUseUser: config.smtpUseUser ?? false,
          smtpUser: config.smtpUser ?? '',
          smtpPassword: '',
          registrationRequestEmail: config.registrationRequestEmail ?? '',
          overrideEmail: config.overrideEmail ?? '',
          securityEmail: config.securityEmail ?? '',
          fromAddress: config.fromAddress ?? '',
          fromAddressName: config.fromAddressName ?? '',
          registrationRequestEmailContent:
            config.registrationRequestEmailContent ?? '',
          welcomeEmailContent: config.welcomeEmailContent ?? '',
          resetPasswordEmailContent: config.resetPasswordEmailContent ?? '',
          emailConfirmationContent: config.emailConfirmationContent ?? '',
          applicationUrl: config.applicationUrl ?? '',
          companyName: config.companyName ?? '',
          hasPassword: config.hasPassword ?? false,
        };

        setSmtpConfig(cleanedConfig);
      })
      .catch((error) => {
        console.warn('Failed to load SMTP configuration:', error);
        showToastMessage(
          'error',
          f('configuration.email.smtp_config_load_failed'),
        );
      });
  }, []);

  return {
    smtpConfig,
    testEmail,
    setTestEmail,
    smtpAddressError,
    setSmtpAddressError,
    smtpPortError,
    setSmtpPortError,
    fromAddressError,
    setFromAddressError,
    addressNameError,
    setAddressNameError,
    testAddressError,
    setTestAddressError,
    securityEmailError,
    setSecurityEmailError,
    smtpUserError,
    setSmtpUserError,
    smtpPasswordError,
    setSmtpPasswordError,
    applicationUrlError,
    setApplicationUrlError,
    companyNameError,
    setCompanyNameError,
    handleSmtpAddress,
    handleSmtpPort,
    handleFromAddress,
    handleAddressName,
    handleTestAddress,
    handleSecurityEmail,
    handleEmailAuth,
    handleSmtpUser,
    handleSmtpPassword,
    validateAndFormatUrl,
    handleApplicationUrl,
    handleCompanyName,
  };
}
