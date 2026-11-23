import { Heartbeat } from '@/components/ui/heartbeat';

export default function ButtonSpinner({ label = 'Processing…' }) {
  return (
    <span role="status" className="inline-grid min-h-5 place-items-center">
      <Heartbeat className="w-10" />
      <span className="sr-only">{label}</span>
    </span>
  );
}
