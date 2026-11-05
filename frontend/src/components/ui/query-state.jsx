import { AlertCircle, LoaderCircle } from 'lucide-react';
import { getApiError } from '@/api/errors';
import { Button } from './button';
import { EmptyState } from './empty-state';

export function QueryState({ loading, error, onRetry, empty, children, emptyTitle = 'No records found', emptyDescription = 'Records will appear here when they are available.' }) {
  if (loading) return <div role="status" className="page-card flex items-center justify-center gap-3 py-12 text-sm text-slate-600"><LoaderCircle className="size-5 animate-spin" aria-hidden="true" />Loading records…</div>;
  if (error) return <div role="alert" className="page-card flex flex-col items-start gap-4 border-red-200"><div className="flex gap-3 text-sm text-red-700"><AlertCircle className="size-5 shrink-0" aria-hidden="true" /><p>{getApiError(error)}</p></div>{onRetry && <Button variant="outline" onClick={onRetry}>Try again</Button>}</div>;
  if (empty) return <EmptyState title={emptyTitle} description={emptyDescription} />;
  return children;
}
