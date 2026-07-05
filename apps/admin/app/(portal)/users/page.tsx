import { Search } from 'lucide-react';
import { listUsers } from '@/services/admin-data.server';
import { PageHeader } from '@/components/page-header';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState, ErrorState } from '@/components/ui/states';
import { UserActions } from '@/components/user-actions';
import { formatDate } from '@/lib/utils';

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ search?: string }> }) {
  const search = (await searchParams).search ?? '';
  try {
    const users = await listUsers(search);
    return <div className="space-y-6"><PageHeader title="Users" description="Manage staff accounts across every Vernex customer business." /><Card><form className="flex gap-3 border-b border-slate-200 p-4 dark:border-slate-800"><label className="relative flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><input name="search" defaultValue={search} placeholder="Search name, email, or phone" className="h-10 w-full rounded-md border border-slate-200 bg-white pl-9 pr-3 text-sm dark:border-slate-700 dark:bg-slate-950" /></label><Button type="submit">Search</Button></form>{users.length ? <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-sm"><thead className="bg-slate-50 text-left text-xs uppercase text-slate-500 dark:bg-slate-950"><tr>{['Name','Business','Email','Role','Status','Last Login',''].map((item) => <th className="px-4 py-3" key={item}>{item}</th>)}</tr></thead><tbody className="divide-y divide-slate-100 dark:divide-slate-800">{users.map((user) => <tr key={user.id}><td className="px-4 py-4 font-semibold">{user.name}</td><td className="px-4 py-4">{user.businessName}</td><td className="px-4 py-4 text-slate-500">{user.email}</td><td className="px-4 py-4">{user.role}</td><td className="px-4 py-4"><Badge tone={user.status === 'ACTIVE' ? 'ACTIVE' : 'SUSPENDED'}>{user.status}</Badge></td><td className="px-4 py-4">{formatDate(user.lastLoginAt)}</td><td className="px-4 py-4"><UserActions id={user.id} name={user.name} status={user.status} role={user.role} /></td></tr>)}</tbody></table></div> : <EmptyState title="No users found" description="Users will appear after businesses and staff accounts are created." />}</Card></div>;
  } catch {
    return <ErrorState message="Unable to load users. Confirm Supabase access policies." />;
  }
}

