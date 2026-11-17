import { LoaderCircle } from 'lucide-react';

export default function ButtonSpinner({ label = 'Processing…' }) {
  return <span role="status" aria-live="polite" className="inline-flex items-center justify-center gap-2 whitespace-nowrap"><LoaderCircle className="size-4 shrink-0 motion-safe:animate-spin" aria-hidden="true" /><span>{label}</span></span>;
}
