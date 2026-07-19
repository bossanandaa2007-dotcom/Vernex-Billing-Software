'use client';

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { ArrowLeft, LifeBuoy, Loader2, Plus, Send } from 'lucide-react';

type TicketStatus = 'OPEN' | 'PENDING' | 'RESOLVED' | 'CLOSED';
type Priority = 'LOW' | 'NORMAL' | 'HIGH';

type Ticket = {
  id: string;
  subject: string;
  status: TicketStatus;
  priority: Priority;
  lastMessageAt: string;
  lastMessageFrom: 'USER' | 'ADMIN';
  unreadForUser: boolean;
  createdAt: string;
};

type Message = { id: string; senderType: 'USER' | 'ADMIN'; senderName: string; body: string; createdAt: string };

const STATUS_TONE: Record<TicketStatus, string> = {
  OPEN: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
  PENDING: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
  RESOLVED: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300',
  CLOSED: 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
};

function when(value: string) {
  return new Date(value).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
}

export function SupportPanel() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [view, setView] = useState<'new' | 'thread' | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const loadTickets = useCallback(async () => {
    setLoadingList(true);
    try {
      const response = await fetch('/api/support', { cache: 'no-store' });
      const data = await response.json().catch(() => []);
      setTickets(Array.isArray(data) ? data : []);
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => { loadTickets(); }, [loadTickets]);

  return (
    <div className="grid w-full gap-4 lg:grid-cols-[340px_1fr]">
      <aside className={`rounded-xl border border-vernex-border bg-white dark:border-[#1E335F] dark:bg-vernex-navy ${view ? 'hidden lg:block' : ''}`}>
        <div className="flex items-center justify-between border-b border-vernex-border p-4 dark:border-[#1E335F]">
          <h2 className="font-semibold text-vernex-navy dark:text-white">Your Tickets</h2>
          <button onClick={() => { setView('new'); setSelectedId(null); }} className="inline-flex items-center gap-1.5 rounded-lg bg-vernex-navy px-3 py-1.5 text-xs font-semibold text-white transition hover:opacity-90 dark:bg-vernex-gold dark:text-vernex-dark">
            <Plus className="h-3.5 w-3.5" /> New
          </button>
        </div>
        <div className="max-h-[62vh] overflow-y-auto">
          {loadingList ? (
            <div className="flex items-center justify-center gap-2 p-8 text-sm text-vernex-muted"><Loader2 className="h-4 w-4 animate-spin" /> Loading...</div>
          ) : tickets.length === 0 ? (
            <div className="p-8 text-center text-sm text-vernex-muted">
              <LifeBuoy className="mx-auto mb-2 h-8 w-8 opacity-40" />
              No tickets yet. Raise one to contact support.
            </div>
          ) : (
            tickets.map((ticket) => (
              <button
                key={ticket.id}
                onClick={() => { setSelectedId(ticket.id); setView('thread'); }}
                className={`flex w-full flex-col items-start gap-1 border-b border-vernex-border/60 p-4 text-left transition hover:bg-vernex-surface dark:border-[#1E335F]/60 dark:hover:bg-white/5 ${selectedId === ticket.id ? 'bg-vernex-surface dark:bg-white/5' : ''}`}
              >
                <div className="flex w-full items-center justify-between gap-2">
                  <span className="truncate font-medium text-vernex-navy dark:text-white">{ticket.subject}</span>
                  {ticket.unreadForUser && <span className="h-2 w-2 shrink-0 rounded-full bg-vernex-gold" title="New reply" />}
                </div>
                <div className="flex w-full items-center justify-between gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${STATUS_TONE[ticket.status]}`}>{ticket.status}</span>
                  <span className="text-xs text-vernex-muted">{when(ticket.lastMessageAt)}</span>
                </div>
              </button>
            ))
          )}
        </div>
      </aside>

      <section className="min-h-[62vh] rounded-xl border border-vernex-border bg-white dark:border-[#1E335F] dark:bg-vernex-navy">
        {view === 'new' ? (
          <NewTicketForm onCancel={() => setView(null)} onCreated={async (id) => { await loadTickets(); setSelectedId(id); setView('thread'); }} />
        ) : view === 'thread' && selectedId ? (
          <TicketThread ticketId={selectedId} onBack={() => setView(null)} onChanged={loadTickets} />
        ) : (
          <div className="flex h-full min-h-[62vh] flex-col items-center justify-center p-8 text-center text-vernex-muted">
            <LifeBuoy className="mb-3 h-10 w-10 opacity-40" />
            <p className="font-medium text-vernex-navy dark:text-white">Need help?</p>
            <p className="mt-1 max-w-sm text-sm">Select a ticket to view the conversation, or raise a new one to contact the Vernex support team.</p>
            <button onClick={() => setView('new')} className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-vernex-navy px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 dark:bg-vernex-gold dark:text-vernex-dark"><Plus className="h-4 w-4" /> New Ticket</button>
          </div>
        )}
      </section>
    </div>
  );
}

function NewTicketForm({ onCancel, onCreated }: { onCancel: () => void; onCreated: (id: string) => void }) {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState<Priority>('NORMAL');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError('');
    const response = await fetch('/api/support', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject, message, priority }),
    });
    const result = await response.json().catch(() => null);
    setSaving(false);
    if (!response.ok) return setError(result?.error || 'Unable to create ticket.');
    onCreated(result.id);
  }

  return (
    <form onSubmit={submit} className="flex h-full flex-col p-5">
      <h2 className="text-lg font-semibold text-vernex-navy dark:text-white">Raise a Support Ticket</h2>
      <p className="mt-1 text-sm text-vernex-muted">Describe your issue and the Vernex team will reply here.</p>
      <div className="mt-5 space-y-4">
        <label className="block text-sm font-medium text-vernex-navy dark:text-slate-200">Subject
          <input value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={150} required placeholder="e.g. Receipt printer not working" className="mt-1.5 h-10 w-full rounded-lg border border-vernex-border bg-vernex-surface px-3 text-sm outline-none focus:border-vernex-gold focus:ring-2 focus:ring-vernex-gold/20 dark:border-[#1E335F] dark:bg-vernex-dark" />
        </label>
        <label className="block text-sm font-medium text-vernex-navy dark:text-slate-200">Priority
          <select value={priority} onChange={(e) => setPriority(e.target.value as Priority)} className="mt-1.5 h-10 w-full rounded-lg border border-vernex-border bg-vernex-surface px-3 text-sm outline-none focus:border-vernex-gold focus:ring-2 focus:ring-vernex-gold/20 dark:border-[#1E335F] dark:bg-vernex-dark">
            <option value="LOW">Low</option>
            <option value="NORMAL">Normal</option>
            <option value="HIGH">High</option>
          </select>
        </label>
        <label className="block text-sm font-medium text-vernex-navy dark:text-slate-200">Message
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} maxLength={4000} required rows={6} placeholder="Describe what's happening..." className="mt-1.5 w-full rounded-lg border border-vernex-border bg-vernex-surface p-3 text-sm outline-none focus:border-vernex-gold focus:ring-2 focus:ring-vernex-gold/20 dark:border-[#1E335F] dark:bg-vernex-dark" />
        </label>
      </div>
      {error && <p className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">{error}</p>}
      <div className="mt-5 flex justify-end gap-3">
        <button type="button" onClick={onCancel} className="rounded-lg border border-vernex-border px-4 py-2 text-sm font-semibold text-vernex-navy transition hover:bg-vernex-surface dark:border-[#1E335F] dark:text-white dark:hover:bg-white/5">Cancel</button>
        <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-vernex-navy px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50 dark:bg-vernex-gold dark:text-vernex-dark">{saving && <Loader2 className="h-4 w-4 animate-spin" />}Send Ticket</button>
      </div>
    </form>
  );
}

