'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowRight, Banknote, Boxes, CheckCircle2, CreditCard, IndianRupee, Loader2, RefreshCw, ReceiptText, RotateCcw, ShoppingCart, Sparkles, Trophy, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatMoney } from '@/lib/currency';
import { getTotal } from '@/data/stock';
import type { DashboardPeriod } from '@/data/stock';
import { cn } from '@/lib/utils';

const empty = {
  totalProducts: 0,
  lowStockItems: 0,
  todayBills: 0,
  todayRevenue: 0,
  netRevenueToday: 0,
  cashSales: 0,
  upiSales: 0,
  cardSales: 0,
  creditSales: 0,
  onlineSales: 0,
  pendingCredit: 0,
  returnsToday: 0,
  refundTotalToday: 0,
  topSellingProduct: 'No sales yet',
  activeCustomers: 0,
  itemsSold: 0,
  currency: 'INR',
  period: 'today' as DashboardPeriod,
};

type DashboardData = typeof empty;
type ViewMode = 'overview' | 'payments' | 'attention';

const viewModes: Array<{ label: string; value: ViewMode }> = [
  { label: 'Overview', value: 'overview' },
  { label: 'Payments', value: 'payments' },
  { label: 'Attention', value: 'attention' },
];

const periodOptions: Array<{ label: string; value: DashboardPeriod; title: string; shortLabel: string }> = [
  { label: 'Today', value: 'today', title: "Today's Billing Command Center", shortLabel: 'Today' },
  { label: 'Week', value: 'week', title: 'Weekly Billing Command Center', shortLabel: 'This Week' },
  { label: 'Month', value: 'month', title: 'Monthly Billing Command Center', shortLabel: 'This Month' },
];

