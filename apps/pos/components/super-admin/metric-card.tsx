import type { LucideIcon } from 'lucide-react';
import { Card } from '@/components/super-admin/ui/card';

export function MetricCard({ label, value, detail, icon: Icon, tone = 'navy' }: { label: string; value: string; detail: string; icon: LucideIcon; tone?: 'navy' | 'gold' | 'green' | 'red' }) {
  const tones = { navy: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300', gold: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300', green: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300', red: 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300' };
  return <Card className="p-5"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase text-slate-500">{label}</p><p className="mt-3 text-2xl font-bold text-slate-950 dark:text-white">{value}</p><p className="mt-1 text-xs text-slate-500">{detail}</p></div><div className={`grid h-10 w-10 place-items-center rounded-md ${tones[tone]}`}><Icon className="h-5 w-5" /></div></div></Card>;
}

