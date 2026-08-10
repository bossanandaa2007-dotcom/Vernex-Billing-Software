'use client';

import { useMemo, useState } from 'react';
import { CheckCircle2, FileUp, Loader2, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/super-admin/ui/button';

type Row = {
  id?: string;
  productName: string;
  category: string;
  description?: string;
  price?: number | null;
  variant?: string;
  sku?: string;
  confidence?: number;
  duplicateAction?: 'skip' | 'update' | 'create' | 'merge';
  existingProductId?: string | null;
  duplicate?: { type: 'exact' | 'similar'; name: string; category: string; price: number | null };
  validationIssues?: string[];
};

export function MenuImportPanel({ businessId }: { businessId: string }) {
  const [fileName, setFileName] = useState('');
  const [fileType, setFileType] = useState('');
  const [strategy, setStrategy] = useState('');
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState('');
  const [message, setMessage] = useState('');

  const issues = useMemo(() => rows.reduce((sum, row) => sum + (row.validationIssues?.length ?? 0), 0), [rows]);
  const duplicates = useMemo(() => rows.filter((row) => row.duplicate).length, [rows]);

  async function analyze(file: File) {
    setLoading('analyzing');
    setMessage('');
    const formData = new FormData();
    formData.set('file', file);
    const response = await fetch(`/api/super-admin/admin/businesses/${businessId}/menu-import/analyze`, { method: 'POST', body: formData });
    const result = await response.json();
    setLoading('');
    if (!response.ok) return setMessage(result.error || 'Unable to analyze this menu.');
    setFileName(result.fileName);
    setFileType(result.fileType);
    setStrategy(result.strategy);
    setRows(result.rows);
  }

  async function confirmImport() {
    setLoading('importing');
    setMessage('');
    const response = await fetch(`/api/super-admin/admin/businesses/${businessId}/menu-import/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileName, fileType, rows }),
    });
    const result = await response.json();
    setLoading('');
    if (!response.ok) return setMessage(result.error || 'Unable to import this menu.');
    if (result.created === 0 && result.updated === 0) {
      setMessage(`No products imported. ${result.skipped} rows were skipped by action or validation.`);
    } else {
      setMessage(`Imported ${result.created} products, updated ${result.updated}, skipped ${result.skipped}.`);
    }
  }

  function update(index: number, patch: Partial<Row>) {
    setRows((current) => current.map((row, rowIndex) => rowIndex === index ? validate({ ...row, ...patch }) : row));
  }

  function renameCategory(from: string, to: string) {
    if (!to.trim()) return;
    setRows((current) => current.map((row) => row.category === from ? validate({ ...row, category: to.trim() }) : row));
  }

  function addRow() {
    setRows((current) => [...current, validate({ id: crypto.randomUUID(), productName: '', category: 'Uncategorized', price: null, duplicateAction: 'create' })]);
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col gap-4 border-b border-slate-200 p-5 dark:border-slate-800 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="font-semibold">Import Menu</h2>
          <p className="mt-1 text-sm text-slate-500">Upload a menu, review the extracted products, resolve duplicates, then confirm.</p>
        </div>
        <label className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-md bg-[#071c42] px-4 text-sm font-semibold text-white hover:bg-[#0d2b5f] dark:bg-amber-500 dark:text-slate-950">
          {loading === 'analyzing' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />}
          Upload File
          <input type="file" className="hidden" accept=".pdf,.csv,.xlsx,.xls,.png,.jpg,.jpeg,.webp" onChange={(event) => event.target.files?.[0] && analyze(event.target.files[0])} />
        </label>
      </div>
      {(fileName || message) && <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 px-5 py-3 text-sm dark:border-slate-800"><span>{fileName || 'Ready'}</span>{strategy && <span className="rounded-md bg-slate-100 px-2 py-1 text-xs dark:bg-slate-800">{strategy}</span>}{message && <span className={message.startsWith('Imported') ? 'text-emerald-600' : 'text-red-600'}>{message}</span>}</div>}
      {rows.length > 0 && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 p-5">
            <div className="text-sm text-slate-500">{rows.length} rows detected · {issues} validation issues · {duplicates} duplicate matches</div>
            <div className="flex gap-2"><Button variant="outline" size="sm" onClick={addRow}><Plus className="h-4 w-4" /> Row</Button><Button size="sm" disabled={loading === 'importing' || issues > 0} onClick={confirmImport}>{loading === 'importing' ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Confirm Import</Button></div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500 dark:bg-slate-950/40">
                <tr><th className="px-3 py-2">Product</th><th className="px-3 py-2">Category</th><th className="px-3 py-2">Price</th><th className="px-3 py-2">Variant</th><th className="px-3 py-2">Duplicate</th><th className="px-3 py-2">Issues</th><th className="px-3 py-2"></th></tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={row.id ?? index} className="border-t border-slate-100 dark:border-slate-800">
                    <td className="px-3 py-2"><input className="w-full rounded-md border border-slate-200 bg-transparent px-2 py-1 dark:border-slate-700" value={row.productName} onChange={(event) => update(index, { productName: event.target.value })} /></td>
                    <td className="px-3 py-2"><input className="w-full rounded-md border border-slate-200 bg-transparent px-2 py-1 dark:border-slate-700" value={row.category} onChange={(event) => update(index, { category: event.target.value })} onBlur={(event) => renameCategory(row.category, event.target.value)} /></td>
                    <td className="px-3 py-2"><input className="w-28 rounded-md border border-slate-200 bg-transparent px-2 py-1 dark:border-slate-700" type="number" value={row.price ?? ''} onChange={(event) => update(index, { price: event.target.value === '' ? null : Number(event.target.value) })} /></td>
                    <td className="px-3 py-2"><input className="w-full rounded-md border border-slate-200 bg-transparent px-2 py-1 dark:border-slate-700" value={row.variant ?? ''} onChange={(event) => update(index, { variant: event.target.value })} /></td>
                    <td className="px-3 py-2">{row.duplicate ? <select className="rounded-md border border-slate-200 bg-transparent px-2 py-1 dark:border-slate-700" value={row.duplicateAction ?? 'create'} onChange={(event) => update(index, { duplicateAction: event.target.value as Row['duplicateAction'] })}><option value="skip">Skip</option><option value="update">Update Existing</option><option value="create">Create New</option><option value="merge">Merge</option></select> : <span className="text-slate-400">New</span>}<p className="mt-1 text-xs text-slate-400">{row.duplicate ? `${row.duplicate.type}: ${row.duplicate.name}` : ''}</p></td>
                    <td className="max-w-52 px-3 py-2 text-xs text-red-600">{row.validationIssues?.join(' ')}</td>
                    <td className="px-3 py-2"><button aria-label="Delete row" className="rounded-md p-2 text-red-600 hover:bg-red-50" onClick={() => setRows((current) => current.filter((_, rowIndex) => rowIndex !== index))}><Trash2 className="h-4 w-4" /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}

function validate(row: Row): Row {
  const validationIssues = [];
  if (!row.productName.trim()) validationIssues.push('Product name is missing.');
  if (row.price === null || row.price === undefined || Number.isNaN(row.price)) validationIssues.push('Price is missing or invalid.');
  if (!row.category.trim()) validationIssues.push('Category is missing.');
  return { ...row, validationIssues };
}
