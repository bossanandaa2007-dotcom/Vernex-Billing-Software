'use client';

import { useEffect, useState } from 'react';
import { Loader2, Save } from 'lucide-react';
import { MODULE_GROUPS, MODULE_KEYS, type ModuleKey } from '@/lib/super-admin/modules';
import { Button } from '@/components/super-admin/ui/button';
import { Card } from '@/components/super-admin/ui/card';

export function BusinessModulesForm({ businessId }: { businessId: string }) {
  const [modules, setModules] = useState<Record<ModuleKey, boolean>>(
    Object.fromEntries(MODULE_KEYS.map((key) => [key, false])) as Record<ModuleKey, boolean>
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/super-admin/admin/businesses/${businessId}/modules`, { cache: 'no-store' })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error);
        setModules(Object.fromEntries(result.modules.map((item: { key: ModuleKey; enabled: boolean }) => [item.key, item.enabled])) as Record<ModuleKey, boolean>);
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : 'Unable to load modules.'))
      .finally(() => setLoading(false));
  }, [businessId]);

  async function save() {
    setSaving(true); setMessage(''); setError('');
    const response = await fetch(`/api/super-admin/admin/businesses/${businessId}/modules`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ modules: MODULE_KEYS.map((key) => ({ key, enabled: modules[key] })) }),
    });
    const result = await response.json().catch(() => null);
    setSaving(false);
    if (!response.ok) return setError(result?.error || 'Unable to save modules.');
    setMessage('Module settings saved.');
  }

  if (loading) return <Card className="grid min-h-52 place-items-center"><Loader2 className="h-6 w-6 animate-spin text-amber-600" /></Card>;
  return <div className="space-y-5">
    {MODULE_GROUPS.map((group) => <Card key={group.label} className="p-5">
      <h2 className="font-semibold">{group.label}</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {group.modules.map(([key, label]) => <label key={key} className="flex min-h-14 cursor-pointer items-center justify-between gap-4 rounded-md border border-slate-200 px-4 py-3 dark:border-slate-800">
          <span className="text-sm font-medium">{label}</span>
          <span className="relative inline-flex">
            <input className="peer sr-only" type="checkbox" checked={modules[key]} onChange={(event) => setModules((current) => ({ ...current, [key]: event.target.checked }))} />
            <span className="h-6 w-11 rounded-full bg-slate-300 transition peer-checked:bg-amber-500 peer-focus-visible:ring-2 peer-focus-visible:ring-amber-500 peer-focus-visible:ring-offset-2 dark:bg-slate-700" />
            <span className="absolute left-1 top-1 h-4 w-4 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
          </span>
        </label>)}
      </div>
    </Card>)}
    {error && <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {message && <p role="status" className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p>}
    <div className="sticky bottom-4 flex justify-end"><Button onClick={save} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{saving ? 'Saving...' : 'Save Modules'}</Button></div>
  </div>;
}
