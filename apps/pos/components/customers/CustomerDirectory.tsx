'use client';

import { EmptyState } from '@/components/ui/empty-state';
import { LoadingState } from '@/components/ui/loading-state';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatMoney } from '@/lib/currency';
import { useSubscriptionStatus } from '@/components/subscription/useSubscriptionStatus';
import { Loader2, Search, UserPlus, Users } from 'lucide-react';
import axios from 'axios';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';

type Customer = {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  taxId?: string;
  country?: string;
  notes?: string;
  totalPurchases: number;
  totalSpent: number;
  lastPurchaseDate?: string;
};

const emptyForm = { name: '', phone: '', email: '', address: '', taxId: '', country: 'India', notes: '' };

export function CustomerDirectory() {
  const { isBlocked, expiredMessage } = useSubscriptionStatus();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [query, setQuery] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState<string | null>(null);
  const [currency, setCurrency] = useState('INR');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deactivating, setDeactivating] = useState('');
  const nameRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [list, shop] = await Promise.all([
        axios.get('/api/customers', { params: { q: query } }),
        axios.get('/api/shopdata'),
      ]);
      setCustomers(list.data);
      setCurrency(shop.data.data.currency ?? 'INR');
    } catch {
      toast.error('Unable to load customers. Please check your connection.');
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    const timer = setTimeout(load, 250);
    return () => clearTimeout(timer);
  }, [load]);

  const updateField = (field: keyof typeof emptyForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const resetForm = () => {
    setEditing(null);
    setForm(emptyForm);
  };

  const save = async () => {
    if (isBlocked) return toast.error(expiredMessage);
    if (!form.name.trim() || !form.phone.trim()) return toast.error('Please enter the customer name and phone number.');
    setSaving(true);
    try {
      editing
        ? await axios.patch(`/api/customers/${editing}`, form)
        : await axios.post('/api/customers', form);
      toast.success(editing ? 'Customer updated successfully.' : 'Customer added successfully.');
      resetForm();
      await load();
    } catch {
      toast.error('Unable to save the customer. Please check the details and try again.');
    } finally {
      setSaving(false);
    }
  };

  const edit = (customer: Customer) => {
    setEditing(customer.id);
    setForm({
      name: customer.name,
      phone: customer.phone,
      email: customer.email ?? '',
      address: customer.address ?? '',
      taxId: customer.taxId ?? '',
      country: customer.country ?? '',
      notes: customer.notes ?? '',
    });
    nameRef.current?.focus();
  };

  const deactivate = async (id: string) => {
    if (isBlocked) return toast.error(expiredMessage);
    if (!confirm('Deactivate this customer? Their previous sales will remain available.')) return;
    setDeactivating(id);
    try {
      await axios.delete(`/api/customers/${id}`);
      toast.success('Customer deactivated successfully.');
      await load();
    } catch {
      toast.error('Unable to deactivate the customer. Please try again.');
    } finally {
      setDeactivating('');
    }
  };

  return (
    <div className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
      <Card className="h-fit border-vernex-border/80 shadow-sm xl:sticky xl:top-24">
        <CardHeader className="border-b border-vernex-border dark:border-[#1E335F]">
          <CardTitle className="flex items-center gap-2 text-base">
            <UserPlus className="h-5 w-5 text-vernex-gold" />
            {editing ? 'Edit Customer' : 'Add Customer'}
          </CardTitle>
          <p className="text-sm text-vernex-muted dark:text-slate-300">Name and phone number are required.</p>
        </CardHeader>
        <CardContent className="space-y-4 p-5">
          <Field label="Name" required><Input ref={nameRef} value={form.name} onChange={(event) => updateField('name', event.target.value)} autoComplete="name" /></Field>
          <Field label="Phone" required><Input value={form.phone} onChange={(event) => updateField('phone', event.target.value)} autoComplete="tel" /></Field>
          <Field label="Email"><Input type="email" value={form.email} onChange={(event) => updateField('email', event.target.value)} autoComplete="email" /></Field>
          <Field label="Address"><Input value={form.address} onChange={(event) => updateField('address', event.target.value)} autoComplete="street-address" /></Field>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
            <Field label="GSTIN / Tax ID"><Input value={form.taxId} onChange={(event) => updateField('taxId', event.target.value)} /></Field>
            <Field label="Country"><Input value={form.country} onChange={(event) => updateField('country', event.target.value)} autoComplete="country-name" /></Field>
          </div>
          <Field label="Notes"><Input value={form.notes} onChange={(event) => updateField('notes', event.target.value)} /></Field>
          <div className="flex gap-2 pt-1">
            <Button className="min-w-32" onClick={save} disabled={isBlocked || saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
            {editing && <Button variant="outline" onClick={resetForm} disabled={saving}>Cancel</Button>}
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-vernex-border/80 shadow-sm">
        <CardHeader className="border-b border-vernex-border dark:border-[#1E335F]">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div><CardTitle className="text-base">Customer Directory</CardTitle><p className="mt-1 text-sm text-vernex-muted dark:text-slate-300">Review contact details and purchase history.</p></div>
            <div className="relative w-full md:max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-vernex-muted" />
              <Input className="pl-9" placeholder="Search customers" value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Search customers" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-5">
          {loading ? <LoadingState label="Loading customers..." /> : customers.length ? (
            <div className="grid gap-3 lg:grid-cols-2">
              {customers.map((customer) => (
                <article key={customer.id} className="rounded-xl border border-vernex-border p-4 transition hover:border-vernex-gold dark:border-[#1E335F]">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div><h3 className="font-semibold text-vernex-navy dark:text-white">{customer.name}</h3><p className="mt-1 text-sm text-vernex-muted dark:text-slate-300">{customer.phone}{customer.email ? ` · ${customer.email}` : ''}</p></div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" disabled={isBlocked || deactivating === customer.id} onClick={() => edit(customer)}>Edit</Button>
                      <Button size="sm" variant="outline" disabled={isBlocked || deactivating === customer.id} onClick={() => deactivate(customer.id)}>
                        {deactivating === customer.id ? 'Updating...' : 'Deactivate'}
                      </Button>
                    </div>
                  </div>
                  <dl className="mt-4 grid grid-cols-3 gap-2 rounded-lg bg-vernex-surface p-3 text-sm dark:bg-vernex-dark">
                    <div><dt className="text-xs text-vernex-muted">Bills</dt><dd className="font-semibold">{customer.totalPurchases}</dd></div>
                    <div><dt className="text-xs text-vernex-muted">Spent</dt><dd className="font-semibold">{formatMoney(customer.totalSpent, currency)}</dd></div>
                    <div><dt className="text-xs text-vernex-muted">Last Purchase</dt><dd className="font-semibold">{customer.lastPurchaseDate ? new Date(customer.lastPurchaseDate).toLocaleDateString() : 'None'}</dd></div>
                  </dl>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Users className="h-7 w-7" />}
              title={query ? 'No matching customers found' : 'No customers found'}
              description={query ? 'Try a different name or phone number.' : 'Add customers to keep track of purchase history.'}
              action={!query && <Button onClick={() => nameRef.current?.focus()}><UserPlus className="mr-2 h-4 w-4" />Add Customer</Button>}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, required = false, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return <div className="space-y-2"><Label>{label}{required && <span className="ml-1 text-red-500">*</span>}</Label>{children}</div>;
}
