import { isRouteErrorResponse, useRouteError } from 'react-router';

import useEpayNavigate from 'hooks/useEpayNavigate';

export default function RouteErrorBoundary() {
  const error = useRouteError();
  useEpayNavigate(); // Do not delete this. If ePay navigate can't capture the router context, the user will be stuck in the errorBoundary.

  if (isRouteErrorResponse(error)) {
    if (error.status === 404) {
      return <div>This page doesn't exist!</div>;
    } else if (error.status === 401) {
      return <div>You aren't authorized to see this</div>;
    }
  }
  return <div>Something went wrong</div>;
}
