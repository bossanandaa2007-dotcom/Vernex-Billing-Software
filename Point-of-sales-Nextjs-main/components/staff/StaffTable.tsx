'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type Staff = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: 'OWNER' | 'MANAGER' | 'CASHIER';
  status: 'ACTIVE' | 'INACTIVE';
  lastLoginAt?: string | null;
};

export function StaffTable() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', email: '', phone: '', role: 'CASHIER' });

  const load = async () => {
    const res = await fetch('/api/staff');
    const data = await res.json();
    if (!res.ok) setError(data.error || 'Unable to load staff.');
    else setStaff(data);
  };

  useEffect(() => { load(); }, []);

  const createStaff = async () => {
    setError('');
    const res = await fetch('/api/staff', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    const data = await res.json();
    if (!res.ok) return setError(data.error || 'Unable to create staff.');
    setForm({ name: '', email: '', phone: '', role: 'CASHIER' });
    await load();
  };

  const updateStaff = async (id: string, payload: Partial<Staff>) => {
    const res = await fetch(`/api/staff/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (res.ok) await load();
  };

  return (
    <div className="w-full space-y-6">
      <div className="rounded-xl border border-vernex-border bg-white p-5 shadow-sm dark:border-[#1E335F] dark:bg-vernex-navy">
        <h2 className="text-lg font-semibold text-vernex-navy dark:text-white">Add staff</h2>
        <p className="mb-4 text-sm text-vernex-muted dark:text-slate-300">Manual linking flow for Phase 6. Use the same email as the Supabase Auth user.</p>
        <div className="grid gap-3 md:grid-cols-4">
          <Input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Input placeholder="Phone optional" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <select className="rounded-md border border-vernex-border bg-white px-3 text-sm dark:border-[#1E335F] dark:bg-vernex-dark dark:text-white" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            <option value="CASHIER">Cashier</option>
            <option value="MANAGER">Manager</option>
            <option value="OWNER">Owner</option>
          </select>
        </div>
        <Button className="mt-4 bg-vernex-navy text-white hover:bg-vernex-dark" onClick={createStaff}>Create Staff</Button>
        {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
      </div>

      <div className="overflow-hidden rounded-xl border border-vernex-border bg-white shadow-sm dark:border-[#1E335F] dark:bg-vernex-navy">
        <table className="w-full text-sm">
          <thead className="bg-vernex-surface text-left text-vernex-muted dark:bg-vernex-dark dark:text-slate-300">
            <tr><th className="p-3">Name</th><th>Email</th><th>Role</th><th>Status</th><th>Last login</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {staff.map((member) => (
              <tr key={member.id} className="border-t border-vernex-border dark:border-[#1E335F]">
                <td className="p-3 font-medium text-vernex-navy dark:text-white">{member.name}</td>
                <td>{member.email}</td>
                <td>{member.role}</td>
                <td>{member.status}</td>
                <td>{member.lastLoginAt ? new Date(member.lastLoginAt).toLocaleString() : '-'}</td>
                <td className="space-x-2">
                  <Button size="sm" variant="outline" onClick={() => updateStaff(member.id, { role: member.role === 'CASHIER' ? 'MANAGER' : 'CASHIER' })}>Toggle Role</Button>
                  <Button size="sm" variant="outline" onClick={() => updateStaff(member.id, { status: member.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' })}>{member.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

