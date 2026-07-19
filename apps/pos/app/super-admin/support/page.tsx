import Link from 'next/link';
import { Search } from 'lucide-react';
import { listSupportTickets } from '@/services/super-admin/admin-data.server';
import { PageHeader } from '@/components/super-admin/page-header';
import { Card } from '@/components/super-admin/ui/card';
import { Button } from '@/components/super-admin/ui/button';
import { EmptyState, ErrorState } from '@/components/super-admin/ui/states';
import { formatDate } from '@/lib/super-admin/utils';
import { SupportStatusPill, SupportPriorityPill } from '@/components/super-admin/support-pills';

export default async function SupportPage({ searchParams }: { searchParams: Promise<{ status?: string; search?: string }> }) {
  const params = await searchParams;
  const status = params.status ?? 'ALL';
  const search = params.search ?? '';
  try {
    const tickets = await listSupportTickets({ status, search });
    return (
      <div className="space-y-6">
        <PageHeader title="Support" description="Help requests raised by businesses. Open a ticket to reply." />
        <Card>
          <form className="grid gap-3 border-b border-slate-200 p-4 sm:grid-cols-[1fr_180px_auto] dark:border-slate-800">
            <label className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><input name="search" defaultValue={search} placeholder="Search subject, name, email" className="h-10 w-full rounded-md border border-slate-200 bg-white pl-9 pr-3 text-sm dark:border-slate-700 dark:bg-slate-950" /></label>
            <select name="status" defaultValue={status} className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950">{['ALL', 'OPEN', 'PENDING', 'RESOLVED', 'CLOSED'].map((item) => <option key={item}>{item}</option>)}</select>
            <Button type="submit">Apply Filters</Button>
          </form>
          {tickets.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500 dark:bg-slate-950"><tr>{['Subject', 'Business', 'Raised By', 'Priority', 'Status', 'Last Activity', ''].map((label) => <th key={label} className="px-4 py-3">{label}</th>)}</tr></thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {tickets.map((ticket) => (
                    <tr key={ticket.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-4"><Link href={`/super-admin/support/${ticket.id}`} className="flex items-center gap-2 font-semibold text-blue-800 hover:underline dark:text-amber-400">{ticket.unreadForAdmin && <span className="h-2 w-2 shrink-0 rounded-full bg-amber-500" title="Awaiting reply" />}{ticket.subject}</Link></td>
                      <td className="px-4 py-4">{ticket.businessName}</td>
                      <td className="px-4 py-4"><span className="block">{ticket.createdByName}</span><span className="text-xs text-slate-500">{ticket.createdByEmail}</span></td>
                      <td className="px-4 py-4"><SupportPriorityPill priority={ticket.priority} /></td>
                      <td className="px-4 py-4"><SupportStatusPill status={ticket.status} /></td>
                      <td className="px-4 py-4 text-slate-500">{formatDate(ticket.lastMessageAt)}</td>
                      <td className="px-4 py-4"><Link href={`/super-admin/support/${ticket.id}`} className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">Open</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <EmptyState title="No support tickets" description="Businesses have not raised any help requests matching these filters." />}
        </Card>
      </div>
    );
  } catch {
    return <ErrorState message="Unable to load support tickets. Confirm the support tables exist and Supabase access is available." />;
  }
}
