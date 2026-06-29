'use client';

import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { CheckCircle2, Mail, Phone, RefreshCw, Search, ShieldCheck, UserPlus, UsersRound, XCircle } from 'lucide-react';

type StaffRole = 'OWNER' | 'MANAGER' | 'CASHIER';
type StaffStatus = 'ACTIVE' | 'INACTIVE';
type Staff = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: StaffRole;
  status: StaffStatus;
  lastLoginAt?: string | null;
};

const roleOptions: Array<{ label: string; value: StaffRole | 'ALL' }> = [
  { label: 'All roles', value: 'ALL' },
  { label: 'Owners', value: 'OWNER' },
  { label: 'Managers', value: 'MANAGER' },
  { label: 'Cashiers', value: 'CASHIER' },
];

const statusOptions: Array<{ label: string; value: StaffStatus | 'ALL' }> = [
  { label: 'All staff', value: 'ALL' },
  { label: 'Active', value: 'ACTIVE' },
  { label: 'Inactive', value: 'INACTIVE' },
];

function getErrorMessage(value: unknown, fallback: string) {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object') {
    const error = (value as { error?: unknown }).error;
    if (typeof error === 'string') return error;
    if (error && typeof error === 'object') {
      const flattened = error as { formErrors?: unknown; fieldErrors?: Record<string, unknown> };
      const formErrors = Array.isArray(flattened.formErrors) ? flattened.formErrors : [];
      const fieldErrors = flattened.fieldErrors && typeof flattened.fieldErrors === 'object'
        ? Object.values(flattened.fieldErrors).flatMap((item) => Array.isArray(item) ? item : [])
        : [];
      const message = [...formErrors, ...fieldErrors].filter((item): item is string => typeof item === 'string').join(' ');
      if (message) return message;
    }
  }
  return fallback;
}

function roleBadgeClass(role: StaffRole) {
  if (role === 'OWNER') return 'border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-900 dark:bg-purple-950/40 dark:text-purple-300';
  if (role === 'MANAGER') return 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-300';
  return 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300';
}

function statusBadgeClass(status: StaffStatus) {
  return status === 'ACTIVE'
    ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300'
    : 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300';
}

