'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function BusinessActions({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState('');
  const [temporaryPassword, setTemporaryPassword] = useState('');

  async function action(type: 'activate' | 'suspend' | 'expire' | 'extend') {
    if ((type === 'suspend' || type === 'expire') && !window.confirm(`${type === 'suspend' ? 'Suspend' : 'Expire'} ${name}?`)) return;
    setLoading(type);
    setMessage('');
    const response = await fetch(`/api/admin/businesses/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(type === 'extend' ? { action: type, days: 14 } : { action: type }),
    });
    const result = await response.json();
    setLoading('');
    if (!response.ok) return setMessage(result.error || 'Unable to update business.');
    setOpen(false);
    router.refresh();
  }

  async function remove() {
    if (!window.confirm(`Permanently delete ${name} and all of its data? This cannot be undone.`)) return;
    setLoading('delete');
    const response = await fetch(`/api/admin/businesses/${id}`, { method: 'DELETE' });
    const result = await response.json();
    setLoading('');
    if (!response.ok) return setMessage(result.error || 'Unable to delete business.');
    router.push('/businesses');
    router.refresh();
  }

  async function edit() {
    const nextName = window.prompt('Business name', name)?.trim();
    if (!nextName || nextName === name) return;
    setLoading('edit');
    const response = await fetch(`/api/admin/businesses/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'edit', name: nextName }) });
    const result = await response.json();
    setLoading('');
    if (!response.ok) return setMessage(result.error || 'Unable to edit business.');
    router.refresh();
  }

  async function resetOwnerPassword() {
    if (!window.confirm(`Generate a temporary password for the owner of ${name}?`)) return;
    setLoading('password reset');
    const response = await fetch(`/api/admin/businesses/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'reset-owner-password' }) });
    const result = await response.json();
    setLoading('');
    if (!response.ok) return setMessage(result.error || 'Unable to reset password.');
    setTemporaryPassword(result.temporaryPassword);
  }

  return <div className="relative"><Button variant="ghost" size="icon" onClick={() => setOpen((value) => !value)} aria-label={`Actions for ${name}`}><MoreHorizontal className="h-4 w-4" /></Button>{open && <div className="absolute right-0 top-11 z-10 w-64 rounded-md border border-slate-200 bg-white p-1 shadow-xl dark:border-slate-700 dark:bg-slate-900"><a href={`/businesses/${id}`} className="block rounded px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-800">View Details</a><button className="w-full rounded px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800" onClick={edit}>Edit</button><button className="w-full rounded px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800" onClick={resetOwnerPassword}>Reset Owner Password</button><button className="w-full rounded px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800" onClick={() => action('activate')}>Activate</button><button className="w-full rounded px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800" onClick={() => action('extend')}>Extend Trial 14 Days</button><button className="w-full rounded px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800" onClick={() => action('suspend')}>Suspend</button><button className="w-full rounded px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800" onClick={() => action('expire')}>Expire Trial</button><button className="w-full rounded px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30" onClick={remove}>Delete</button>{loading && <p className="px-3 py-2 text-xs text-slate-500">Processing {loading}...</p>}{message && <p className="px-3 py-2 text-xs text-red-600">{message}</p>}{temporaryPassword && <div className="m-2 rounded-md bg-amber-50 p-3 text-xs text-amber-900"><p className="font-semibold">Temporary Password</p><code className="mt-1 block break-all select-all">{temporaryPassword}</code><p className="mt-2">Share securely. It will not be shown again.</p></div>}</div>}</div>;
}
