'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatMoney } from '@/lib/currency';
import axios from 'axios';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { useSubscriptionStatus } from '@/components/subscription/useSubscriptionStatus';

type Customer = { id: string; name: string; phone: string; email?: string; address?: string; taxId?: string; country?: string; notes?: string; totalPurchases: number; totalSpent: number; lastPurchaseDate?: string };
const empty = { name: '', phone: '', email: '', address: '', taxId: '', country: 'India', notes: '' };

export function CustomerDirectory() {
  const { isBlocked, expiredMessage } = useSubscriptionStatus();
  const [customers, setCustomers] = useState<Customer[]>([]); const [query, setQuery] = useState('');
  const [form, setForm] = useState(empty); const [editing, setEditing] = useState<string | null>(null); const [currency, setCurrency] = useState('INR');
  const load = useCallback(async () => { const [list, shop] = await Promise.all([axios.get('/api/customers', { params: { q: query } }), axios.get('/api/shopdata')]); setCustomers(list.data); setCurrency(shop.data.data.currency ?? 'INR'); }, [query]);
  useEffect(() => { const timer = setTimeout(() => load().catch(() => toast.error('Unable to load customers.')), 250); return () => clearTimeout(timer); }, [load]);
  const save = async () => { if (isBlocked) return toast.error(expiredMessage); try { editing ? await axios.patch(`/api/customers/${editing}`, form) : await axios.post('/api/customers', form); setForm(empty); setEditing(null); await load(); toast.success('Customer saved.'); } catch { toast.error('Enter a valid name and phone number.'); } };
  const edit = (customer: Customer) => { setEditing(customer.id); setForm({ name: customer.name, phone: customer.phone, email: customer.email ?? '', address: customer.address ?? '', taxId: customer.taxId ?? '', country: customer.country ?? '', notes: customer.notes ?? '' }); };
  const deactivate = async (id: string) => { if (isBlocked) return toast.error(expiredMessage); if (!confirm('Deactivate this customer? Existing sales will remain unchanged.')) return; await axios.delete(`/api/customers/${id}`); await load(); };
  return <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
    <Card><CardHeader><CardTitle>{editing ? 'Edit Customer' : 'Add Customer'}</CardTitle></CardHeader><CardContent className="space-y-3">
      {Object.entries(form).map(([key, value]) => <div key={key}><Label className="capitalize">{key === 'taxId' ? 'GSTIN / Tax ID' : key}</Label><Input value={value} onChange={(e) => setForm((current) => ({ ...current, [key]: e.target.value }))} /></div>)}
      <div className="flex gap-2"><Button onClick={save} disabled={isBlocked}>{editing ? 'Update' : 'Add Customer'}</Button>{editing && <Button variant="outline" onClick={() => { setEditing(null); setForm(empty); }}>Cancel</Button>}</div>
    </CardContent></Card>
    <Card><CardHeader><CardTitle>Customer Directory</CardTitle><Input placeholder="Search name, phone, email, or tax ID" value={query} onChange={(e) => setQuery(e.target.value)} /></CardHeader><CardContent className="space-y-3">
      {customers.map((customer) => <div key={customer.id} className="rounded-lg border p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="font-semibold">{customer.name}</div><div className="text-sm text-vernex-muted">{customer.phone}{customer.email ? ` | ${customer.email}` : ''}</div></div><div className="flex gap-2"><Button size="sm" variant="outline" disabled={isBlocked} onClick={() => edit(customer)}>Edit</Button><Button size="sm" variant="outline" disabled={isBlocked} onClick={() => deactivate(customer.id)}>Deactivate</Button></div></div><div className="mt-3 grid gap-2 text-sm sm:grid-cols-3"><span>Bills: <b>{customer.totalPurchases}</b></span><span>Spent: <b>{formatMoney(customer.totalSpent, currency)}</b></span><span>Last: <b>{customer.lastPurchaseDate ? new Date(customer.lastPurchaseDate).toLocaleDateString() : 'Never'}</b></span></div></div>)}
      {!customers.length && <div className="py-10 text-center text-vernex-muted">No customers found.</div>}
    </CardContent></Card>
  </div>;
}
