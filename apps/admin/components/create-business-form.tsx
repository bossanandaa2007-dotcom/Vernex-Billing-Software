'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';

const initial = { businessName: '', ownerName: '', email: '', phone: '', taxId: '', address: '', trialDays: '14', userId: '', temporaryPassword: '' };

export function CreateBusinessForm() {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const update = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError('');
    const response = await fetch('/api/admin/businesses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, trialDays: Number(form.trialDays) }),
    });
    const result = await response.json().catch(() => null);
    setLoading(false);
    if (!response.ok) return setError(result?.error || 'Unable to create business.');
    router.push(`/businesses/${result.id}`);
    router.refresh();
  }

  return <form onSubmit={submit}><Card className="p-5 md:p-6"><div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-md bg-amber-50 text-amber-700 dark:bg-amber-950/30"><Building2 className="h-5 w-5" /></div><div><h2 className="font-semibold">Business and Owner Details</h2><p className="text-sm text-slate-500">Creates the business workspace and its first owner account.</p></div></div><div className="mt-6 grid gap-5 md:grid-cols-2"><Field label="Business Name" required><Input value={form.businessName} onChange={(event) => update('businessName', event.target.value)} required /></Field><Field label="Owner Name" required><Input value={form.ownerName} onChange={(event) => update('ownerName', event.target.value)} required /></Field><Field label="Email" required><Input type="email" value={form.email} onChange={(event) => update('email', event.target.value)} required /></Field><Field label="Phone" required><Input value={form.phone} onChange={(event) => update('phone', event.target.value)} required /></Field><Field label="GSTIN" required><Input value={form.taxId} onChange={(event) => update('taxId', event.target.value)} required /></Field><Field label="Trial Days" required><Input type="number" min="0" max="365" value={form.trialDays} onChange={(event) => update('trialDays', event.target.value)} required /></Field><Field label="User ID" required><Input value={form.userId} onChange={(event) => update('userId', event.target.value.toLowerCase())} minLength={3} maxLength={50} pattern="[a-z0-9._-]+" title="Use lowercase letters, numbers, dots, underscores, or hyphens." autoComplete="off" required /></Field><Field label="Temporary Password" required><Input type="password" minLength={8} value={form.temporaryPassword} onChange={(event) => update('temporaryPassword', event.target.value)} autoComplete="new-password" required /></Field><div className="md:col-span-2"><Field label="Address" required><textarea className="min-h-24 w-full rounded-md border border-slate-200 bg-white p-3 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 dark:border-slate-700 dark:bg-slate-950" value={form.address} onChange={(event) => update('address', event.target.value)} required /></Field></div></div>{error && <p role="alert" className="mt-5 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">{error}</p>}<div className="mt-6 flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end dark:border-slate-800"><Button variant="outline" type="button" onClick={() => router.push('/businesses')}>Cancel</Button><Button type="submit" disabled={loading}>{loading && <Loader2 className="h-4 w-4 animate-spin" />}{loading ? 'Creating Business...' : 'Create Business'}</Button></div></Card></form>;
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return <label className="block text-sm font-medium">{label}{required && <span className="ml-1 text-red-500">*</span>}<div className="mt-2">{children}</div></label>;
}