export function Dashboard() {
  const [data, setData] = useState<DashboardData>(empty);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [view, setView] = useState<ViewMode>('overview');
  const [period, setPeriod] = useState<DashboardPeriod>('today');
  const activePeriod = periodOptions.find((item) => item.value === period) ?? periodOptions[0];

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const nextData = await getTotal(period);
      setData(nextData);
    } catch {
      setError('Unable to refresh dashboard right now.');
      setData(empty);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => { load(); }, [load]);

  const paymentRows = useMemo(() => [
    { label: 'Cash', value: data.cashSales, icon: Banknote, color: 'bg-emerald-500' },
    { label: 'UPI', value: data.upiSales, icon: IndianRupee, color: 'bg-sky-500' },
    { label: 'Card', value: data.cardSales, icon: CreditCard, color: 'bg-violet-500' },
    { label: 'Credit', value: data.creditSales, icon: ReceiptText, color: 'bg-amber-500' },
    { label: 'Online', value: data.onlineSales, icon: ShoppingCart, color: 'bg-rose-500' },
  ], [data]);
  const maxPayment = Math.max(...paymentRows.map((item) => item.value), 1);
  const isOperational = !error;

  const kpis = [
    { label: 'Net Revenue', value: formatMoney(data.netRevenueToday, data.currency), detail: `${formatMoney(data.todayRevenue, data.currency)} gross`, icon: IndianRupee },
    { label: `Bills ${activePeriod.shortLabel}`, value: data.todayBills.toString(), detail: `${data.itemsSold} items sold`, icon: ReceiptText },
    { label: 'Pending Credit', value: formatMoney(data.pendingCredit, data.currency), detail: 'Open receivables', icon: CreditCard },
    { label: 'Active Customers', value: data.activeCustomers.toString(), detail: `${data.totalProducts} products listed`, icon: Users },
  ];

  return (
    <section className="space-y-5">
      <div className="rounded-xl border border-vernex-border bg-white p-4 shadow-sm sm:p-5 dark:border-[#1E335F] dark:bg-vernex-navy">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-emerald-600 dark:text-vernex-gold">
              <Sparkles className="h-4 w-4" />
              Live workspace
            </div>
            <h2 className="mt-1 text-xl font-bold leading-tight text-vernex-navy sm:text-2xl dark:text-white">{activePeriod.title}</h2>
            {loading && (
              <p className="mt-1 text-sm font-normal leading-5 text-vernex-muted dark:text-slate-300">
                Loading {activePeriod.label.toLowerCase()} performance...
              </p>
            )}
          </div>
          <div className="flex w-full flex-wrap items-center gap-2 lg:w-auto">
            <div className="grid w-full grid-cols-3 rounded-lg border border-vernex-border bg-vernex-surface p-1 sm:flex sm:w-auto dark:border-[#1E335F] dark:bg-vernex-dark">
              {periodOptions.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setPeriod(item.value)}
                  className={cn(
                    'h-10 rounded-md px-2 text-sm font-medium transition sm:h-8 sm:px-3',
                    period === item.value
                      ? 'bg-vernex-navy text-white shadow-sm dark:bg-vernex-gold dark:text-vernex-dark'
                      : 'text-vernex-navy hover:bg-white dark:text-white dark:hover:bg-white/10'
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
            {viewModes.map((item) => (
              <Button className="min-h-11 flex-1 sm:min-h-9 sm:flex-none" key={item.value} size="sm" variant={view === item.value ? 'default' : 'outline'} onClick={() => setView(item.value)}>
                {item.label}
              </Button>
            ))}
            <Button className="h-11 w-11 sm:h-9 sm:w-9" size="icon" variant="outline" title="Refresh dashboard" onClick={load} disabled={loading}>
              <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
            </Button>
          </div>
        </div>
        {error && <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-600">{error}</p>}
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {kpis.map((item) => (
          <div key={item.label} className="rounded-xl border border-vernex-border bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-500 hover:shadow-md dark:border-[#1E335F] dark:bg-vernex-navy">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-medium uppercase leading-5 text-vernex-muted dark:text-slate-400">{item.label}</p>
              <item.icon className="h-5 w-5 text-emerald-600 dark:text-vernex-gold" />
            </div>
            <p className="mt-3 text-2xl font-bold leading-tight text-vernex-navy dark:text-white">{loading ? <Loader2 className="h-6 w-6 animate-spin" /> : item.value}</p>
            <p className="mt-1 text-sm text-vernex-muted dark:text-slate-400">{item.detail}</p>
          </div>
        ))}
      </div>

      {view === 'overview' && (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(300px,0.6fr)]">
          <div className="rounded-xl border border-vernex-border bg-white p-5 shadow-sm dark:border-[#1E335F] dark:bg-vernex-navy">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-lg font-semibold text-vernex-navy dark:text-white">Sales Flow</h3>
                <p className="text-sm text-vernex-muted dark:text-slate-300">A quick read on money, bills, and returns for {activePeriod.shortLabel.toLowerCase()}.</p>
              </div>
              <Button asChild variant="outline" size="sm" className="min-h-11 w-full sm:min-h-9 sm:w-auto">
                <Link href="/orders">Open POS <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-3">
              <MetricPanel label="Gross Revenue" value={formatMoney(data.todayRevenue, data.currency)} />
              <MetricPanel label={`Refunds ${activePeriod.shortLabel}`} value={`${data.returnsToday} / ${formatMoney(data.refundTotalToday, data.currency)}`} />
              <MetricPanel label="Top Product" value={data.topSellingProduct} />
            </div>
          </div>

          <div className="rounded-xl border border-vernex-border bg-white p-5 shadow-sm dark:border-[#1E335F] dark:bg-vernex-navy">
            <h3 className="text-lg font-semibold text-vernex-navy dark:text-white">Quick Actions</h3>
            <div className="mt-4 grid gap-2">
              <QuickLink href="/orders" icon={ShoppingCart} label="Start Billing" />
              <QuickLink href="/records" icon={ReceiptText} label="Review Sales" />
              <QuickLink href="/product" icon={Boxes} label="Manage Products" />
            </div>
          </div>
        </div>
      )}

      {view === 'payments' && (
        <div className="rounded-xl border border-vernex-border bg-white p-5 shadow-sm dark:border-[#1E335F] dark:bg-vernex-navy">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-vernex-navy dark:text-white">Payment Mix</h3>
              <p className="text-sm text-vernex-muted dark:text-slate-300">Compare {activePeriod.shortLabel.toLowerCase()} payment channels at a glance.</p>
            </div>
            <p className="text-sm font-semibold text-vernex-navy dark:text-white">{formatMoney(data.todayRevenue, data.currency)} collected</p>
          </div>
          <div className="mt-5 space-y-4">
            {paymentRows.map((item) => (
              <div key={item.label}>
                <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                  <div className="flex items-center gap-2 font-semibold text-vernex-navy dark:text-white">
                    <item.icon className="h-4 w-4 text-emerald-600 dark:text-vernex-gold" />
                    {item.label}
                  </div>
                  <span>{formatMoney(item.value, data.currency)}</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-vernex-surface dark:bg-vernex-dark">
                  <div className={cn('h-full rounded-full transition-all', item.color)} style={{ width: `${Math.max(4, (item.value / maxPayment) * 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {view === 'attention' && (
        <div className="grid gap-5 lg:grid-cols-3">
          <AttentionCard
            icon={isOperational ? CheckCircle2 : AlertTriangle}
            title={isOperational ? 'Operational' : 'Needs Check'}
            value={isOperational ? 'Billing routes ready' : 'Dashboard refresh failed'}
            tone={isOperational ? 'good' : 'warn'}
          />
          <AttentionCard icon={AlertTriangle} title="Low Stock" value={`${data.lowStockItems} items need review`} tone={data.lowStockItems ? 'warn' : 'good'} />
          <AttentionCard icon={RotateCcw} title="Returns" value={`${data.returnsToday} returns ${activePeriod.shortLabel.toLowerCase()}`} tone={data.returnsToday ? 'warn' : 'good'} />
        </div>
      )}
    </section>
  );
}

function MetricPanel({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-vernex-border bg-vernex-surface p-4 dark:border-[#1E335F] dark:bg-vernex-dark">
      <p className="text-xs font-medium uppercase leading-5 text-vernex-muted dark:text-slate-400">{label}</p>
      <p className="mt-2 break-words text-lg font-bold leading-tight text-vernex-navy dark:text-white">{value}</p>
    </div>
  );
}

function QuickLink({ href, icon: Icon, label }: { href: string; icon: React.ElementType; label: string }) {
  return (
    <Button asChild variant="outline" className="justify-between">
      <Link href={href}>
        <span className="flex items-center gap-2"><Icon className="h-4 w-4" /> {label}</span>
        <ArrowRight className="h-4 w-4" />
      </Link>
    </Button>
  );
}

function AttentionCard({ icon: Icon, title, value, tone }: { icon: React.ElementType; title: string; value: string; tone: 'good' | 'warn' }) {
  return (
    <div className="rounded-xl border border-vernex-border bg-white p-5 shadow-sm dark:border-[#1E335F] dark:bg-vernex-navy">
      <div className="flex items-center gap-3">
        <div className={cn('grid h-11 w-11 place-items-center rounded-xl', tone === 'good' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30' : 'bg-amber-50 text-amber-600 dark:bg-amber-950/30')}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="font-semibold text-vernex-navy dark:text-white">{title}</p>
          <p className="text-sm text-vernex-muted dark:text-slate-300">{value}</p>
        </div>
      </div>
    </div>
  );
}
