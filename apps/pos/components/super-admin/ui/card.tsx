import { cn } from '@/lib/super-admin/utils';

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return <section className={cn('rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900', className)}>{children}</section>;
}

