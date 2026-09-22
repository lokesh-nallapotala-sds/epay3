import { Component, ErrorInfo, ReactNode } from 'react';

import styled from '@emotion/styled';
import { getAppBaseUrl } from 'utilities/utilities';

interface AppErrorBoundaryProps {
  children: ReactNode;
}

interface AppErrorBoundaryState {
  hasError: boolean;
}

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

const HomeLink = styled('a')(() => ({
  color: '#fff',
  backgroundColor: '#28a745',
  textDecoration: 'none',
  borderRadius: '5px',
  padding: '10px 20px',
}));

class AppErrorBoundary extends Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  constructor(props: AppErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): AppErrorBoundaryState {
    // Update state so the next render shows the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log the error to an external service (optional)
    console.error('Error caught in AppErrorBoundary:', error, errorInfo);
  }

  handleReload = (): void => {
    // Reset error state and reload the page
    this.setState({ hasError: false });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <ErrorContainer>
          <h1>Oops! Something went wrong.</h1>
          <p>We are sorry, an unexpected error has occurred.</p>
          <ActionsContainer>
            <ReloadButton onClick={this.handleReload}>Reload Page</ReloadButton>
            <HomeLink href={`${getAppBaseUrl()}/`}>Go to Login</HomeLink>
          </ActionsContainer>
        </ErrorContainer>
      );
    }

    return this.props.children;
  }
}

export default AppErrorBoundary;
