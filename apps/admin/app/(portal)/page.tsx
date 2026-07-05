import Link from 'next/link';
import { Activity, Building2, CircleDollarSign, Package, ReceiptText, Store, Users } from 'lucide-react';
import { getDashboard } from '@/services/admin-data.server';
import { formatCurrency, formatDate } from '@/lib/utils';
import { MetricCard } from '@/components/metric-card';
import { PageHeader } from '@/components/page-header';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/ui/states';
import { RevenueChart, SalesChart } from '@/components/charts/platform-charts';

export default async function DashboardPage() {
  try {
    const data = await getDashboard();
    const cards = [
      { label: 'Total Businesses', value: String(data.totals.businesses), detail: `${data.totals.activeBusinesses} active`, icon: Building2, tone: 'navy' as const },
      { label: 'Trial Businesses', value: String(data.totals.trialBusinesses), detail: `${data.totals.expiredBusinesses} expired or suspended`, icon: Activity, tone: 'gold' as const },
      { label: 'Total Sales', value: formatCurrency(data.totals.totalSales), detail: `${formatCurrency(data.totals.todaySales)} today`, icon: CircleDollarSign, tone: 'green' as const },
      { label: 'Monthly Revenue', value: formatCurrency(data.totals.monthlyRevenue), detail: `${data.totals.orders} total orders`, icon: ReceiptText, tone: 'navy' as const },
      { label: 'Products', value: String(data.totals.products), detail: 'Across all businesses', icon: Package, tone: 'gold' as const },
      { label: 'Customers', value: String(data.totals.customers), detail: 'Platform customer records', icon: Users, tone: 'green' as const },
      { label: 'Total Staff', value: String(data.totals.staff), detail: 'Owners, managers, and cashiers', icon: Store, tone: 'navy' as const },
    ];
    return <div className="space-y-6"><PageHeader title="Platform Dashboard" description="Monitor businesses, sales, trials, and operational activity across Vernex." action={<Button asChild><Link href="/businesses/new">Create Business</Link></Button>} /><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map((card) => <MetricCard key={card.label} {...card} />)}</div><div className="grid gap-5 xl:grid-cols-2"><Card className="p-5"><h2 className="font-semibold">Daily Sales</h2><p className="mt-1 text-sm text-slate-500">Platform sales over the last seven days.</p><SalesChart data={data.dailySales} /></Card><Card className="p-5"><h2 className="font-semibold">Monthly Revenue</h2><p className="mt-1 text-sm text-slate-500">Revenue movement across six months.</p><RevenueChart data={data.monthlyRevenue} /></Card></div><div className="grid gap-5 xl:grid-cols-[1fr_1fr]"><Card className="overflow-hidden"><div className="flex items-center justify-between border-b border-slate-200 p-5 dark:border-slate-800"><h2 className="font-semibold">Recent Businesses</h2><Link href="/businesses" className="text-sm font-semibold text-blue-700 dark:text-amber-400">View All</Link></div><div className="divide-y divide-slate-100 dark:divide-slate-800">{data.recentBusinesses.length ? data.recentBusinesses.map((business) => <Link key={business.id} href={`/businesses/${business.id}`} className="flex items-center justify-between gap-4 p-4 hover:bg-slate-50 dark:hover:bg-slate-800/60"><div><p className="font-semibold">{business.name}</p><p className="mt-1 text-xs text-slate-500">{business.ownerEmail || 'Owner email unavailable'} · {formatDate(business.createdAt)}</p></div><Badge tone={business.subscriptionStatus}>{business.subscriptionStatus}</Badge></Link>) : <p className="p-8 text-center text-sm text-slate-500">No businesses found.</p>}</div></Card><Card className="overflow-hidden"><div className="flex items-center justify-between border-b border-slate-200 p-5 dark:border-slate-800"><h2 className="font-semibold">Recent Activity</h2><Link href="/audit-logs" className="text-sm font-semibold text-blue-700 dark:text-amber-400">View Logs</Link></div><div className="divide-y divide-slate-100 dark:divide-slate-800">{data.recentActivity.length ? data.recentActivity.map((item) => <div key={item.id} className="p-4"><div className="flex items-center justify-between gap-3"><p className="font-semibold">{item.action.replaceAll('_', ' ')}</p><span className="text-xs text-slate-400">{formatDate(item.createdAt)}</span></div><p className="mt-1 text-sm text-slate-500">{item.businessName}: {item.description}</p></div>) : <p className="p-8 text-center text-sm text-slate-500">No recent activity.</p>}</div></Card></div></div>;
  } catch {
    return <ErrorState message="Unable to load platform analytics. Confirm Supabase access policies for the Super Admin account." />;
  }
}

