import { useIntl } from 'react-intl';

import { Box } from '@mui/system';
import { Button, Divider, Grid } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import OfflinePaymentsSection from './OfflinePaymentsSection';
import SignInSection from './application/SignInSection';
import AccountSettingsSection from './application/AccountSettingsSection';
import LinksSection from './application/LinksSection';
import PaymentsSection from './application/PaymentsSection';
import { useApplicationConfigForm } from './application/useApplicationConfigForm';

function ApplicationPage() {
  const intl = useIntl();
  const theme = useTheme();
  const f = (id) => intl.formatMessage({ id: id });
  const {
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
  } = useApplicationConfigForm(f);

  return (
    <Box
      display="flex"
      flexDirection="column"
      sx={{
        width: {
          xs: '100%',
          sm: '100%',
          md: '100%',
          lg: '100%',
        },
      }}
      justifyContent="flex-start"
    >
      <Grid container direction="column" rowGap="1rem">
        <Grid item container direction="column" rowGap="1.5rem">
          <SignInSection
            applicationConfig={applicationConfig}
            setApplicationConfig={setApplicationConfig}
            registrationEmailErrorText={registrationEmailErrorText}
            setRegistrationEmailErrorText={setRegistrationEmailErrorText}
            expirationChangeError={expirationChangeError}
            setExpirationChangeError={setExpirationChangeError}
            expirationChangeErrorText={expirationChangeErrorText}
            setExpirationChangeErrorText={setExpirationChangeErrorText}
            expirationMessageError={expirationMessageError}
            setExpirationMessageError={setExpirationMessageError}
            expirationMessageErrorText={expirationMessageErrorText}
            setExpirationMessageErrorText={setExpirationMessageErrorText}
          />
          <Divider />

          <AccountSettingsSection
            applicationConfig={applicationConfig}
            setApplicationConfig={setApplicationConfig}
          />
          <Divider />

          <LinksSection
            applicationConfig={applicationConfig}
            selectedLinkId={selectedLinkId}
            setSelectedLinkId={setSelectedLinkId}
            linkErrors={linkErrors}
            onMoveLink={handleMoveLink}
            onAddLink={addLink}
            onSelectedLinkUrlChange={updateSelectedLinkUrl}
            onDeleteSelectedLink={deleteSelectedLink}
          />
          <Divider />

          <PaymentsSection
            applicationConfig={applicationConfig}
            setApplicationConfig={setApplicationConfig}
            isCompanyCodePaymentDisabled={isCompanyCodePaymentDisabled}
            enablePreAuth={enablePreAuth}
            messageLanguageError={messageLanguageError}
            setMessageLanguageError={setMessageLanguageError}
            messageLanguageErrorText={messageLanguageErrorText}
            setMessageLanguageErrorText={setMessageLanguageErrorText}
            messageTextError={messageTextError}
            setMessageTextError={setMessageTextError}
            messageTextErrorText={messageTextErrorText}
            setMessageTextErrorText={setMessageTextErrorText}
            addressValidationError={addressValidationError}
            setAddressValidationError={setAddressValidationError}
            addressValidationErrorText={addressValidationErrorText}
            setAddressValidationErrorText={setAddressValidationErrorText}
          />

          {/* Offline Payments Section */}
          <OfflinePaymentsSection
            isAutoPayEnabled={isAutoPayEnabled}
            isSchedulePaymentsEnabled={isSchedulePaymentsEnabled}
            policy={scheduledPaymentPolicy}
            onChange={handleOfflineChange}
            onValidationChange={setHasScheduleErrors}
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

export default ApplicationPage;
