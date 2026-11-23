import { FolderLoader } from '@/components/ui/folder-loader';

export default function ButtonSpinner({ label = 'Processing…' }) {
  return (
    <span role="status" className="inline-grid min-h-5 place-items-center">
      <FolderLoader className="w-10" />
      <span className="sr-only">{label}</span>
    </span>
  );
}
