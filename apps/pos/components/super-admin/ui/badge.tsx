import { cn } from '@/lib/super-admin/utils';

const styles: Record<string, string> = {
  ACTIVE: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-950/40 dark:text-emerald-300',
  TRIAL: 'bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-950/40 dark:text-amber-300',
  EXPIRED: 'bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-950/40 dark:text-red-300',
  SUSPENDED: 'bg-slate-100 text-slate-700 ring-slate-500/20 dark:bg-slate-800 dark:text-slate-300',
};

export function Badge({ children, tone, className }: { children: React.ReactNode; tone?: string; className?: string }) {
  return <span className={cn('inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset', styles[tone ?? ''] ?? styles.SUSPENDED, className)}>{children}</span>;
}

