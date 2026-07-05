import Link from 'next/link';
import { Plus, Search } from 'lucide-react';
import { listBusinesses } from '@/services/admin-data.server';
import { PageHeader } from '@/components/page-header';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState, ErrorState } from '@/components/ui/states';
import { BusinessActions } from '@/components/business-actions';
import { formatDate } from '@/lib/utils';

export default async function BusinessesPage({ searchParams }: { searchParams: Promise<{ search?: string; status?: string; page?: string }> }) {
  const params = await searchParams;
  const search = params.search ?? '';
  const status = params.status ?? 'ALL';
  const page = Math.max(1, Number(params.page) || 1);
  try {
    const data = await listBusinesses({ search, status, page });
    const pages = Math.max(1, Math.ceil(data.count / data.pageSize));
    return <div className="space-y-6"><PageHeader title="Businesses" description="Manage every customer business, owner, trial, and account status." action={<Button asChild><Link href="/businesses/new"><Plus className="h-4 w-4" />Create Business</Link></Button>} /><Card><form className="grid gap-3 border-b border-slate-200 p-4 sm:grid-cols-[1fr_180px_auto] dark:border-slate-800"><label className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><input name="search" defaultValue={search} placeholder="Search business name" className="h-10 w-full rounded-md border border-slate-200 bg-white pl-9 pr-3 text-sm dark:border-slate-700 dark:bg-slate-950" /></label><select name="status" defaultValue={status} className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950">{['ALL','ACTIVE','TRIAL','EXPIRED','SUSPENDED'].map((item) => <option key={item}>{item}</option>)}</select><Button type="submit">Apply Filters</Button></form>{data.rows.length ? <div className="overflow-x-auto"><table className="w-full min-w-[1050px] text-sm"><thead className="bg-slate-50 text-left text-xs uppercase text-slate-500 dark:bg-slate-950"><tr>{['Business','Owner','Email','Phone','Trial','Status','Created','Last Login',''].map((label) => <th key={label} className="px-4 py-3">{label}</th>)}</tr></thead><tbody className="divide-y divide-slate-100 dark:divide-slate-800">{data.rows.map((business) => <tr key={business.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40"><td className="px-4 py-4"><Link href={`/businesses/${business.id}`} className="font-semibold text-blue-800 hover:underline dark:text-amber-400">{business.name}</Link></td><td className="px-4 py-4">{business.ownerName}</td><td className="px-4 py-4 text-slate-500">{business.ownerEmail || 'Not available'}</td><td className="px-4 py-4">{business.ownerPhone || 'Not available'}</td><td className="px-4 py-4">{business.trialEndsAt ? formatDate(business.trialEndsAt) : 'No trial'}</td><td className="px-4 py-4"><Badge tone={business.subscriptionStatus}>{business.subscriptionStatus}</Badge></td><td className="px-4 py-4">{formatDate(business.createdAt)}</td><td className="px-4 py-4">{formatDate(business.lastLoginAt)}</td><td className="px-4 py-4"><BusinessActions id={business.id} name={business.name} /></td></tr>)}</tbody></table></div> : <EmptyState title="No businesses found" description="Create a business or adjust your filters to see results." action={<Button asChild><Link href="/businesses/new">Create Business</Link></Button>} />}<div className="flex items-center justify-between border-t border-slate-200 p-4 text-sm dark:border-slate-800"><span>Page {page} of {pages} · {data.count} businesses</span><div className="flex gap-2"><Button variant="outline" size="sm" asChild><Link href={`/businesses?search=${encodeURIComponent(search)}&status=${status}&page=${Math.max(1,page-1)}`}>Previous</Link></Button><Button variant="outline" size="sm" asChild><Link href={`/businesses?search=${encodeURIComponent(search)}&status=${status}&page=${Math.min(pages,page+1)}`}>Next</Link></Button></div></div></Card></div>;
  } catch {
    return <ErrorState message="Unable to load businesses. Confirm Supabase permissions for the Super Admin account." />;
  }
}

