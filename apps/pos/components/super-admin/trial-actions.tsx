'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/super-admin/ui/button';

export function TrialActions({ id }: { id: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState('');
  const [error, setError] = useState('');
  async function run(action: 'extend' | 'activate' | 'expire') {
    setLoading(action);
    setError('');
    const response = await fetch(`/api/super-admin/admin/businesses/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(action === 'extend' ? { action, days: 14 } : { action }) });
    const result = await response.json();
    setLoading('');
    if (!response.ok) return setError(result.error || 'Unable to update trial.');
    router.refresh();
  }
  return <div><div className="flex gap-2"><Button variant="outline" size="sm" onClick={() => run('extend')} disabled={Boolean(loading)}>Extend</Button><Button size="sm" onClick={() => run('activate')} disabled={Boolean(loading)}>Activate</Button><Button variant="outline" size="sm" onClick={() => run('expire')} disabled={Boolean(loading)}>Expire</Button></div>{loading && <p className="mt-1 text-xs text-slate-500">Processing {loading}...</p>}{error && <p className="mt-1 max-w-xs text-xs text-red-600">{error}</p>}</div>;
}

