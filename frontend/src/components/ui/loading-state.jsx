import { cn } from '@/lib/utils';
import { LiquidLoader } from './liquid-loader';

export function LoadingState({ label = 'Loading records…', description, variant = 'report', className }) {
  const compact = variant === 'compact';

  return (
    <div role="status"
      className={cn('grid place-items-center text-blue-700', compact ? 'min-h-14' : 'min-h-52', className)}>
      <LiquidLoader className={compact ? 'w-11' : 'w-24'} />
      <span className="sr-only">{label}{description ? ` ${description}` : ''}</span>
    </div>
  );
}
