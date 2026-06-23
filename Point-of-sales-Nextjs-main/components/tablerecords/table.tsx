import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Table } from '@/components/ui/table';
import TableHeadRecords from './components/TableHead';
import TableBodyRecords from './components/TableBody';
import { fetchRecords } from '@/data/records';
import { PageProps } from '@/types/paginations';
import { PaginationDemo } from '@/components/paginations/pagination';
import { SearchInput } from '@/components/search/search';

export async function Records(props: PageProps) {
  const pageNumber = Number(props?.searchParams?.page || 1);
  const take = 5;
  const skip = (pageNumber - 1) * take;
  const search = typeof props?.searchParams?.search === 'string' ? props.searchParams.search : undefined;
  const { data, metadata, currency } = await fetchRecords({ take, skip, query: search });

  return (
    <Card className="flex h-full flex-col">
      <div className="flex items-center justify-between">
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
          <CardDescription>Completed sales only.</CardDescription>
        </CardHeader>
        <div className="relative ml-auto mr-4 flex-1 md:grow-0"><SearchInput search={search} /></div>
      </div>
      <CardContent className="flex-grow overflow-x-auto">
        {data.length ? (
          <Table><TableHeadRecords /><TableBodyRecords data={data} currency={currency} /></Table>
        ) : (
          <div className="py-16 text-center text-sm text-vernex-muted">No completed sales yet.</div>
        )}
      </CardContent>
      <CardFooter className="mt-auto"><PaginationDemo {...metadata} /></CardFooter>
    </Card>
  );
}
