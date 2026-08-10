import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Building2, CalendarDays, Package, ReceiptText, RotateCcw, Users } from 'lucide-react';
import { getBusiness } from '@/services/super-admin/admin-data.server';
import { formatCurrency, formatDate } from '@/lib/super-admin/utils';
import { PageHeader } from '@/components/super-admin/page-header';
import { MetricCard } from '@/components/super-admin/metric-card';
import { Card } from '@/components/super-admin/ui/card';
import { Badge } from '@/components/super-admin/ui/badge';
import { BusinessActions } from '@/components/super-admin/business-actions';
import { ErrorState } from '@/components/super-admin/ui/states';

export default async function BusinessDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const { business, metrics } = await getBusiness(id);
    if (!business) notFound();
    return (
      <div className="space-y-6">
        <PageHeader
          title={business.name}
          description="Business performance, account health, and platform activity."
          action={<BusinessActions id={business.id} name={business.name} />}
        />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Today's Sales" value={formatCurrency(metrics.todaySales)} detail="Completed sales today" icon={ReceiptText} tone="green" />
          <MetricCard label="Weekly Sales" value={formatCurrency(metrics.weeklySales)} detail="Last seven days" icon={CalendarDays} tone="navy" />
          <MetricCard label="Monthly Sales" value={formatCurrency(metrics.monthlySales)} detail="Current month" icon={Building2} tone="gold" />
          <MetricCard label="Orders" value={String(metrics.orders)} detail={`${metrics.returns} returns`} icon={RotateCcw} tone="red" />
        </div>
        <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Business Information</h2>
              <Badge tone={business.subscriptionStatus}>{business.subscriptionStatus}</Badge>
            </div>
            <dl className="mt-5 grid gap-4 sm:grid-cols-2">
              <Detail label="Owner" value={business.ownerName} />
              <Detail label="Email" value={business.ownerEmail || 'Not available'} />
              <Detail label="Phone" value={business.ownerPhone || 'Not available'} />
              <Detail label="Country" value={business.country} />
              <Detail label="Plan" value={business.planName} />
              <Detail label="Created" value={formatDate(business.createdAt)} />
              <Detail label="Trial Start" value={formatDate(business.trialStartedAt)} />
              <Detail label="Trial End" value={formatDate(business.trialEndsAt)} />
              <Detail label="Last Login" value={formatDate(business.lastLoginAt)} />
            </dl>
          </Card>
          <Card className="p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-semibold">Workspace Inventory</h2>
              <div className="flex flex-wrap gap-2">
                <InventoryLink href={`/super-admin/businesses/${business.id}/products`}>View Products</InventoryLink>
                <InventoryLink href={`/super-admin/businesses/${business.id}/customers`}>View Customers</InventoryLink>
              </div>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <Count icon={Package} label="Products" value={metrics.products} />
              <Count icon={Users} label="Customers" value={metrics.customers} />
              <Count icon={ReceiptText} label="Orders" value={metrics.orders} />
              <Count icon={Users} label="Staff" value={metrics.staff} />
              <Count icon={RotateCcw} label="Returns" value={metrics.returns} />
            </div>
          </Card>
        </div>
      </div>
    );
  } catch {
    return <ErrorState message="Unable to load this business. It may no longer exist or Supabase access is unavailable." />;
  }
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-xs font-semibold uppercase text-slate-400">{label}</dt><dd className="mt-1 break-words text-sm font-medium">{value}</dd></div>;
}

function InventoryLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-blue-800 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 dark:border-slate-700 dark:text-amber-400 dark:hover:bg-slate-800">
      {children}
    </Link>
  );
}

function Count({ icon: Icon, label, value }: { icon: typeof Package; label: string; value: number }) {
  return <div className="flex items-center gap-3 rounded-md border border-slate-200 p-4 dark:border-slate-800"><div className="grid h-9 w-9 place-items-center rounded-md bg-slate-100 text-blue-700 dark:bg-slate-800 dark:text-amber-400"><Icon className="h-4 w-4" /></div><div><p className="text-xs text-slate-500">{label}</p><p className="text-lg font-bold">{value}</p></div></div>;
}
