import Link from 'next/link';
import { getTrials } from '@/services/super-admin/admin-data.server';
import { PageHeader } from '@/components/super-admin/page-header';
import { Card } from '@/components/super-admin/ui/card';
import { Badge } from '@/components/super-admin/ui/badge';
import { EmptyState, ErrorState } from '@/components/super-admin/ui/states';
import { TrialActions } from '@/components/super-admin/trial-actions';
import { formatDate } from '@/lib/super-admin/utils';

export default async function TrialsPage() {
  try {
    const trials = await getTrials();
    return <div className="space-y-6"><PageHeader title="Trial Management" description="Monitor trial windows and activate, extend, or expire customer access." /><Card>{trials.length ? <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-sm"><thead className="bg-slate-50 text-left text-xs uppercase text-slate-500 dark:bg-slate-950"><tr>{['Business','Trial Start','Trial End','Days Remaining','Status','Actions'].map((item) => <th key={item} className="px-4 py-3">{item}</th>)}</tr></thead><tbody className="divide-y divide-slate-100 dark:divide-slate-800">{trials.map((trial) => <tr key={trial.id}><td className="px-4 py-4"><Link href={`/super-admin/businesses/${trial.id}`} className="font-semibold text-blue-800 hover:underline dark:text-amber-400">{trial.name}</Link></td><td className="px-4 py-4">{formatDate(trial.trialStartedAt)}</td><td className="px-4 py-4">{formatDate(trial.trialEndsAt)}</td><td className="px-4 py-4 font-semibold">{trial.daysRemaining}</td><td className="px-4 py-4"><Badge tone={trial.subscriptionStatus}>{trial.subscriptionStatus}</Badge></td><td className="px-4 py-4"><TrialActions id={trial.id} /></td></tr>)}</tbody></table></div> : <EmptyState title="No trials found" description="Trial records appear when customer businesses are provisioned." />}</Card></div>;
  } catch {
    return <ErrorState message="Unable to load trial management data." />;
  }
}

