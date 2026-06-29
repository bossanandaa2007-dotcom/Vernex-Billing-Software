'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatMoney } from '@/lib/currency';

const reportTypes = ['sales', 'payments', 'products', 'customers', 'inventory', 'returns'] as const;
const loadTypes = ['sales', 'payments', 'products', 'customers', 'inventory', 'returns', 'staff'] as const;
const presets = [
  ['today', 'Today'],
  ['yesterday', 'Yesterday'],
  ['last7', 'Last 7 Days'],
  ['month', 'This Month'],
  ['custom', 'Custom'],
] as const;

export function ReportsDashboard() {
  const [preset, setPreset] = useState('today');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [reports, setReports] = useState<any>({});
  const [error, setError] = useState('');

  const query = useMemo(() => {
    const params = new URLSearchParams({ preset });
    if (preset === 'custom') {
      if (from) params.set('from', from);
      if (to) params.set('to', to);
    }
    return params.toString();
  }, [preset, from, to]);

  useEffect(() => {
    setError('');
    Promise.all(loadTypes.map((type) => fetch(`/api/reports/${type}?${query}`).then(async (res) => {
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Unable to load ${type} report.`);
      return [type, data];
    })))
      .then((entries) => setReports(Object.fromEntries(entries)))
      .catch((err) => setError(err.message));
  }, [query]);

  const currency = reports.sales?.currency ?? 'INR';
  const paymentMethods = reports.payments?.country === 'India' ? ['CASH', 'UPI', 'CARD', 'CREDIT'] : ['CASH', 'CARD', 'ONLINE', 'CREDIT'];

  const exportHref = (type: string) => `/api/reports/export?type=${type}&${query}`;

  if (error) return <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-700">{error}</div>;

  return (
    <div className="w-full space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>Report Filters</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <select className="h-10 rounded-md border border-vernex-border bg-white px-3 text-sm dark:border-[#1E335F] dark:bg-vernex-dark dark:text-white" value={preset} onChange={(e) => setPreset(e.target.value)}>
            {presets.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          {preset === 'custom' && (
            <>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" />
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" />
            </>
          )}
          <div className="ml-auto flex flex-wrap gap-2">
            {reportTypes.map((type) => (
              <Button key={type} variant="outline" asChild size="sm">
                <a href={exportHref(type)}>Export {type}</a>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-4">
        <Metric label="Sales Overview" value={formatMoney(reports.sales?.summary?.netTotal, currency)} sub={`${reports.sales?.summary?.billCount ?? 0} completed bills`} />
        <Metric label="Payment Collection" value={formatMoney(reports.payments?.netCollection, currency)} sub={`Refunds ${formatMoney(reports.payments?.refundTotal, currency)}`} />
        <Metric label="Top Product" value={reports.products?.topProduct?.productName ?? 'No sales'} sub={`${reports.products?.topProduct?.quantitySold ?? 0} sold`} />
        <Metric label="Credit Pending" value={formatMoney(reports.customers?.summary?.pendingCredit, currency)} sub={`${reports.customers?.summary?.creditCustomers ?? 0} credit customers`} />
      </div>

      <Section title="Payment Report">
        <div className="grid gap-3 md:grid-cols-4">
          {paymentMethods.map((method) => <Metric key={method} label={method} value={formatMoney(reports.payments?.totals?.[method], currency)} />)}
        </div>
      </Section>

      <Section title="Product Report">
        <SimpleTable headers={['Product', 'Qty Sold', 'Revenue', 'Returned']} rows={(reports.products?.products ?? []).slice(0, 8).map((item: any) => [item.productName, item.quantitySold, formatMoney(item.revenue, currency), item.returnedQuantity])} />
      </Section>

      <Section title="Customer Report">
        <SimpleTable headers={['Customer', 'Bills', 'Spent', 'Pending Credit', 'Last Purchase']} rows={(reports.customers?.customers ?? []).slice(0, 8).map((item: any) => [item.name, item.billCount, formatMoney(item.totalSpent, currency), formatMoney(item.pendingCredit, currency), item.lastPurchaseDate ? new Date(item.lastPurchaseDate).toLocaleDateString() : '-'])} />
      </Section>

      <Section title="Inventory Report">
        <div className="grid gap-4 lg:grid-cols-2">
          <SimpleTable headers={['Movement', 'Quantity']} rows={Object.entries(reports.inventory?.summary ?? {}).map(([type, qty]) => [type, qty as number])} />
          <SimpleTable headers={['Low Stock Product', 'Stock']} rows={(reports.inventory?.lowStock ?? []).slice(0, 8).map((item: any) => [item.name, item.stock])} />
        </div>
      </Section>

      <Section title="Returns Report">
        <SimpleTable headers={['Bill', 'Refund', 'Method', 'Items', 'Reason']} rows={(reports.returns?.returns ?? []).slice(0, 8).map((item: any) => [item.originalBillNumber, formatMoney(item.refundAmount, currency), item.refundMethod, item.itemCount, item.reason])} />
      </Section>

      <Section title="Staff Report">
        <SimpleTable headers={['Staff', 'Role', 'Sales', 'Returns', 'Stock Changes', 'Settings Changes']} rows={(reports.staff?.staff ?? []).slice(0, 8).map((item: any) => [item.userName, item.role, item.sales, item.returns, item.stockAdjustments, item.settingsChanges])} />
      </Section>
    </div>
  );
}

function Metric({ label, value, sub }: { label: string; value: any; sub?: string }) {
  return <div className="rounded-xl border border-vernex-border bg-white p-4 shadow-sm dark:border-[#1E335F] dark:bg-vernex-navy"><p className="text-xs font-semibold uppercase tracking-wide text-vernex-muted dark:text-slate-300">{label}</p><p className="mt-2 text-xl font-bold text-vernex-navy dark:text-white">{value ?? '-'}</p>{sub && <p className="mt-1 text-xs text-vernex-muted dark:text-slate-300">{sub}</p>}</div>;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <Card><CardHeader><CardTitle>{title}</CardTitle></CardHeader><CardContent>{children}</CardContent></Card>;
}

function SimpleTable({ headers, rows }: { headers: string[]; rows: any[][] }) {
  return <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left text-vernex-muted dark:text-slate-300">{headers.map((header) => <th key={header} className="p-2">{header}</th>)}</tr></thead><tbody>{rows.length ? rows.map((row, index) => <tr key={index} className="border-b border-vernex-border dark:border-[#1E335F]">{row.map((cell, cellIndex) => <td key={cellIndex} className="p-2">{cell}</td>)}</tr>) : <tr><td colSpan={headers.length} className="p-4 text-center text-vernex-muted">No data for this range.</td></tr>}</tbody></table></div>;
}
