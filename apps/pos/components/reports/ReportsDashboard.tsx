'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { formatMoney } from '@/lib/currency';
import {
  AlertCircle,
  ArrowDownToLine,
  Banknote,
  BarChart3,
  CalendarDays,
  Package,
  RefreshCw,
  RotateCcw,
  TrendingUp,
  Users,
  WalletCards,
} from 'lucide-react';
import { LoadingState } from '@/components/ui/loading-state';
import { EmptyState } from '@/components/ui/empty-state';
import { useBusinessAccess } from '@/hooks/use-business-access';

const reportTypes = ['sales', 'payments', 'products', 'customers', 'returns'] as const;
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
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const { enabledModules } = useBusinessAccess();
  const availableReportTypes = useMemo(() => reportTypes.filter((type) =>
    type === 'sales' ||
    (type === 'payments' && enabledModules?.includes('finance')) ||
    (type === 'products' && enabledModules?.includes('products')) ||
    (type === 'customers' && enabledModules?.includes('customers')) ||
    (type === 'returns' && enabledModules?.includes('returns_refunds'))
  ), [enabledModules]);

  const query = useMemo(() => {
    const params = new URLSearchParams({ preset });
    if (preset === 'custom') {
      if (from) params.set('from', from);
      if (to) params.set('to', to);
    }
    return params.toString();
  }, [preset, from, to]);

  useEffect(() => {
    if (!enabledModules.length) {
      setReports({});
      setLoading(false);
      return;
    }
    setError('');
    setLoading(true);
    Promise.all(
      availableReportTypes.map((type) =>
        fetch(`/api/reports/${type}?${query}`).then(async (res) => {
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || `Unable to load ${type} report.`);
          return [type, data];
        })
      )
    )
      .then((entries) => setReports(Object.fromEntries(entries)))
      .catch(() => setError('Unable to load reports. Please check your connection and try again.'))
      .finally(() => setLoading(false));
  }, [query, refreshKey, enabledModules, availableReportTypes]);

  const currency = reports.sales?.currency ?? 'INR';
  const paymentMethods = reports.payments?.country === 'India' ? ['CASH', 'UPI', 'CARD', 'CREDIT'] : ['CASH', 'CARD', 'ONLINE', 'CREDIT'];
  const exportHref = (type: string) => `/api/reports/export?type=${type}&${query}`;
  const selectedLabel = presets.find(([value]) => value === preset)?.[1] ?? 'Today';

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300" role="alert">
        <div className="flex items-center gap-2 font-semibold"><AlertCircle className="h-5 w-5" /> Reports unavailable</div>
        <p className="mt-1 text-sm">{error}</p>
        <Button className="mt-4" variant="outline" onClick={() => setRefreshKey((value) => value + 1)}>Try Again</Button>
      </div>
    );
  }

  if (loading && !Object.keys(reports).length) {
    return <Card className="border-vernex-border/80 shadow-sm"><LoadingState label="Preparing reports..." /></Card>;
  }

  return (
    <div className="w-full space-y-5">
      <Card className="overflow-hidden border-vernex-border/80 shadow-sm">
        <CardHeader className="border-b border-vernex-border bg-white/90 pb-4 dark:border-[#1E335F] dark:bg-vernex-navy">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart3 className="h-5 w-5 text-emerald-600" />
                Report Center
              </CardTitle>
              <p className="mt-1 text-xs text-vernex-muted dark:text-slate-400">
                Viewing {selectedLabel.toLowerCase()} performance across sales, payments, products, and operations.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {presets.map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setPreset(value)}
                  className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                    preset === value
                      ? 'border-vernex-navy bg-vernex-navy text-white dark:border-vernex-gold dark:bg-vernex-gold dark:text-vernex-dark'
                      : 'border-vernex-border bg-white text-vernex-navy hover:border-vernex-gold hover:bg-vernex-gold/10 dark:border-[#1E335F] dark:bg-vernex-dark dark:text-white'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex flex-wrap items-end gap-3">
              {preset === 'custom' && (
                <>
                  <div>
                    <label className="text-xs font-semibold text-vernex-muted dark:text-slate-400">From</label>
                    <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="mt-1 w-40" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-vernex-muted dark:text-slate-400">To</label>
                    <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="mt-1 w-40" />
                  </div>
                </>
              )}
              <Badge variant="outline" className="rounded-full px-3 py-1">
                <CalendarDays className="mr-1.5 h-3.5 w-3.5" />
                {reports.sales?.range?.label ?? selectedLabel}
              </Badge>
              {loading && (
                <Badge variant="secondary" className="rounded-full px-3 py-1">
                  <RefreshCw className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Updating
                </Badge>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {availableReportTypes.map((type) => (
                <Button key={type} variant="outline" asChild size="sm" className="rounded-xl">
                  <a href={exportHref(type)}>
                    <ArrowDownToLine className="mr-2 h-4 w-4" />
                    Export {type.charAt(0).toUpperCase() + type.slice(1)} CSV
                  </a>
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Metric icon={<TrendingUp />} label="Sales Overview" value={formatMoney(reports.sales?.summary?.netTotal, currency)} sub={`${reports.sales?.summary?.billCount ?? 0} completed bills`} tone="emerald" />
        {enabledModules?.includes('finance') && <Metric icon={<WalletCards />} label="Payment Collection" value={formatMoney(reports.payments?.netCollection, currency)} sub={`Refunds ${formatMoney(reports.payments?.refundTotal, currency)}`} tone="blue" />}
        {enabledModules?.includes('products') && <Metric icon={<Package />} label="Top Product" value={reports.products?.topProduct?.productName ?? 'No sales'} sub={`${reports.products?.topProduct?.quantitySold ?? 0} sold`} tone="amber" />}
        {enabledModules?.includes('customers') && <Metric icon={<Users />} label="Credit Pending" value={formatMoney(reports.customers?.summary?.pendingCredit, currency)} sub={`${reports.customers?.summary?.creditCustomers ?? 0} credit customers`} tone="rose" />}
      </div>

      {enabledModules?.includes('finance') && <Section title="Payment Collection" icon={<Banknote className="h-5 w-5" />}>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {paymentMethods.map((method) => (
            <PaymentTile key={method} label={method} value={formatMoney(reports.payments?.totals?.[method], currency)} />
          ))}
        </div>
      </Section>}

      <div className="grid gap-5 xl:grid-cols-[1.25fr_0.75fr]">
        {enabledModules?.includes('products') && <Section title="Product Report" icon={<Package className="h-5 w-5" />}>
          <SimpleTable headers={['Product', 'Qty Sold', 'Revenue', 'Returned']} rows={(reports.products?.products ?? []).slice(0, 8).map((item: any) => [item.productName, item.quantitySold, formatMoney(item.revenue, currency), item.returnedQuantity])} />
        </Section>}

        {enabledModules?.includes('customers') && <Section title="Customer Report" icon={<Users className="h-5 w-5" />}>
          <SimpleTable compact headers={['Customer', 'Bills', 'Spent']} rows={(reports.customers?.customers ?? []).slice(0, 8).map((item: any) => [item.name, item.billCount, formatMoney(item.totalSpent, currency)])} />
        </Section>}
      </div>

      {enabledModules?.includes('returns_refunds') && <Section title="Returns Report" icon={<RotateCcw className="h-5 w-5" />}>
        <SimpleTable headers={['Bill', 'Refund', 'Method', 'Items']} rows={(reports.returns?.returns ?? []).slice(0, 8).map((item: any) => [item.originalBillNumber, formatMoney(item.refundAmount, currency), item.refundMethod, item.itemCount])} />
      </Section>}
    </div>
  );
}

function Metric({ label, value, sub, icon, tone }: { label: string; value: any; sub?: string; icon: React.ReactNode; tone: 'emerald' | 'blue' | 'amber' | 'rose' }) {
  const tones = {
    emerald: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
    blue: 'bg-blue-500/10 text-blue-700 dark:text-blue-300',
    amber: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
    rose: 'bg-rose-500/10 text-rose-700 dark:text-rose-300',
  };

  return (
    <div className="rounded-2xl border border-vernex-border bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-[#1E335F] dark:bg-vernex-navy">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-vernex-muted dark:text-slate-300">{label}</p>
          <p className="mt-3 text-2xl font-black text-vernex-navy dark:text-white">{value ?? '-'}</p>
        </div>
        <div className={`grid h-10 w-10 place-items-center rounded-xl ${tones[tone]}`}>
          {icon}
        </div>
      </div>
      {sub && <p className="mt-2 text-xs text-vernex-muted dark:text-slate-300">{sub}</p>}
    </div>
  );
}

function PaymentTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-vernex-border bg-vernex-surface p-4 dark:border-[#1E335F] dark:bg-vernex-dark">
      <p className="text-xs font-semibold uppercase text-vernex-muted dark:text-slate-400">{label}</p>
      <p className="mt-2 text-xl font-black text-vernex-navy dark:text-white">{value}</p>
    </div>
  );
}

function Section({ title, children, icon }: { title: string; children: React.ReactNode; icon: React.ReactNode }) {
  return (
    <Card className="overflow-hidden border-vernex-border/80 shadow-sm">
      <CardHeader className="border-b border-vernex-border bg-white/90 pb-4 dark:border-[#1E335F] dark:bg-vernex-navy">
        <CardTitle className="flex items-center gap-2 text-base">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
            {icon}
          </span>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">{children}</CardContent>
    </Card>
  );
}

function SimpleTable({ headers, rows, compact = false }: { headers: string[]; rows: any[][]; compact?: boolean }) {
  if (!rows.length) {
    return (
      <EmptyState
        icon={<BarChart3 className="h-7 w-7" />}
        title="No report data yet"
        description="Data for the selected period will appear here when activity is recorded."
        className="min-h-48"
      />
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-vernex-surface text-left text-xs uppercase text-vernex-muted dark:border-[#1E335F] dark:bg-vernex-dark dark:text-slate-300">
            {headers.map((header) => <th key={header} className="px-3 py-3 font-bold">{header}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} className="border-b border-vernex-border transition hover:bg-vernex-surface/70 dark:border-[#1E335F] dark:hover:bg-vernex-dark/70">
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className={`${compact ? 'px-3 py-3' : 'px-3 py-3.5'} ${cellIndex === 0 ? 'font-semibold text-vernex-navy dark:text-white' : ''}`}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
