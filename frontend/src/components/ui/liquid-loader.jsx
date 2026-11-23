import { useId } from 'react';
import { cn } from '@/lib/utils';

export function LiquidLoader({ className }) {
  const filterId = useId();

  return (
    <svg viewBox="0 0 80 40" aria-hidden="true" focusable="false"
      className={cn('h-auto w-20 shrink-0', className)}>
      <defs>
        <filter id={filterId} x="-50%" y="-80%" width="200%" height="260%">
          <feGaussianBlur stdDeviation="2" />
          <feComponentTransfer>
            <feFuncA type="linear" slope="17" intercept="-7" />
          </feComponentTransfer>
        </filter>
      </defs>
      <g fill="currentColor" filter={`url(#${filterId})`}>
        <circle cx="40" cy="20" r="7" className="liquid-loader-core" />
        <circle cx="40" cy="20" r="6" className="liquid-loader-drop" />
        <circle cx="40" cy="20" r="6" className="liquid-loader-drop liquid-loader-drop-reverse" />
      </g>
    </svg>
  );
}
