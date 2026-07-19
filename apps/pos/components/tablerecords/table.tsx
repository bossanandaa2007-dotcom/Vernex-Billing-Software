import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Table } from '@/components/ui/table';
import TableHeadRecords from './components/TableHead';
import TableBodyRecords from './components/TableBody';
import { fetchRecords } from '@/data/records';
import type { RecordsPeriod } from '@/data/records';
import { PageProps } from '@/types/paginations';
import { Pagination } from '@/components/paginations/pagination';
import { SearchInput } from '@/components/search/search';
import { formatMoney } from '@/lib/currency';
import { CalendarDays, CircleDollarSign, CreditCard, ReceiptText } from 'lucide-react';
import Link from 'next/link';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';

const periodOptions: Array<{ label: string; value: RecordsPeriod }> = [
  { label: 'All', value: 'all' },
  { label: 'Daily', value: 'daily' },
  { label: 'Weekly', value: 'weekly' },
  { label: 'Monthly', value: 'monthly' },
];

export async function Records(props: PageProps) {
  const searchParams = (await props.searchParams) ?? {};
  const pageNumber = Number(searchParams.page || 1);
  const take = 5;
  const skip = (pageNumber - 1) * take;
  const search = typeof searchParams.search === 'string' ? searchParams.search : undefined;
  const periodParam = typeof searchParams.period === 'string' ? searchParams.period : 'all';
  const period = periodOptions.some((item) => item.value === periodParam) ? periodParam as RecordsPeriod : 'all';
  const { data, metadata, currency } = await fetchRecords({ take, skip, query: search, period });
  const cardStats = [
    { label: 'Total revenue', shortLabel: 'Revenue', value: formatMoney(metadata.totalRevenue, currency), icon: CircleDollarSign },
    { label: 'Transactions', shortLabel: 'Bills', value: metadata.totalTransactions.toString(), icon: ReceiptText },
    { label: 'Average bill', shortLabel: 'Avg', value: formatMoney(metadata.totalTransactions ? metadata.totalRevenue / metadata.totalTransactions : 0, currency), icon: CreditCard },
    { label: 'Items sold', shortLabel: 'Items', value: metadata.totalItems.toString(), icon: CalendarDays },
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
      <CardHeader className="border-b border-vernex-border bg-white dark:border-[#1E335F] dark:bg-vernex-navy">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-end">
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
        <div className="grid grid-cols-3 gap-2 pt-4 sm:grid-cols-2 sm:gap-3 xl:grid-cols-4">
          {cardStats.map((stat, index) => (
            <div
              key={stat.label}
              className={`rounded-xl border border-vernex-border bg-white/90 shadow-sm dark:border-[#1E335F] dark:bg-vernex-dark/80 ${
                index === 0
                  ? 'col-span-3 p-3 sm:col-span-1 sm:p-4'
                  : 'aspect-square p-2 sm:aspect-auto sm:p-4'
              }`}
            >
              <div className="flex items-start justify-between gap-1.5">
                <p className="text-[9px] font-semibold uppercase leading-3 text-vernex-muted sm:text-xs sm:leading-4 dark:text-slate-400">
                  <span className="sm:hidden">{stat.shortLabel}</span>
                  <span className="hidden sm:inline">{stat.label}</span>
                </p>
                <stat.icon className="h-3.5 w-3.5 shrink-0 text-emerald-600 sm:h-4 sm:w-4 dark:text-vernex-gold" />
              </div>
              <p className={`mt-2 font-black leading-tight text-vernex-navy dark:text-white ${
                index === 0 ? 'text-2xl' : 'text-base sm:text-2xl'
              }`}>{stat.value}</p>
            </div>
          ))}
        </div>
      </CardHeader>
      <CardContent className="flex-grow overflow-x-auto p-4 pb-28 sm:p-6">
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
          <EmptyState
            icon={<ReceiptText className="h-7 w-7" />}
            title={search || period !== 'all' ? 'No matching sales found' : 'No sales recorded today'}
            description={search || period !== 'all'
              ? 'Try a different search or date filter.'
              : 'Your completed sales will appear here once billing starts.'}
            action={search || period !== 'all'
              ? <Button asChild variant="outline"><Link href="/records">Clear Filters</Link></Button>
              : <Button asChild><Link href="/orders">Create Bill</Link></Button>}
          />
        )}
      </CardContent>
      <CardFooter className="mt-auto border-t bg-white/70 py-4 dark:bg-vernex-navy"><Pagination {...metadata} /></CardFooter>
    </Card>
  );
}
