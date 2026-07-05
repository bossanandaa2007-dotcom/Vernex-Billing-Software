import { Loader2 } from 'lucide-react';

export function LoadingState({ label = 'Loading...' }: { label?: string }) {
  return (
    <div className="flex min-h-40 items-center justify-center gap-3 text-sm text-vernex-muted dark:text-slate-300" role="status">
      <Loader2 className="h-5 w-5 animate-spin text-vernex-gold" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}
