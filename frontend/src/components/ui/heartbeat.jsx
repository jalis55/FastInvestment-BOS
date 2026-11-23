import { cn } from '@/lib/utils';

export const heartbeatPath = 'M2 17h16l5-5 6 9 7-17 7 26 7-16 5 3h15';

export function Heartbeat({ className }) {

  return (
    <svg viewBox="0 0 72 34" fill="none" aria-hidden="true" focusable="false"
      className={cn('h-auto w-20 shrink-0', className)}>
      <path d={heartbeatPath} stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round"
        strokeLinecap="round" opacity=".24" />
      <path d={heartbeatPath} pathLength="100" stroke="currentColor" strokeWidth="2.5"
        strokeLinejoin="round" strokeLinecap="round" className="heartbeat-trace" />
    </svg>
  );
}
