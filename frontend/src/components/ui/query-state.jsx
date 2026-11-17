import { AlertCircle } from 'lucide-react';
import { LoadingState } from './loading-state';
import { getApiError } from '@/api/errors';
import { Button } from './button';
import { EmptyState } from './empty-state';

export function QueryState({ loading, error, onRetry, empty, children, emptyTitle = 'No records found', emptyDescription = 'Records will appear here when they are available.', loadingLabel = 'Loading records…', loadingDescription = 'Fetching the latest details.' }) {
  if (loading) return <LoadingState label={loadingLabel} description={loadingDescription} />;
  if (error) return <div role="alert" className="page-card flex flex-col items-start gap-4 border-red-200"><div className="flex gap-3 text-sm text-red-700"><AlertCircle className="size-5 shrink-0" aria-hidden="true" /><p>{getApiError(error)}</p></div>{onRetry && <Button variant="outline" onClick={onRetry}>Try again</Button>}</div>;
  if (empty) return <EmptyState title={emptyTitle} description={emptyDescription} />;
  return children;
}
