import { LoaderCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export function LoadingState({ label = 'Loading records…', description = 'Your data will appear here shortly.', variant = 'report', className }) {
  if (variant === 'compact') return <div role="status" aria-live="polite" aria-busy="true" className={cn('flex items-center gap-3 py-4 text-sm text-slate-600', className)}><LoaderCircle className="size-4 shrink-0 text-blue-600 motion-safe:animate-spin" aria-hidden="true" /><span>{label}</span></div>;
  return <section role="status" aria-live="polite" aria-busy="true" className={cn('loading-surface overflow-hidden rounded-3xl border border-slate-200/70 bg-white/80 shadow-sm', className)}>
    <div className="flex items-center gap-4 px-6 py-5">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600"><LoaderCircle className="size-5 motion-safe:animate-spin" aria-hidden="true" /></span>
      <div><p className="text-sm font-semibold text-slate-800">{label}</p><p className="mt-1 text-xs text-slate-500">{description}</p></div>
    </div>
    <div aria-hidden="true" className="loading-placeholder border-t border-slate-100 px-6 pb-6 pt-5">
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3">{[0, 1, 2].map((index) => <div key={index} className={cn('rounded-2xl border border-slate-100 p-4', index === 2 && 'hidden sm:block')}><div className="loading-bone mb-3 h-2.5 w-2/3" /><div className="loading-bone h-6 w-1/2" /></div>)}</div>
      <div className="space-y-4">{[0, 1, 2, 3].map((index) => <div key={index} className="flex items-center gap-5 border-b border-slate-100 pb-4 last:border-0 last:pb-0"><div className="loading-bone size-8 shrink-0 rounded-lg" /><div className="loading-bone h-3 w-1/3" /><div className="loading-bone ml-auto h-3 w-1/5" /></div>)}</div>
    </div>
  </section>;
}
