'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Send } from 'lucide-react';
import { Card } from '@/components/super-admin/ui/card';
import { Button } from '@/components/super-admin/ui/button';

type Status = 'OPEN' | 'PENDING' | 'RESOLVED' | 'CLOSED';

export function SupportReply({ ticketId, status }: { ticketId: string; status: string }) {
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [busyStatus, setBusyStatus] = useState('');
  const [error, setError] = useState('');

  async function post(body: { message?: string; status?: Status }) {
    const response = await fetch(`/api/super-admin/admin/support/${ticketId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const result = await response.json().catch(() => null);
    if (!response.ok) throw new Error(result?.error || 'Unable to update ticket.');
  }

  async function sendReply(event: FormEvent) {
    event.preventDefault();
    if (!message.trim()) return;
    setSending(true);
    setError('');
    try {
      await post({ message });
      setMessage('');
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to send reply.');
    } finally {
      setSending(false);
    }
  }

  async function changeStatus(next: Status) {
    setBusyStatus(next);
    setError('');
    try {
      await post({ status: next });
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to change status.');
    } finally {
      setBusyStatus('');
    }
  }

  const statusActions: Status[] = ['OPEN', 'PENDING', 'RESOLVED', 'CLOSED'];

  return (
    <Card className="p-5">
      <form onSubmit={sendReply}>
        <label className="block text-sm font-semibold">Reply to the business</label>
        <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={4} maxLength={4000} placeholder="Type your reply..." className="mt-2 w-full rounded-md border border-slate-200 bg-white p-3 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 dark:border-slate-700 dark:bg-slate-950" />
        <div className="mt-3 flex justify-end">
          <Button type="submit" disabled={sending || !message.trim()}>{sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}Send Reply</Button>
        </div>
      </form>
      <div className="mt-4 border-t border-slate-200 pt-4 dark:border-slate-800">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Set Status</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {statusActions.map((action) => (
            <button
              key={action}
              type="button"
              disabled={busyStatus === action || status === action}
              onClick={() => changeStatus(action)}
              className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              {busyStatus === action ? 'Saving...' : action === status ? `${action} (current)` : action}
            </button>
          ))}
        </div>
      </div>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </Card>
  );
}
