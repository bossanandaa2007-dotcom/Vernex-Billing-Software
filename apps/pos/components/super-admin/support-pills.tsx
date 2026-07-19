import { cn } from '@/lib/super-admin/utils';

const STATUS_TONE: Record<string, string> = {
  OPEN: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-950/40 dark:text-emerald-300',
  PENDING: 'bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-950/40 dark:text-amber-300',
  RESOLVED: 'bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-950/40 dark:text-blue-300',
  CLOSED: 'bg-slate-100 text-slate-600 ring-slate-500/20 dark:bg-slate-800 dark:text-slate-300',
};

const PRIORITY_TONE: Record<string, string> = {
  LOW: 'bg-slate-100 text-slate-600 ring-slate-500/20 dark:bg-slate-800 dark:text-slate-300',
  NORMAL: 'bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-950/40 dark:text-blue-300',
  HIGH: 'bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-950/40 dark:text-red-300',
};

function Pill({ label, tone }: { label: string; tone: string }) {
  return <span className={cn('inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset', tone)}>{label}</span>;
}

export function SupportStatusPill({ status }: { status: string }) {
  return <Pill label={status} tone={STATUS_TONE[status] ?? STATUS_TONE.CLOSED} />;
}

export function SupportPriorityPill({ priority }: { priority: string }) {
  return <Pill label={priority} tone={PRIORITY_TONE[priority] ?? PRIORITY_TONE.NORMAL} />;
}
