import styled from '@emotion/styled';
import { useState } from 'react';
import { MEDIA_DOWN_SM } from 'shared/theme/breakpoints';
import { Button } from '@mui/material';
import { useAppDispatch } from 'redux/hooks';
import { setMaintenanceStatus } from 'redux/reducers';
import { useEpayQuery } from 'providers/EpayQueryProvider';
import { useEpayLoading } from 'providers/EpayLoadingProvider';
import { isMaintenanceStatusResponse } from 'utilities/maintenance';
import { clearMaintenanceUnavailableRedirect } from 'utilities/maintenance';

const STATUS_CHECK_MIN_DELAY_MS = 750;

const PageWrapper = styled('div')({
  fontFamily: "'Inter Variable', 'Inter', sans-serif",
  backgroundColor: '#f5f5f5',
  color: '#1f2937',
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '24px',
  boxSizing: 'border-box',
});

const Container = styled('div')({
  maxWidth: '640px',
  width: '100%',
});

const Card = styled('div')({
  backgroundColor: '#ffffff',
  border: '1px solid #dcdcdc',
  borderRadius: '8px',
  padding: '48px',
  textAlign: 'center',
  [MEDIA_DOWN_SM]: {
    padding: '32px 24px',
  },
});

const Icon = styled('div')({
  width: '64px',
  height: '64px',
  margin: '0 auto 24px',
  borderRadius: '50%',
  backgroundColor: '#f0f0f0',
  color: '#4b5563',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '32px',
  fontWeight: 600,
});

const Title = styled('h1')({
  fontSize: '28px',
  fontWeight: 600,
  color: '#111827',
  marginBottom: '20px',
  [MEDIA_DOWN_SM]: {
    fontSize: '24px',
  },
});

const Message = styled('p')({
  fontSize: '16px',
  lineHeight: 1.7,
  color: '#4b5563',
  marginBottom: '16px',
  '&:last-child': {
    marginBottom: 0,
  },
});

const ReturnButton = styled(Button)({
  marginTop: '8px',
  color: '#111827',
  fontSize: '16px',
  fontWeight: 600,
  textDecoration: 'underline',
  textTransform: 'none',
  minWidth: 0,
  padding: 0,
  transition: 'color 0.2s ease',
  '&:hover': {
    color: '#4b5563',
    backgroundColor: 'transparent',
    textDecoration: 'underline',
  },
  '&.Mui-disabled': {
    backgroundColor: 'transparent',
    color: '#6b7280',
  },
});

export default function ServiceUnavailablePage() {
  const api = useEpayQuery();
  const { increment, decrement } = useEpayLoading();
  const dispatch = useAppDispatch();
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);

  const handleReturnToSignIn = async () => {
    if (isCheckingStatus) {
      return;
    }

    setIsCheckingStatus(true);
    increment();

    try {
      const delay = new Promise((resolve) =>
        window.setTimeout(resolve, STATUS_CHECK_MIN_DELAY_MS),
      );
      const response = await api.getCustomConfig(true);
      await delay;

      if (!response.ok) {
        const contentType = response.headers.get('content-type') ?? '';
        if (contentType.includes('application/json')) {
          const payload = await response.json();
          if (isMaintenanceStatusResponse(payload)) {
            dispatch(setMaintenanceStatus(payload));
          }
        }
        return;
      }

      // The config endpoint can serve stale data while SAP is still down, so
      // confirm against the availability state the probe just updated.
      const statusResponse = await api.getMaintenanceModeStatus();
      if (statusResponse.ok) {
        const statusPayload = await statusResponse.json();
        if (
          isMaintenanceStatusResponse(statusPayload) &&
          (statusPayload.mode ?? statusPayload.code) ===
            'maintenance_unavailable'
        ) {
          dispatch(setMaintenanceStatus(statusPayload));
          return;
        }
      }

      clearMaintenanceUnavailableRedirect();
      // toast.dismiss();
      window.location.assign('/');
    } catch {
      // Probe failed (backend unreachable / restarting): stay on this page.
    } finally {
      decrement();
      setIsCheckingStatus(false);
    }
  };
  return (
    <PageWrapper>
      <Container>
        <Card>
          <Icon>!</Icon>
          <Title>Service Temporarily Unavailable</Title>
          <Message>
            We are currently experiencing system issues. We are aware of the
            issue and are working to restore service as quickly as possible.
          </Message>
          <Message>
            Please try again later. If you continue to experience issues,
            contact our customer service team for assistance.
          </Message>
          <ReturnButton
            variant="text"
            onClick={handleReturnToSignIn}
            disabled={isCheckingStatus}
          >
            {isCheckingStatus ? 'Checking status...' : 'Return to Sign In'}
          </ReturnButton>
        </Card>
      </Container>
    </PageWrapper>
  );
}
