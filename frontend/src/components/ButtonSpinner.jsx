import { LiquidLoader } from '@/components/ui/liquid-loader';

export default function ButtonSpinner({ label = 'Processing…' }) {
  return (
    <span role="status" className="inline-grid min-h-5 place-items-center">
      <LiquidLoader className="w-10" />
      <span className="sr-only">{label}</span>
    </span>
  );
}
