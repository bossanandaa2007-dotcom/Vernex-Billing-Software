import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Table } from '@/components/ui/table';
import TableHeadRecords from './components/TableHead';
import TableBodyRecords from './components/TableBody';
import { fetchRecords } from '@/data/records';
import type { RecordsPeriod } from '@/data/records';
import { PageProps } from '@/types/paginations';
import { PaginationDemo } from '@/components/paginations/pagination';
import { SearchInput } from '@/components/search/search';
import { formatMoney } from '@/lib/currency';
import { CalendarDays, CircleDollarSign, CreditCard, ReceiptText } from 'lucide-react';
import Link from 'next/link';

const periodOptions: Array<{ label: string; value: RecordsPeriod }> = [
  { label: 'All', value: 'all' },
  { label: 'Daily', value: 'daily' },
  { label: 'Weekly', value: 'weekly' },
  { label: 'Monthly', value: 'monthly' },
];

export async function Records(props: PageProps) {
  const pageNumber = Number(props?.searchParams?.page || 1);
  const take = 5;
  const skip = (pageNumber - 1) * take;
  const search = typeof props?.searchParams?.search === 'string' ? props.searchParams.search : undefined;
  const periodParam = typeof props?.searchParams?.period === 'string' ? props.searchParams.period : 'all';
  const period = periodOptions.some((item) => item.value === periodParam) ? periodParam as RecordsPeriod : 'all';
  const { data, metadata, currency } = await fetchRecords({ take, skip, query: search, period });
  const visibleRevenue = data.reduce((sum, item) => sum + item.totalAmount, 0);
  const visibleItems = data.reduce((sum, item) => sum + item.itemCount, 0);
  const cardStats = [
    { label: 'Visible revenue', value: formatMoney(visibleRevenue, currency), icon: CircleDollarSign },
    { label: 'Transactions', value: metadata.totalTransactions.toString(), icon: ReceiptText },
    { label: 'Items sold', value: visibleItems.toString(), icon: CalendarDays },
    { label: 'Average bill', value: formatMoney(data.length ? visibleRevenue / data.length : 0, currency), icon: CreditCard },
  ];
  const filterHref = (value: RecordsPeriod) => {
    const params = new URLSearchParams();
    params.set('page', '1');
    if (value !== 'all') params.set('period', value);
    if (search) params.set('search', search);
    return `/records?${params.toString()}`;
  };

  return (
    <Card className="flex h-full flex-col overflow-hidden">
      <CardHeader className="border-b bg-gradient-to-r from-white via-emerald-50/60 to-white dark:from-vernex-navy dark:via-[#0D2B4F] dark:to-vernex-navy">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <CardTitle>Transaction History</CardTitle>
            <CardDescription>Completed sales only. Filter, search, open, and print transactions.</CardDescription>
          </div>
          <div className="flex flex-col gap-3 lg:min-w-[520px]">
            <div className="flex flex-wrap gap-2 lg:justify-end">
              {periodOptions.map((item) => (
                <Link
                  key={item.value}
                  href={filterHref(item.value)}
                  className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                    period === item.value
                      ? 'border-vernex-navy bg-vernex-navy text-white shadow-sm dark:border-vernex-gold dark:bg-vernex-gold dark:text-vernex-dark'
                      : 'border-vernex-border bg-white text-vernex-navy hover:border-vernex-gold hover:bg-vernex-gold/10 dark:border-[#1E335F] dark:bg-vernex-dark dark:text-white'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
            <div className="relative"><SearchInput search={search} /></div>
          </div>
        </div>
        <div className="grid gap-3 pt-4 sm:grid-cols-2 xl:grid-cols-4">
          {cardStats.map((stat) => (
            <div key={stat.label} className="rounded-xl border border-vernex-border bg-white/90 p-4 shadow-sm dark:border-[#1E335F] dark:bg-vernex-dark/80">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase text-vernex-muted dark:text-slate-400">{stat.label}</p>
                <stat.icon className="h-4 w-4 text-emerald-600 dark:text-vernex-gold" />
              </div>
              <p className="mt-2 text-2xl font-black text-vernex-navy dark:text-white">{stat.value}</p>
            </div>
          ))}
        </div>
      </CardHeader>
      <CardContent className="flex-grow overflow-x-auto p-4 sm:p-6">
        <div className="mb-4 flex flex-col gap-2 rounded-xl border border-vernex-border bg-vernex-surface p-3 text-sm dark:border-[#1E335F] dark:bg-vernex-dark sm:flex-row sm:items-center sm:justify-between">
          <span className="font-semibold text-vernex-navy dark:text-white">
            Showing {data.length} of {metadata.totalTransactions} completed sales
          </span>
          <span className="text-vernex-muted dark:text-slate-400">
            Click any row to view the bill, or use the quick actions to print.
          </span>
        </div>
        {data.length ? (
          <Table><TableHeadRecords /><TableBodyRecords data={data} currency={currency} /></Table>
        ) : (
          <div className="rounded-xl border border-dashed border-vernex-border py-16 text-center text-sm text-vernex-muted dark:border-[#1E335F]">
            No completed sales match the current filters.
          </div>
        )}
      </CardContent>
      <CardFooter className="mt-auto border-t bg-white/70 py-4 dark:bg-vernex-navy"><PaginationDemo {...metadata} /></CardFooter>
    </Card>
  );
}
