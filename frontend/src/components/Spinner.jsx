import { LoadingState } from '@/components/ui/loading-state';

export default function Spinner({ fullPage = true }) {
  return <LoadingState label="Loading your workspace…"
    className={fullPage ? 'min-h-dvh' : 'min-h-[50dvh]'} />;
}
