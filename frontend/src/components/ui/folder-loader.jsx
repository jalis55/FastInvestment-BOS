import { cn } from '@/lib/utils';

export function FolderLoader({ className }) {
  return (
    <span aria-hidden="true" className={cn('folder-loader w-20', className)}>
      <span className="folder-loader-paper" />
    </span>
  );
}
