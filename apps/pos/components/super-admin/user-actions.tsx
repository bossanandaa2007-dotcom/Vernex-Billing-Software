'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/super-admin/ui/button';

export function UserActions({ id, name, status, role }: { id: string; name: string; status: string; role: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [temporaryPassword, setTemporaryPassword] = useState('');

  async function run(action: 'reset-password' | 'disable' | 'enable') {
    if (action !== 'reset-password' && !window.confirm(`${action === 'enable' ? 'Enable' : 'Disable'} ${name}?`)) return;
    setMessage('Processing...');
    const response = await fetch(`/api/super-admin/admin/users/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }) });
    const result = await response.json();
    if (!response.ok) return setMessage(result.error || 'Unable to update user.');
    setMessage('Changes saved successfully.');
    if (result.temporaryPassword) setTemporaryPassword(result.temporaryPassword);
    router.refresh();
  }

  async function remove() {
    if (!window.confirm(`Delete ${name}? This cannot be undone.`)) return;
    const response = await fetch(`/api/super-admin/admin/users/${id}`, { method: 'DELETE' });
    const result = await response.json();
    if (!response.ok) return setMessage(result.error || 'Unable to delete user.');
    router.refresh();
  }

  return <div className="relative"><Button variant="ghost" size="icon" onClick={() => setOpen((value) => !value)} aria-label={`Actions for ${name}`}><MoreHorizontal className="h-4 w-4" /></Button>{open && <div className="absolute right-0 top-11 z-10 w-64 rounded-md border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-700 dark:bg-slate-900"><button className="w-full rounded px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800" onClick={() => run('reset-password')}>Reset Password</button><button className="w-full rounded px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800" onClick={() => run(status === 'ACTIVE' ? 'disable' : 'enable')}>{status === 'ACTIVE' ? 'Disable' : 'Enable'}</button>{role !== 'OWNER' && <button className="w-full rounded px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30" onClick={remove}>Delete</button>}{message && <p className="px-3 py-2 text-xs text-slate-500">{message}</p>}{temporaryPassword && <div className="m-2 rounded-md bg-amber-50 p-3 text-xs text-amber-900"><p className="font-semibold">Temporary Password</p><code className="mt-1 block break-all select-all">{temporaryPassword}</code><p className="mt-2">Share securely. It will not be shown again.</p></div>}</div>}</div>;
}

