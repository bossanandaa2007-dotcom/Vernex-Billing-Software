import Link from 'next/link';
import { Search } from 'lucide-react';
import { getBusiness, listBusinessCustomers } from '@/services/admin-data.server';
import { formatCurrency, formatDate } from '@/lib/utils';
import { PageHeader } from '@/components/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState, ErrorState } from '@/components/ui/states';

export default async function BusinessCustomersPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ search?: string }>;
}) {
  const { id } = await params;
  const search = (await searchParams).search ?? '';
  try {
    const [{ business }, customers] = await Promise.all([
      getBusiness(id),
      listBusinessCustomers(id, search),
    ]);
    return <div className="space-y-6"><PageHeader title={`${business.name} Customers`} description="Customer profiles and purchase history for this business." action={<Button variant="outline" asChild><Link href={`/businesses/${id}`}>Back to Business</Link></Button>} /><Card><form className="flex gap-3 border-b border-slate-200 p-4 dark:border-slate-800"><label className="relative flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><input name="search" defaultValue={search} placeholder="Search name, phone, email, or GSTIN" className="h-10 w-full rounded-md border border-slate-200 bg-white pl-9 pr-3 text-sm dark:border-slate-700 dark:bg-slate-950" /></label><Button type="submit">Search</Button></form>{customers.length ? <div className="overflow-x-auto"><table className="w-full min-w-[850px] text-sm"><thead className="bg-slate-50 text-left text-xs uppercase text-slate-500 dark:bg-slate-950"><tr>{['Customer','Phone','Email','Status','Purchases','Total Spent','Created'].map((item) => <th key={item} className="px-4 py-3">{item}</th>)}</tr></thead><tbody className="divide-y divide-slate-100 dark:divide-slate-800">{customers.map((customer) => <tr key={customer.id}><td className="px-4 py-4"><Link href={`/businesses/${id}/customers/${customer.id}`} className="font-semibold text-blue-800 hover:underline dark:text-amber-400">{customer.name}</Link></td><td className="px-4 py-4">{customer.phone}</td><td className="px-4 py-4 text-slate-500">{customer.email || 'Not available'}</td><td className="px-4 py-4"><Badge tone={customer.isActive ? 'ACTIVE' : 'SUSPENDED'}>{customer.isActive ? 'ACTIVE' : 'INACTIVE'}</Badge></td><td className="px-4 py-4">{customer.transactionCount}</td><td className="px-4 py-4 font-semibold">{formatCurrency(customer.totalSpent)}</td><td className="px-4 py-4">{formatDate(customer.createdAt)}</td></tr>)}</tbody></table></div> : <EmptyState title="No customers found" description="Customer records will appear here when this business starts billing registered customers." />}</Card></div>;
  } catch {
    return <ErrorState message="Unable to load business customers." />;
  }
}

