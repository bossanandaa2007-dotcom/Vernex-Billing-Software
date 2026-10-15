'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/super-admin/ui/button';

export function PaymentReviewActions({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  async function review(action: 'approve' | 'reject') {
    setBusy(true);
    try {
      const response = await fetch(`/api/super-admin/admin/payments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, reviewNote: note }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        alert(data.error || 'Unable to review payment.');
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="min-w-64 space-y-2">
      <input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Review note" className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-xs dark:border-slate-700 dark:bg-slate-950" />
      <div className="flex gap-2">
        <Button size="sm" disabled={busy} onClick={() => review('approve')}>Approve & activate</Button>
        <Button size="sm" variant="outline" disabled={busy} onClick={() => review('reject')}>Reject</Button>
      </div>
    </div>
  );
}