function TicketThread({ ticketId, onBack, onChanged }: { ticketId: string; onBack: () => void; onChanged: () => void }) {
  const [ticket, setTicket] = useState<{ subject: string; status: TicketStatus; priority: Priority } | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const response = await fetch(`/api/support/${ticketId}`, { cache: 'no-store' });
    const data = await response.json().catch(() => null);
    if (response.ok && data) {
      setTicket(data.ticket);
      setMessages(data.messages ?? []);
    }
    setLoading(false);
  }, [ticketId]);

  useEffect(() => { setLoading(true); load(); }, [load]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  async function sendReply(event: FormEvent) {
    event.preventDefault();
    if (!reply.trim()) return;
    setSending(true);
    setError('');
    const response = await fetch(`/api/support/${ticketId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: reply }),
    });
    const result = await response.json().catch(() => null);
    setSending(false);
    if (!response.ok) return setError(result?.error || 'Unable to send message.');
    setReply('');
    await load();
    onChanged();
  }

  return (
    <div className="flex h-full min-h-[62vh] flex-col">
      <div className="flex items-center gap-3 border-b border-vernex-border p-4 dark:border-[#1E335F]">
        <button onClick={onBack} className="grid h-9 w-9 place-items-center rounded-lg text-vernex-muted transition hover:bg-vernex-surface lg:hidden dark:hover:bg-white/5" aria-label="Back"><ArrowLeft className="h-5 w-5" /></button>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-vernex-navy dark:text-white">{ticket?.subject ?? 'Ticket'}</p>
          {ticket && <span className={`mt-0.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${STATUS_TONE[ticket.status]}`}>{ticket.status}</span>}
        </div>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center gap-2 p-8 text-sm text-vernex-muted"><Loader2 className="h-4 w-4 animate-spin" /> Loading...</div>
        ) : (
          messages.map((message) => {
            const mine = message.senderType === 'USER';
            return (
              <div key={message.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${mine ? 'bg-vernex-navy text-white dark:bg-vernex-gold dark:text-vernex-dark' : 'bg-vernex-surface text-vernex-navy dark:bg-white/10 dark:text-white'}`}>
                  <p className="mb-1 text-[11px] font-semibold opacity-70">{mine ? 'You' : `${message.senderName || 'Support'} (Admin)`}</p>
                  <p className="whitespace-pre-wrap break-words">{message.body}</p>
                  <p className="mt-1 text-[10px] opacity-60">{when(message.createdAt)}</p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={sendReply} className="border-t border-vernex-border p-3 dark:border-[#1E335F]">
        {error && <p className="mb-2 text-xs text-red-600">{error}</p>}
        <div className="flex items-end gap-2">
          <textarea value={reply} onChange={(e) => setReply(e.target.value)} rows={1} maxLength={4000} placeholder="Type a reply..." className="max-h-32 min-h-11 flex-1 resize-none rounded-lg border border-vernex-border bg-vernex-surface px-3 py-2.5 text-sm outline-none focus:border-vernex-gold focus:ring-2 focus:ring-vernex-gold/20 dark:border-[#1E335F] dark:bg-vernex-dark" onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReply(e as unknown as FormEvent); } }} />
          <button type="submit" disabled={sending || !reply.trim()} className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-vernex-navy text-white transition hover:opacity-90 disabled:opacity-50 dark:bg-vernex-gold dark:text-vernex-dark" aria-label="Send">{sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}</button>
        </div>
      </form>
    </div>
  );
}
