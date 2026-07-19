'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { Loader2, X } from 'lucide-react';
import { Button } from '@/components/super-admin/ui/button';
import { Input } from '@/components/super-admin/ui/input';

type SubscriptionStatus = 'ACTIVE' | 'TRIAL' | 'SUSPENDED' | 'EXPIRED';

type EditForm = {
  name: string;
  planName: string;
  country: string;
  currency: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  businessPhone: string;
  address: string;
  taxId: string;
  subscriptionStatus: SubscriptionStatus;
  trialEndsAt: string;
};

const empty: EditForm = {
  name: '', planName: '', country: '', currency: '',
  ownerName: '', ownerEmail: '', ownerPhone: '',
  businessPhone: '', address: '', taxId: '',
  subscriptionStatus: 'TRIAL', trialEndsAt: '',
};

const STATUSES: SubscriptionStatus[] = ['ACTIVE', 'TRIAL', 'SUSPENDED', 'EXPIRED'];

// YYYY-MM-DD for `today + days`, in local time, for the trial-expiry presets.
function addDays(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toLocaleDateString('en-CA'); // en-CA renders as YYYY-MM-DD
}

export function BusinessEditDialog({ id, onClose, onSaved }: { id: string; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<EditForm>(empty);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const update = (key: keyof EditForm, value: string) => setForm((current) => ({ ...current, [key]: value }));

  // Close on Escape for keyboard users.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Pull the business's current values so the form pre-fills instead of blanking.
  useEffect(() => {
    let active = true;
    (async () => {
      const response = await fetch(`/api/super-admin/admin/businesses/${id}`, { cache: 'no-store' });
      const result = await response.json().catch(() => null);
      if (!active) return;
      if (!response.ok) { setError(result?.error || 'Unable to load business details.'); setLoaded(true); return; }
      setForm({ ...empty, ...result });
      setLoaded(true);
    })();
    return () => { active = false; };
  }, [id]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError('');
    const response = await fetch(`/api/super-admin/admin/businesses/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'edit', ...form }),
    });
    const result = await response.json().catch(() => null);
    setSaving(false);
    if (!response.ok) return setError(result?.error || 'Unable to save changes.');
    onSaved();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/50 p-4 backdrop-blur-sm sm:items-center" role="dialog" aria-modal="true" aria-label="Edit business" onMouseDown={onClose}>
      <div className="my-8 w-full max-w-2xl rounded-lg border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900" onMouseDown={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <h2 className="text-lg font-semibold">Edit Business</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"><X className="h-5 w-5" /></button>
        </div>
        {!loaded ? (
          <div className="flex items-center justify-center gap-2 px-6 py-16 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading details...</div>
        ) : (
          <form onSubmit={submit}>
            <div className="max-h-[70vh] overflow-y-auto px-6 py-5">
              <Section title="Business">
                <Field label="Business Name" required><Input value={form.name} onChange={(event) => update('name', event.target.value)} minLength={2} maxLength={120} required /></Field>
                <Field label="Plan Name"><Input value={form.planName} onChange={(event) => update('planName', event.target.value)} maxLength={80} placeholder="e.g. Free Trial" /></Field>
                <Field label="Country"><Input value={form.country} onChange={(event) => update('country', event.target.value)} maxLength={56} /></Field>
                <Field label="Currency"><Input value={form.currency} onChange={(event) => update('currency', event.target.value)} maxLength={8} placeholder="e.g. INR" /></Field>
              </Section>
              <Section title="Owner">
                <Field label="Owner Name"><Input value={form.ownerName} onChange={(event) => update('ownerName', event.target.value)} minLength={2} maxLength={120} /></Field>
                <Field label="Owner Email"><Input type="email" value={form.ownerEmail} onChange={(event) => update('ownerEmail', event.target.value)} maxLength={200} /></Field>
                <Field label="Owner Phone"><Input type="tel" inputMode="numeric" value={form.ownerPhone} onChange={(event) => update('ownerPhone', event.target.value.replace(/\D/g, '').slice(0, 10))} maxLength={10} placeholder="10 digits" /></Field>
              </Section>
              <Section title="Receipt / Contact">
                <Field label="Business Phone"><Input type="tel" inputMode="numeric" value={form.businessPhone} onChange={(event) => update('businessPhone', event.target.value.replace(/\D/g, '').slice(0, 10))} maxLength={10} placeholder="10 digits" /></Field>
                <Field label="GSTIN / Tax ID"><Input value={form.taxId} onChange={(event) => update('taxId', event.target.value)} maxLength={40} placeholder="Optional" /></Field>
                <div className="sm:col-span-2">
                  <Field label="Address"><textarea className="min-h-20 w-full rounded-md border border-slate-200 bg-white p-3 text-sm outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 dark:border-slate-700 dark:bg-slate-950" value={form.address} onChange={(event) => update('address', event.target.value)} maxLength={500} /></Field>
                </div>
              </Section>
              <Section title="Subscription & Trial">
                <Field label="Status">
                  <select className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm shadow-sm outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 dark:border-slate-700 dark:bg-slate-950" value={form.subscriptionStatus} onChange={(event) => update('subscriptionStatus', event.target.value)}>
                    {STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
                  </select>
                </Field>
                <Field label="Trial Expiry Date"><Input type="date" value={form.trialEndsAt} onChange={(event) => update('trialEndsAt', event.target.value)} /></Field>
                <div className="sm:col-span-2">
                  <p className="mb-2 text-xs text-slate-500">Customize the trial — pick any expiry date above, or use a quick preset:</p>
                  <div className="flex flex-wrap gap-2">
                    {[7, 14, 30, 60, 90].map((days) => (
                      <button key={days} type="button" onClick={() => setForm((current) => ({ ...current, trialEndsAt: addDays(days), subscriptionStatus: 'TRIAL' }))} className="rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">+{days} days</button>
                    ))}
                    <button type="button" onClick={() => setForm((current) => ({ ...current, trialEndsAt: addDays(0), subscriptionStatus: 'EXPIRED' }))} className="rounded-md border border-red-200 px-2.5 py-1 text-xs font-medium text-red-600 transition hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950/30">Expire today</button>
                    <button type="button" onClick={() => setForm((current) => ({ ...current, trialEndsAt: '' }))} className="rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">No expiry</button>
                  </div>
                </div>
              </Section>
              {error && <p role="alert" className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">{error}</p>}
            </div>
            <div className="flex flex-col-reverse gap-3 border-t border-slate-200 px-6 py-4 sm:flex-row sm:justify-end dark:border-slate-800">
              <Button variant="outline" type="button" onClick={onClose} disabled={saving}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin" />}{saving ? 'Saving...' : 'Save Changes'}</Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6 last:mb-0">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">{title}</p>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return <label className="block text-sm font-medium">{label}{required && <span className="ml-1 text-red-500">*</span>}<div className="mt-2">{children}</div></label>;
}
