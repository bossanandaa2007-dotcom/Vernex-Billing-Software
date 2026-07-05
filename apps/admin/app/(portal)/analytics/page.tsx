import { Building2, CircleDollarSign, ReceiptText, TrendingUp } from 'lucide-react';
import { getDashboard } from '@/services/admin-data.server';
import { formatCurrency } from '@/lib/utils';
import { PageHeader } from '@/components/page-header';
import { MetricCard } from '@/components/metric-card';
import { Card } from '@/components/ui/card';
import { RevenueChart, SalesChart } from '@/components/charts/platform-charts';
import { ErrorState } from '@/components/ui/states';

export default async function AnalyticsPage() {
  try {
    const data = await getDashboard();
    const average = data.totals.orders ? data.totals.totalSales / data.totals.orders : 0;
    const best = data.recentBusinesses[0]?.name ?? 'No business data';
    return <div className="space-y-6"><PageHeader title="Platform Analytics" description="Compare revenue, sales trends, business growth, orders, products, and customers." /><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><MetricCard label="Total Revenue" value={formatCurrency(data.totals.totalSales)} detail="All completed platform sales" icon={CircleDollarSign} tone="green" /><MetricCard label="Average Sale" value={formatCurrency(average)} detail={`${data.totals.orders} completed orders`} icon={TrendingUp} tone="navy" /><MetricCard label="Best Performing" value={best} detail="Most recent active business signal" icon={Building2} tone="gold" /><MetricCard label="New Businesses" value={String(data.businessGrowth.at(-1)?.value ?? 0)} detail="Cumulative platform growth" icon={ReceiptText} tone="navy" /></div><div className="grid gap-5 xl:grid-cols-2"><Card className="p-5"><h2 className="font-semibold">Sales Trend</h2><p className="mt-1 text-sm text-slate-500">Daily completed sales across the platform.</p><SalesChart data={data.dailySales} /></Card><Card className="p-5"><h2 className="font-semibold">Revenue</h2><p className="mt-1 text-sm text-slate-500">Monthly revenue across customer businesses.</p><RevenueChart data={data.monthlyRevenue} /></Card><Card className="p-5"><h2 className="font-semibold">Business Growth</h2><p className="mt-1 text-sm text-slate-500">Cumulative customer businesses.</p><SalesChart data={data.businessGrowth} /></Card><Card className="p-5"><h2 className="font-semibold">Platform Footprint</h2><div className="mt-5 grid grid-cols-2 gap-4"><Footprint label="Active Businesses" value={data.totals.activeBusinesses} /><Footprint label="Orders" value={data.totals.orders} /><Footprint label="Products" value={data.totals.products} /><Footprint label="Customers" value={data.totals.customers} /></div></Card></div></div>;
  } catch {
    return <ErrorState message="Unable to load platform analytics." />;
  }
}

function Footprint({ label, value }: { label: string; value: number }) {
  return <div className="rounded-md border border-slate-200 p-4 dark:border-slate-800"><p className="text-xs uppercase text-slate-500">{label}</p><p className="mt-2 text-2xl font-bold">{value}</p></div>;
}

