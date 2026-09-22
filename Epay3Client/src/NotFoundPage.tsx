import { useIntl } from 'react-intl';

import styled from '@emotion/styled';
import Link from '@mui/material/Link';

const ErrorContainer = styled('div')(() => ({
  height: '100vh',
  display: 'flex',
  flexDirection: 'column' as const,
  alignItems: 'center',
  justifyContent: 'center',
  textAlign: 'center' as const,
  backgroundColor: '#F8F9FA',
}));

const ActionsContainer = styled('div')(() => ({
  marginTop: '20px',
}));

const ReloadButton = styled('button')(() => ({
  marginRight: '10px',
  padding: '10px 20px',
  backgroundColor: '#007bff',
  color: '#fff',
  border: 'none',
  borderRadius: '5px',
  cursor: 'pointer',
}));

const HomeLink = styled(Link)(() => ({
  color: '#fff',
  backgroundColor: '#28a745',
  textDecoration: 'none',
  borderRadius: '5px',
  padding: '10px 20px',
}));

export default function NotFoundPage() {
  const intl = useIntl();
  const f = (id) => intl.formatMessage({ id: id });

  const handleReload = (): void => {
    window.location.reload();
  };

  return (
    <ErrorContainer>
      <h1>{f('pagenotfound')}</h1>
      <p>{f('pagenotfound.message')}</p>
      <ActionsContainer>
        <ReloadButton onClick={handleReload}>
          {f('app.common.reload')}
        </ReloadButton>
        <HomeLink href="/">{f('app.common.gotohome')}</HomeLink>
      </ActionsContainer>
    </ErrorContainer>
  );
}
