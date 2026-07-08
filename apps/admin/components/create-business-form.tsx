'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { MODULE_GROUPS, MODULE_KEYS, DEFAULT_MODULE_KEYS, type ModuleKey } from '@/lib/modules';

const initial = { businessName: '', ownerName: '', email: '', phone: '', taxId: '', address: '', trialDays: '14', userId: '', temporaryPassword: '' };

export function CreateBusinessForm() {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [modules, setModules] = useState<Set<ModuleKey>>(() => new Set(DEFAULT_MODULE_KEYS));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const update = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const toggleModule = (key: ModuleKey) =>
    setModules((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError('');
    const response = await fetch('/api/admin/businesses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, trialDays: Number(form.trialDays), modules: Array.from(modules) }),
    });
    const result = await response.json().catch(() => null);
    setLoading(false);
    if (!response.ok) return setError(result?.error || 'Unable to create business.');
    setError('');
    setSuccess(`Business "${form.businessName}" created successfully. Owner User ID: ${String(result.userId || '').toUpperCase()}`);
    setTimeout(() => {
      router.push(`/businesses/${result.id}`);
      router.refresh();
    }, 1600);
  }

  return <form onSubmit={submit}><Card className="p-5 md:p-6"><div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-md bg-amber-50 text-amber-700 dark:bg-amber-950/30"><Building2 className="h-5 w-5" /></div><div><h2 className="font-semibold">Business and Owner Details</h2><p className="text-sm text-slate-500">Creates the business workspace and its first owner account.</p></div></div><div className="mt-6 grid gap-5 md:grid-cols-2"><Field label="Business Name" required><Input value={form.businessName} onChange={(event) => update('businessName', event.target.value)} required /></Field><Field label="Owner Name" required><Input value={form.ownerName} onChange={(event) => update('ownerName', event.target.value)} required /></Field><Field label="Email" required><Input type="email" value={form.email} onChange={(event) => update('email', event.target.value)} required /></Field><Field label="Phone" required><Input type="tel" inputMode="numeric" value={form.phone} onChange={(event) => update('phone', event.target.value.replace(/\D/g, '').slice(0, 10))} maxLength={10} pattern="[0-9]{10}" title="Enter exactly 10 digits." required /></Field><Field label="GSTIN"><Input value={form.taxId} onChange={(event) => update('taxId', event.target.value)} placeholder="Optional" /></Field><Field label="Trial Days" required><Input type="number" min="0" max="365" value={form.trialDays} onChange={(event) => update('trialDays', event.target.value)} required /></Field><Field label="User ID" required><Input value={form.userId} onChange={(event) => update('userId', event.target.value.toUpperCase())} minLength={3} maxLength={50} pattern="[A-Z0-9._-]+" title="Use letters, numbers, dots, underscores, or hyphens." autoComplete="off" required /></Field><Field label="Temporary Password" required><Input type="password" minLength={8} value={form.temporaryPassword} onChange={(event) => update('temporaryPassword', event.target.value)} autoComplete="new-password" required /></Field><div className="md:col-span-2"><Field label="Address" required><textarea className="min-h-24 w-full rounded-md border border-slate-200 bg-white p-3 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 dark:border-slate-700 dark:bg-slate-950" value={form.address} onChange={(event) => update('address', event.target.value)} required /></Field></div></div><div className="mt-8 border-t border-slate-200 pt-6 dark:border-slate-800"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-semibold">Feature Access</h3><p className="text-sm text-slate-500">Choose which features this business can use in the POS app. You can change these anytime from the business&apos;s Modules page.</p></div><div className="flex gap-2 text-xs"><button type="button" className="rounded-md border border-slate-200 px-2.5 py-1 font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300" onClick={() => setModules(new Set(MODULE_KEYS))}>Select all</button><button type="button" className="rounded-md border border-slate-200 px-2.5 py-1 font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300" onClick={() => setModules(new Set(DEFAULT_MODULE_KEYS))}>Reset to defaults</button><button type="button" className="rounded-md border border-slate-200 px-2.5 py-1 font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300" onClick={() => setModules(new Set())}>Clear</button></div></div><div className="mt-4 space-y-4">{MODULE_GROUPS.map((group) => <div key={group.label}><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{group.label}</p><div className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{group.modules.map(([key, label]) => <label key={key} className="flex cursor-pointer items-center justify-between gap-3 rounded-md border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900"><span className="font-medium">{label}</span><input type="checkbox" className="h-4 w-4 accent-amber-500" checked={modules.has(key)} onChange={() => toggleModule(key)} /></label>)}</div></div>)}</div><p className="mt-3 text-xs text-slate-500">{modules.size} feature{modules.size === 1 ? '' : 's'} enabled.</p></div>{error && <p role="alert" className="mt-5 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">{error}</p>}{success && <p role="status" className="mt-5 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300">✓ {success}</p>}<div className="mt-6 flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end dark:border-slate-800"><Button variant="outline" type="button" onClick={() => router.push('/businesses')}>Cancel</Button><Button type="submit" disabled={loading || Boolean(success)}>{(loading || success) && <Loader2 className="h-4 w-4 animate-spin" />}{success ? 'Created — redirecting...' : loading ? 'Creating Business...' : 'Create Business'}</Button></div></Card></form>;
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return <label className="block text-sm font-medium">{label}{required && <span className="ml-1 text-red-500">*</span>}<div className="mt-2">{children}</div></label>;
}
