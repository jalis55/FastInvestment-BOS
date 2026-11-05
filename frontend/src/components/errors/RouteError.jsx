import { isRouteErrorResponse, useRouteError } from 'react-router-dom';
import { ErrorFallback } from './ErrorBoundary';

export default function RouteError() {
  const error = useRouteError();
  return <ErrorFallback title={isRouteErrorResponse(error) && error.status === 404 ? 'Page not found' : undefined} onRetry={() => window.location.reload()} />;
}
