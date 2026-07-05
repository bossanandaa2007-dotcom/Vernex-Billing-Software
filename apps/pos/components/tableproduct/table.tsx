import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Pagination } from '@/components/paginations/pagination';
import { fetchProduct } from '@/data/product';
import { PageProps } from '@/types/paginations';
import AddButtonComponent from './components/btn/addProduct';
import { SearchInput } from '@/components/search/search';
import Dropdown from './components/btn/Dropdown';
import { formatMoney } from '@/lib/currency';
import { Barcode, Boxes, PackageSearch, ShoppingBag } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';

export default async function TableProduct(props: PageProps) {
  const searchParams = (await props.searchParams) ?? {};
  const pageNumber = Number(searchParams.page || 1);
  const take = 12;
  const skip = (pageNumber - 1) * take;
  const search =
    typeof searchParams.search === 'string'
      ? searchParams.search
      : undefined;
  const category =
    typeof searchParams.category === 'string'
      ? searchParams.category
      : undefined;

  const result = await fetchProduct({ take, skip, query: search, category });
  if (!result) {
    return (
      <Card className="w-full border-vernex-border/80 shadow-sm">
        <CardContent>
          <EmptyState
            icon={<PackageSearch className="h-7 w-7" />}
            title="Products are unavailable"
            description="We could not load your products. Please check your connection and try again."
            action={<Button asChild variant="outline"><Link href="/product">Try Again</Link></Button>}
          />
        </CardContent>
      </Card>
    );
  }

  const { data, metadata, currency, categories } = result;
  const categoryHref = (value?: string) => {
    const params = new URLSearchParams();
    params.set('page', '1');
    if (search) params.set('search', search);
    if (value) params.set('category', value);
    const queryString = params.toString();
    return queryString ? `/product?${queryString}` : '/product';
  };
  const categoryLabel = category
    ? category.charAt(0).toUpperCase() + category.slice(1).toLowerCase()
    : 'All Categories';

  return (
    <Card className="w-full overflow-hidden border-vernex-border/80 bg-white shadow-sm dark:border-[#1E335F] dark:bg-vernex-navy">
      <CardHeader className="border-b border-vernex-border bg-white/95 p-4 dark:border-[#1E335F] dark:bg-vernex-navy">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <PackageSearch className="h-5 w-5 text-emerald-600" />
              Product Selection
            </CardTitle>
            <p className="mt-1 text-xs text-vernex-muted dark:text-slate-400">
              Search, manage, restock, and edit products from a cashier-friendly grid.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <MetricPill label="Products" value={String(data.length)} />
            <AddButtonComponent />
          </div>
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_180px_180px_160px]">
          <div className="relative">
            <SearchInput search={search} />
          </div>
          <Link
            href={categoryHref()}
            className={cn(
              'flex h-10 items-center rounded-xl border px-3 text-sm font-semibold transition dark:border-[#1E335F] dark:bg-vernex-dark',
              category
                ? 'border-vernex-border bg-white text-vernex-muted hover:border-vernex-gold hover:bg-vernex-gold/10'
                : 'border-vernex-navy bg-vernex-navy text-white dark:border-vernex-gold dark:bg-vernex-gold dark:text-vernex-dark'
            )}
            title={category ? `Clear ${categoryLabel} filter` : 'Showing all categories'}
          >
            {categoryLabel}
          </Link>
          <div className="flex h-10 cursor-not-allowed items-center rounded-xl border border-vernex-border bg-white px-3 text-sm text-vernex-muted opacity-60 dark:border-[#1E335F] dark:bg-vernex-dark" title="Brand data is not configured for products yet.">
            All Brands
          </div>
          <div className="flex h-10 items-center justify-center rounded-xl border border-vernex-border bg-white px-3 text-sm font-semibold text-vernex-navy dark:border-[#1E335F] dark:bg-vernex-dark dark:text-white">
            <Barcode className="mr-2 h-4 w-4 text-emerald-600" />
            Scan Barcode
          </div>
        </div>
        {!!categories.length && (
          <div className="mt-3 flex flex-wrap gap-2">
            <Link href={categoryHref()}>
              <Badge
                variant="outline"
                className={cn(
                  'cursor-pointer rounded-full transition hover:border-emerald-500 hover:bg-emerald-500/10',
                  !category && 'border-emerald-600 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30'
                )}
              >
                All
              </Badge>
            </Link>
            {categories.map((category) => (
              <Link key={category} href={categoryHref(category)}>
                <Badge
                  variant="outline"
                  className={cn(
                    'cursor-pointer rounded-full transition hover:border-emerald-500 hover:bg-emerald-500/10',
                    searchParams.category === category && 'border-emerald-600 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30'
                  )}
                >
                  {category.charAt(0).toUpperCase() + category.slice(1).toLowerCase()}
                </Badge>
              </Link>
            ))}
          </div>
        )}
      </CardHeader>
      <CardContent className="min-h-[520px] p-4">
        {data.length ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {data.map((item) => {
              return (
                <article
                  key={item.id}
                  className="group relative min-h-[190px] rounded-2xl border border-vernex-border bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-500 hover:shadow-md dark:border-[#1E335F] dark:bg-vernex-dark"
                >
                  <div className="absolute right-3 top-3 z-10">
                    <Dropdown product={item} />
                  </div>
                  <div className="flex gap-4 pr-8">
                    <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-vernex-surface dark:bg-vernex-navy">
                      {item.productstock.imageProduct ? (
                        <Image src={item.productstock.imageProduct} alt={item.productstock.name} fill className="object-cover" sizes="96px" />
                      ) : (
                        <ShoppingBag className="absolute left-8 top-8 h-8 w-8 text-emerald-600" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="line-clamp-2 font-bold text-vernex-text dark:text-white">
                        {item.productstock.name}
                      </h3>
                      <p className="mt-1 text-xs text-vernex-muted dark:text-slate-400">
                        SKU: {item.productstock.id}
                      </p>
                      <p className="mt-3 font-black text-vernex-navy dark:text-vernex-gold">
                        {formatMoney(item.sellprice, currency)}
                      </p>
                      <p className="mt-1 text-xs text-vernex-muted dark:text-slate-400">
                        Cost: {formatMoney(item.productstock.price, currency)}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="rounded-full">
                        {item.productstock.cat}
                      </Badge>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <EmptyState
            icon={<Boxes className="h-7 w-7" />}
            title={search || category ? 'No matching products found' : 'No products added yet'}
            description={search || category
              ? 'Try a different search or clear the current filters.'
              : 'Start by adding your first product to begin selling.'}
            action={search || category
              ? <Button asChild variant="outline"><Link href="/product">Clear Filters</Link></Button>
              : <AddButtonComponent />}
            className="min-h-[420px]"
          />
        )}
      </CardContent>
      <CardFooter className="border-t border-vernex-border bg-white/80 p-4 dark:border-[#1E335F] dark:bg-vernex-navy">
        <Pagination {...metadata} />
      </CardFooter>
    </Card>
  );
}

function MetricPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="hidden rounded-xl border border-vernex-border bg-white px-3 py-2 text-xs dark:border-[#1E335F] dark:bg-vernex-dark sm:block">
      <span className="text-vernex-muted dark:text-slate-400">{label}</span>
      <span className="ml-2 font-bold text-vernex-text dark:text-white">{value}</span>
    </div>
  );
}
