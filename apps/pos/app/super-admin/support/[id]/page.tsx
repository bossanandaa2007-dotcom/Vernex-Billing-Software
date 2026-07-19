import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { getSupportTicket } from '@/services/super-admin/admin-data.server';
import { Card } from '@/components/super-admin/ui/card';
import { ErrorState } from '@/components/super-admin/ui/states';
import { formatDate } from '@/lib/super-admin/utils';
import { SupportStatusPill, SupportPriorityPill } from '@/components/super-admin/support-pills';
import { SupportReply } from '@/components/super-admin/support-reply';

export default async function SupportTicketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const { ticket, messages } = await getSupportTicket(id);
    if (!ticket) notFound();
    return (
      <div className="mx-auto max-w-3xl space-y-5">
        <Link href="/super-admin/support" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800 dark:hover:text-white"><ArrowLeft className="h-4 w-4" /> Back to Support</Link>
        <Card className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold">{ticket.subject}</h1>
              <p className="mt-1 text-sm text-slate-500">{ticket.businessName} · Raised by {ticket.createdByName} ({ticket.createdByEmail}) · {formatDate(ticket.createdAt)}</p>
            </div>
            <div className="flex items-center gap-2"><SupportPriorityPill priority={ticket.priority} /><SupportStatusPill status={ticket.status} /></div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="space-y-4">
            {messages.map((message) => {
              const admin = message.senderType === 'ADMIN';
              return (
                <div key={message.id} className={`flex ${admin ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${admin ? 'bg-blue-800 text-white dark:bg-amber-500 dark:text-slate-950' : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-white'}`}>
                    <p className="mb-1 text-[11px] font-semibold opacity-70">{admin ? `${message.senderName || 'Vernex Support'} (You)` : message.senderName || 'User'}</p>
                    <p className="whitespace-pre-wrap break-words">{message.body}</p>
                    <p className="mt-1 text-[10px] opacity-60">{formatDate(message.createdAt)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <SupportReply ticketId={ticket.id} status={ticket.status} />
      </div>
    );
  } catch {
    return <ErrorState message="Unable to load this ticket. It may no longer exist or the support tables are unavailable." />;
  }
}
