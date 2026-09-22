import { useIntl } from 'react-intl';

import Grid from '@mui/material/Grid';
import { Box, useTheme } from '@mui/system';
import { SmtpConfig } from 'types/SmtpConfig';
import useMediaQuery from '@mui/material/useMediaQuery';
import { EmailConfigRequest } from 'types/AppConfigRequest';
import { useEpayToast } from 'providers/EpayToastProvider';
import { EpayApplicationService } from 'services/EpayApplicationService';
import { Button, Divider, Typography } from '@mui/material';

import SmtpSection from './emailConfiguration/SmtpSection';
import EmailSettingsSection from './emailConfiguration/EmailSettingsSection';
import EmailTemplatesSection from './emailConfiguration/EmailTemplatesSection';
import { useEmailTemplates } from './emailConfiguration/useEmailTemplates';
import { useSmtpConfigForm } from './emailConfiguration/useSmtpConfigForm';

function EmailConfigurationPage() {
  const intl = useIntl();
  const f = (id) => intl.formatMessage({ id: id });
  const theme = useTheme();
  const lgUp = useMediaQuery(theme.breakpoints.up('lg'));

  const {
    selectedKey,
    currentEmailConfig,
    emailTemplate,
    templateLanguageValue,
    emailSubjectError,
    setEmailSubjectError,
    handleEmailSubject,
    handleTemplateType,
    handleTemplateLanguage,
    handleEditorChange,
    handleResetToDefault,
  } = useEmailTemplates();

  const {
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
  } = useSmtpConfigForm();

  const updateSmtpConfig = EpayApplicationService.useUpdateEmailConfig();

  const updateEmailTemplateConfig =
    EpayApplicationService.useUpdateEmailTemplateConfig();
  //#region State

  const { showToastMessage } = useEpayToast();
  const smtpTest = EpayApplicationService.useSmtpTest();

  const urlRegex = /^(https?:\/\/)?[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)+([/?].*)?$/;
  const emailValidationRegex =
    /(?:[a-z0-9!#$%&"*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&"*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9]))\.){3}(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9])|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])/;
  //TODO: add password validation - but we probably need to make it configurable (at the very least we need to be able to enable/disable)
  //#endregion
  //#region Service Calls
  const isMaskedPassword = (password?: string) =>
    password ? /\*{8,}/.test(password) : false;

  const sendTestEmail = () => {
    const email = prompt('Test Email', testEmail);
    if (email == null) {
      setTestEmail('');
    } else {
      const smtpConfigValues: SmtpConfig = {
        smtpAddress: smtpConfig.smtpAddress,
        smtpPassword: smtpConfig.smtpPassword ?? ' ',
        smtpPort: smtpConfig.smtpPort,
        smtpUseUser: smtpConfig.smtpUseUser,
        smtpUser: smtpConfig.smtpUser,
        fromAddress: smtpConfig.fromAddress,
        fromAddressName: smtpConfig.fromAddressName,
        mailBody: emailTemplate.email,
        mailSubject: emailTemplate.title,
        registrationRequestEmail: smtpConfig.registrationRequestEmail,
        testEmail: email,
        applicationUrl: smtpConfig.applicationUrl,
        companyName: smtpConfig.companyName,
      };
      smtpTest(smtpConfigValues)
        .then(() => {
          showToastMessage('success', 'Successfully Sent Email');
        })
        .catch((err) => {
          const errorMessage = err.message;
          showToastMessage('error', errorMessage);
        });
    }
  };

  const handleSubmit = () => {
    if (currentEmailConfig) {
      let hasError = false;

      if (smtpConfig.smtpAddress.trim().length === 0) {
        setSmtpAddressError(f('configuration.email.error.smtp_address_label'));
        hasError = true;
      }

      if (smtpConfig.smtpPort.trim().length === 0) {
        setSmtpPortError(f('configuration.email.error.smtp_port_label'));
        hasError = true;
      }

      if (smtpConfig.smtpUseUser) {
        if (smtpConfig.smtpUser.trim().length === 0) {
          setSmtpUserError(f('configuration.email.error.smtp_user_label'));
          hasError = true;
        }

        if (
          !smtpConfig.hasPassword &&
          smtpConfig.smtpPassword &&
          smtpConfig.smtpPassword.trim().length === 0
        ) {
          setSmtpPasswordError(
            f('configuration.email.error.smtp_password_label'),
          );
          hasError = true;
        }
      }

      if (smtpConfig.overrideEmail) {
        if (!emailValidationRegex.test(smtpConfig.overrideEmail)) {
          setTestAddressError(f('user.error.email.bad'));
          hasError = true;
        }
      }

      if (smtpConfig.securityEmail) {
        if (!emailValidationRegex.test(smtpConfig.securityEmail)) {
          setSecurityEmailError(f('user.error.email.bad'));
          hasError = true;
        }
      }

      if (smtpConfig.fromAddressName.trim().length === 0) {
        setAddressNameError(f('configuration.email.error.from_address_name'));
        hasError = true;
      }
      if (smtpConfig.fromAddress.trim().length === 0) {
        setFromAddressError(f('configuration.email.error.from_address_label'));
        hasError = true;
      }
      if (smtpConfig.applicationUrl.trim().length === 0) {
        setApplicationUrlError(f('configuration.system.error.applicationurl'));
        hasError = true;
      } else if (!urlRegex.test(smtpConfig.applicationUrl.trim())) {
        hasError = true;
        setApplicationUrlError('Invalid URL format');
      }

      if (smtpConfig.companyName.trim().length === 0) {
        setCompanyNameError(f('configuration.system.error.companyname'));
        hasError = true;
      }
      if (emailTemplate.title.trim().length === 0) {
        setEmailSubjectError(f('configuration.error.email_subject_label'));
        hasError = true;
      }
      if (hasError) return;
      currentEmailConfig.templates[templateLanguageValue] = emailTemplate;

      const payload: EmailConfigRequest = {
        ...smtpConfig,
        smtpPassword:
          smtpConfig.smtpPassword &&
          !isMaskedPassword(smtpConfig.smtpPassword) &&
          smtpConfig.smtpPassword.trim().length > 0
            ? smtpConfig.smtpPassword
            : undefined,
      };

      updateSmtpConfig(payload, templateLanguageValue).then(
        (resp: EmailConfigRequest) => {
          if (resp)
            updateEmailTemplateConfig(
              selectedKey,
              currentEmailConfig,
              templateLanguageValue,
            );
          showToastMessage(
            'success',
            f('configuration.saved_configuration_message'),
          );
        },
      );
    }
  };

  return (
    <Box
      display="flex"
      width="100%"
      justifyContent={lgUp ? 'flex-start' : 'center'}
    >
      <Grid container direction="column" rowGap="1.5rem">
        {/************************ Server Parameters***************************/}
        <Grid item>
          <Typography
            variant="h2"
            sx={{
              width: {
                xs: '100%',
                sm: '100%',
                md: '100%',
                lg: '1106px',
              },
            }}
          >
            {f('configuration.email.parameters')}
          </Typography>
        </Grid>
        <Grid
          item
          container
          direction="column"
          rowGap="1.5rem"
          sx={{ mt: '-0.40rem' }}
        >
          <SmtpSection
            smtpConfig={smtpConfig}
            smtpAddressError={smtpAddressError}
            smtpPortError={smtpPortError}
            smtpUserError={smtpUserError}
            smtpPasswordError={smtpPasswordError}
            handleSmtpAddress={handleSmtpAddress}
            handleSmtpPort={handleSmtpPort}
            handleEmailAuth={handleEmailAuth}
            handleSmtpUser={handleSmtpUser}
            handleSmtpPassword={handleSmtpPassword}
            sendTestEmail={sendTestEmail}
          />
          <Divider />

          <EmailSettingsSection
            smtpConfig={smtpConfig}
            testAddressError={testAddressError}
            addressNameError={addressNameError}
            fromAddressError={fromAddressError}
            applicationUrlError={applicationUrlError}
            companyNameError={companyNameError}
            securityEmailError={securityEmailError}
            handleTestAddress={handleTestAddress}
            handleAddressName={handleAddressName}
            handleFromAddress={handleFromAddress}
            validateAndFormatUrl={validateAndFormatUrl}
            handleApplicationUrl={handleApplicationUrl}
            handleCompanyName={handleCompanyName}
            handleSecurityEmail={handleSecurityEmail}
          />
          <Divider />

          <EmailTemplatesSection
            selectedKey={selectedKey}
            emailTemplate={emailTemplate}
            emailSubjectError={emailSubjectError}
            handleTemplateType={handleTemplateType}
            handleTemplateLanguage={handleTemplateLanguage}
            handleEmailSubject={handleEmailSubject}
            handleEditorChange={handleEditorChange}
            handleResetToDefault={handleResetToDefault}
          />
          <Grid
            item
            container
            direction="row"
            justifyContent="flex-end"
            alignItems="center"
            marginTop="1.5rem"
          >
            <Button
              variant="contained"
              color="primary"
              type="submit"
              sx={{
                width: '250px',
                border: `1px solid ${theme.palette.buttonBorder.buttonBorderColor}`,
                '&:hover': {
                  border: `1px solid ${theme.palette.buttonBorder.buttonBorderHoverColor}`,
                },
              }}
              onClick={handleSubmit}
            >
              {f('configuration.system_maintenance_Save')}
            </Button>
          </Grid>
        </Grid>
      </Grid>
    </Box>
  );
}

export default EmailConfigurationPage;
