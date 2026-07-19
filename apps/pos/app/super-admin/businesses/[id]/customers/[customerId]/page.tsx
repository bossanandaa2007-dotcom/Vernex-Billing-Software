import Link from 'next/link';
import { getBusiness, getBusinessCustomer } from '@/services/super-admin/admin-data.server';
import { formatCurrency, formatDate } from '@/lib/super-admin/utils';
import { PageHeader } from '@/components/super-admin/page-header';
import { Card } from '@/components/super-admin/ui/card';
import { Badge } from '@/components/super-admin/ui/badge';
import { Button } from '@/components/super-admin/ui/button';
import { EmptyState, ErrorState } from '@/components/super-admin/ui/states';

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string; customerId: string }> }) {
  const { id, customerId } = await params;
  try {
    const [{ business }, { customer, sales }] = await Promise.all([
      getBusiness(id),
      getBusinessCustomer(id, customerId),
    ]);
    return <div className="space-y-6"><PageHeader title={customer.name} description={`Customer details and purchase history at ${business.name}.`} action={<Button variant="outline" asChild><Link href={`/super-admin/businesses/${id}/customers`}>Back to Customers</Link></Button>} /><div className="grid gap-5 lg:grid-cols-[360px_1fr]"><Card className="p-5"><div className="flex items-center justify-between"><h2 className="font-semibold">Customer Information</h2><Badge tone={customer.isActive ? 'ACTIVE' : 'SUSPENDED'}>{customer.isActive ? 'ACTIVE' : 'INACTIVE'}</Badge></div><dl className="mt-5 space-y-4"><Detail label="Phone" value={customer.phone} /><Detail label="Email" value={customer.email || 'Not available'} /><Detail label="GSTIN / Tax ID" value={customer.taxId || 'Not available'} /><Detail label="Address" value={customer.address || 'Not available'} /><Detail label="Country" value={customer.country || 'Not available'} /><Detail label="Customer Since" value={formatDate(customer.createdAt)} /><Detail label="Completed Purchases" value={String(customer.transactionCount)} /><Detail label="Total Spent" value={formatCurrency(customer.totalSpent)} /></dl></Card><Card className="overflow-hidden"><div className="border-b border-slate-200 p-5 dark:border-slate-800"><h2 className="font-semibold">Purchase History</h2></div>{sales.length ? <div className="overflow-x-auto"><table className="w-full min-w-[650px] text-sm"><thead className="bg-slate-50 text-left text-xs uppercase text-slate-500 dark:bg-slate-950"><tr>{['Bill','Date','Payment','Status','Refunded','Total'].map((item) => <th key={item} className="px-4 py-3">{item}</th>)}</tr></thead><tbody className="divide-y divide-slate-100 dark:divide-slate-800">{sales.map((sale) => <tr key={sale.id}><td className="px-4 py-4 font-semibold">{sale.billNumber || sale.id}</td><td className="px-4 py-4">{formatDate(sale.completedAt)}</td><td className="px-4 py-4">{sale.paymentMethod || 'Not available'}</td><td className="px-4 py-4">{sale.paymentStatus}</td><td className="px-4 py-4">{formatCurrency(Number(sale.refundedAmount ?? 0))}</td><td className="px-4 py-4 font-semibold">{formatCurrency(Number(sale.totalAmount ?? 0))}</td></tr>)}</tbody></table></div> : <EmptyState title="No purchases yet" description="Completed customer sales will appear here." />}</Card></div></div>;
  } catch {
    return <ErrorState message="Unable to load customer details." />;
  }
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-xs font-semibold uppercase text-slate-400">{label}</dt><dd className="mt-1 break-words text-sm font-medium">{value}</dd></div>;
}
