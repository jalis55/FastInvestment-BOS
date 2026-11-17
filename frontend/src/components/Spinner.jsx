import { LoadingState } from '@/components/ui/loading-state';

export default function Spinner() {
  return <LoadingState label="Loading your workspace…" description="Preparing this page." className="mx-auto w-full max-w-5xl" />;
}