export function StaffTable() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updatingId, setUpdatingId] = useState('');
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<StaffRole | 'ALL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<StaffStatus | 'ALL'>('ALL');
  const [selectedId, setSelectedId] = useState('');
  const [form, setForm] = useState<{ name: string; email: string; phone: string; role: StaffRole }>({ name: '', email: '', phone: '', role: 'CASHIER' });

  const load = async () => {
    setLoading(true);
    setError('');
    const res = await fetch('/api/staff');
    const data = await res.json();
    if (!res.ok) setError(getErrorMessage(data, 'Unable to load staff.'));
    else setStaff(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filteredStaff = useMemo(() => {
    const term = query.trim().toLowerCase();
    return staff.filter((member) => {
      const matchesTerm = !term || [member.name, member.email, member.phone ?? '', member.role, member.status].some((value) => value.toLowerCase().includes(term));
      const matchesRole = roleFilter === 'ALL' || member.role === roleFilter;
      const matchesStatus = statusFilter === 'ALL' || member.status === statusFilter;
      return matchesTerm && matchesRole && matchesStatus;
    });
  }, [query, roleFilter, staff, statusFilter]);

  const selectedStaff = staff.find((member) => member.id === selectedId) ?? filteredStaff[0] ?? null;
  const stats = [
    { label: 'Total staff', value: staff.length, icon: UsersRound },
    { label: 'Active', value: staff.filter((member) => member.status === 'ACTIVE').length, icon: CheckCircle2 },
    { label: 'Inactive', value: staff.filter((member) => member.status === 'INACTIVE').length, icon: XCircle },
    { label: 'Owners', value: staff.filter((member) => member.role === 'OWNER').length, icon: ShieldCheck },
  ];

  const createStaff = async () => {
    setError('');
    setNotice('');
    setSaving(true);
    const res = await fetch('/api/staff', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) return setError(getErrorMessage(data, 'Unable to create staff.'));
    setForm({ name: '', email: '', phone: '', role: 'CASHIER' });
    setNotice(`${data.name} was added to staff.`);
    setSelectedId(data.id);
    await load();
  };

  const updateStaff = async (id: string, payload: Partial<Staff>) => {
    setError('');
    setNotice('');
    setUpdatingId(id);
    const res = await fetch(`/api/staff/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const data = await res.json().catch(() => null);
    setUpdatingId('');
    if (!res.ok) return setError(getErrorMessage(data, 'Unable to update staff.'));
    setNotice('Staff profile updated.');
    await load();
  };

  return (
    <div className="w-full space-y-5">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-xl border border-vernex-border bg-white p-4 shadow-sm dark:border-[#1E335F] dark:bg-vernex-navy">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase text-vernex-muted dark:text-slate-400">{stat.label}</p>
              <stat.icon className="h-4 w-4 text-emerald-600 dark:text-vernex-gold" />
            </div>
            <p className="mt-2 text-2xl font-black text-vernex-navy dark:text-white">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-5">
          <div className="rounded-xl border border-vernex-border bg-white p-5 shadow-sm dark:border-[#1E335F] dark:bg-vernex-navy">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-vernex-navy dark:text-white">Add Staff</h2>
                <p className="text-sm text-vernex-muted dark:text-slate-300">Create a staff profile and assign an access role.</p>
              </div>
              <Badge variant="outline" className="w-fit rounded-full border-vernex-border bg-vernex-surface text-vernex-navy dark:border-[#1E335F] dark:bg-vernex-dark dark:text-white">
                Manual invite
              </Badge>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <Input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <Input placeholder="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              <Input placeholder="Phone optional" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              <select className="h-9 rounded-md border border-vernex-border bg-white px-3 text-sm shadow-sm dark:border-[#1E335F] dark:bg-vernex-dark dark:text-white" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as StaffRole })}>
                <option value="CASHIER">Cashier</option>
                <option value="MANAGER">Manager</option>
                <option value="OWNER">Owner</option>
              </select>
            </div>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button onClick={createStaff} disabled={saving}>
                <UserPlus className="mr-2 h-4 w-4" />
                {saving ? 'Creating...' : 'Create Staff'}
              </Button>
              {notice && <p className="text-sm font-medium text-emerald-600 dark:text-emerald-300">{notice}</p>}
              {error && <p className="text-sm font-medium text-red-500">{error}</p>}
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-vernex-border bg-white shadow-sm dark:border-[#1E335F] dark:bg-vernex-navy">
            <div className="border-b border-vernex-border p-4 dark:border-[#1E335F]">
              <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                <div className="relative xl:w-80">
                  <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-vernex-muted" />
                  <Input className="pl-9" placeholder="Search staff, email, phone, role" value={query} onChange={(e) => setQuery(e.target.value)} />
                </div>
                <div className="flex flex-wrap gap-2">
                  {roleOptions.map((item) => (
                    <Button key={item.value} size="sm" variant={roleFilter === item.value ? 'default' : 'outline'} onClick={() => setRoleFilter(item.value)}>
                      {item.label}
                    </Button>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  {statusOptions.map((item) => (
                    <Button key={item.value} size="sm" variant={statusFilter === item.value ? 'secondary' : 'outline'} onClick={() => setStatusFilter(item.value)}>
                      {item.label}
                    </Button>
                  ))}
                  <Button size="icon" variant="outline" title="Refresh staff" onClick={load} disabled={loading}>
                    <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
                  </Button>
                </div>
              </div>
            </div>

            <table className="hidden w-full text-sm lg:table">
              <thead className="bg-vernex-surface text-left text-vernex-muted dark:bg-vernex-dark dark:text-slate-300">
                <tr>
                  <th className="p-3">Name</th><th>Email</th><th>Phone</th><th>Role</th><th>Status</th><th>Last Login</th><th className="text-right pr-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredStaff.map((member) => (
                  <tr key={member.id} onClick={() => setSelectedId(member.id)} className={cn('cursor-pointer border-t border-vernex-border transition hover:bg-vernex-surface/70 dark:border-[#1E335F] dark:hover:bg-vernex-dark', selectedStaff?.id === member.id && 'bg-emerald-50/70 dark:bg-emerald-950/20')}>
                    <td className="p-3 font-bold text-vernex-navy dark:text-white">{member.name}</td>
                    <td>{member.email}</td>
                    <td>{member.phone || '-'}</td>
                    <td><Badge variant="outline" className={cn('rounded-full', roleBadgeClass(member.role))}>{member.role}</Badge></td>
                    <td><Badge variant="outline" className={cn('rounded-full', statusBadgeClass(member.status))}>{member.status}</Badge></td>
                    <td>{member.lastLoginAt ? new Date(member.lastLoginAt).toLocaleString() : '-'}</td>
                    <td className="space-x-2 pr-4 text-right" onClick={(event) => event.stopPropagation()}>
                      <Button size="sm" variant="outline" disabled={updatingId === member.id || member.role === 'OWNER'} onClick={() => updateStaff(member.id, { role: member.role === 'CASHIER' ? 'MANAGER' : 'CASHIER' })}>
                        {member.role === 'CASHIER' ? 'Promote' : 'Set Cashier'}
                      </Button>
                      <Button size="sm" variant="outline" disabled={updatingId === member.id} onClick={() => updateStaff(member.id, { status: member.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' })}>
                        {member.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="grid gap-3 p-4 lg:hidden">
              {filteredStaff.map((member) => (
                <button key={member.id} type="button" onClick={() => setSelectedId(member.id)} className={cn('rounded-xl border border-vernex-border bg-white p-4 text-left shadow-sm transition hover:border-emerald-500 dark:border-[#1E335F] dark:bg-vernex-dark', selectedStaff?.id === member.id && 'border-emerald-500 ring-2 ring-emerald-500/20')}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-black text-vernex-navy dark:text-white">{member.name}</p>
                      <p className="mt-1 text-xs text-vernex-muted dark:text-slate-400">{member.email}</p>
                    </div>
                    <Badge variant="outline" className={cn('rounded-full', statusBadgeClass(member.status))}>{member.status}</Badge>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge variant="outline" className={cn('rounded-full', roleBadgeClass(member.role))}>{member.role}</Badge>
                    <span className="text-xs text-vernex-muted dark:text-slate-400">{member.phone || 'No phone'}</span>
                  </div>
                </button>
              ))}
            </div>

            {!loading && !filteredStaff.length && (
              <div className="p-10 text-center text-sm text-vernex-muted dark:text-slate-400">No staff match the current filters.</div>
            )}
          </div>
        </div>

        <aside className="rounded-xl border border-vernex-border bg-white p-5 shadow-sm dark:border-[#1E335F] dark:bg-vernex-navy">
          <h2 className="text-lg font-semibold text-vernex-navy dark:text-white">Staff Profile</h2>
          {selectedStaff ? (
            <div className="mt-4 space-y-4">
              <div className="rounded-xl bg-vernex-surface p-4 dark:bg-vernex-dark">
                <p className="text-xl font-black text-vernex-navy dark:text-white">{selectedStaff.name}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge variant="outline" className={cn('rounded-full', roleBadgeClass(selectedStaff.role))}>{selectedStaff.role}</Badge>
                  <Badge variant="outline" className={cn('rounded-full', statusBadgeClass(selectedStaff.status))}>{selectedStaff.status}</Badge>
                </div>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2 text-vernex-muted dark:text-slate-300"><Mail className="h-4 w-4" /> {selectedStaff.email}</div>
                <div className="flex items-center gap-2 text-vernex-muted dark:text-slate-300"><Phone className="h-4 w-4" /> {selectedStaff.phone || 'No phone number'}</div>
                <div className="text-vernex-muted dark:text-slate-300">Last login: {selectedStaff.lastLoginAt ? new Date(selectedStaff.lastLoginAt).toLocaleString() : '-'}</div>
              </div>
              <div className="grid gap-2">
                <Button variant="outline" disabled={updatingId === selectedStaff.id || selectedStaff.role === 'OWNER'} onClick={() => updateStaff(selectedStaff.id, { role: selectedStaff.role === 'CASHIER' ? 'MANAGER' : 'CASHIER' })}>
                  {selectedStaff.role === 'CASHIER' ? 'Promote to Manager' : 'Set as Cashier'}
                </Button>
                <Button variant={selectedStaff.status === 'ACTIVE' ? 'destructive' : 'default'} disabled={updatingId === selectedStaff.id} onClick={() => updateStaff(selectedStaff.id, { status: selectedStaff.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' })}>
                  {selectedStaff.status === 'ACTIVE' ? 'Deactivate Staff' : 'Activate Staff'}
                </Button>
              </div>
            </div>
          ) : (
            <p className="mt-4 text-sm text-vernex-muted dark:text-slate-400">Select a staff member to review role, status, and contact details.</p>
          )}
        </aside>
      </div>
    </div>
  );
}
