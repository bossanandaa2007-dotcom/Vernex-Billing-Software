'use client';

import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/super-admin/ui/button';
import { BusinessEditDialog } from '@/components/super-admin/business-edit-dialog';

const MENU_WIDTH = 256; // matches w-64
const MENU_ESTIMATED_HEIGHT = 200;

export function BusinessActions({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number; openUp: boolean } | null>(null);
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState('');
  const [temporaryPassword, setTemporaryPassword] = useState('');

  // The row lives inside an overflow-x-auto container, which clips an absolutely
  // positioned dropdown (especially on the last rows). Rendering the menu in a
  // portal with fixed coordinates escapes that clipping; we also flip it upward
  // when there isn't enough room below the trigger.
  function toggleMenu() {
    if (open) return setOpen(false);
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) {
      const openUp = rect.bottom + MENU_ESTIMATED_HEIGHT > window.innerHeight;
      setMenuPos({
        top: openUp ? rect.top - 8 : rect.bottom + 8,
        left: Math.max(8, rect.right - MENU_WIDTH),
        openUp,
      });
    }
    setMessage('');
    setTemporaryPassword('');
    setOpen(true);
  }

  async function remove() {
    if (!window.confirm(`Permanently delete ${name} and all of its data? This cannot be undone.`)) return;
    setLoading('delete');
    const response = await fetch(`/api/super-admin/admin/businesses/${id}`, { method: 'DELETE' });
    const result = await response.json();
    setLoading('');
    if (!response.ok) return setMessage(result.error || 'Unable to delete business.');
    setOpen(false);
    router.push('/super-admin/businesses');
    router.refresh();
  }

  function edit() {
    setOpen(false);
    setMessage('');
    setEditing(true);
  }

  async function resetOwnerPassword() {
    if (!window.confirm(`Generate a temporary password for the owner of ${name}?`)) return;
    setLoading('password reset');
    const response = await fetch(`/api/super-admin/admin/businesses/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'reset-owner-password' }) });
    const result = await response.json();
    setLoading('');
    if (!response.ok) return setMessage(result.error || 'Unable to reset password.');
    setTemporaryPassword(result.temporaryPassword);
  }

  return (
    <>
      {editing && <BusinessEditDialog id={id} onClose={() => setEditing(false)} onSaved={() => router.refresh()} />}
      <Button ref={triggerRef} variant="ghost" size="icon" onClick={toggleMenu} aria-label={`Actions for ${name}`}><MoreHorizontal className="h-4 w-4" /></Button>
      {open && menuPos && createPortal(
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            style={{ position: 'fixed', top: menuPos.top, left: menuPos.left, transform: menuPos.openUp ? 'translateY(-100%)' : undefined }}
            className="z-50 w-64 rounded-md border border-slate-200 bg-white p-1 shadow-xl dark:border-slate-700 dark:bg-slate-900"
          >
            <a href={`/super-admin/businesses/${id}`} className="block rounded px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-800">View Details</a>
            <button className="w-full rounded px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800" onClick={edit}>Edit</button>
            <button className="w-full rounded px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800" onClick={resetOwnerPassword}>Reset Owner Password</button>
            <button className="w-full rounded px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30" onClick={remove}>Delete</button>
            {loading && <p className="px-3 py-2 text-xs text-slate-500">Processing {loading}...</p>}
            {message && <p className="px-3 py-2 text-xs text-red-600">{message}</p>}
            {temporaryPassword && <div className="m-2 rounded-md bg-amber-50 p-3 text-xs text-amber-900"><p className="font-semibold">Temporary Password</p><code className="mt-1 block break-all select-all">{temporaryPassword}</code><p className="mt-2">Share securely. It will not be shown again.</p></div>}
          </div>
        </>,
        document.body
      )}
    </>
  );
}
