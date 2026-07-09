import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Pagination } from '@/components/paginations/pagination';
import { fetchProduct } from '@/data/product';
import { PageProps } from '@/types/paginations';
import AddButtonComponent from './components/btn/addProduct';
import { SearchInput } from '@/components/search/search';
import Dropdown from './components/btn/Dropdown';
import { formatMoney } from '@/lib/currency';
import { Boxes, PackageSearch, ShoppingBag } from 'lucide-react';
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
        <div className="flex justify-end">
          <div className="flex items-center gap-2">
            <MetricPill label="Products" value={String(data.length)} />
            <AddButtonComponent />
          </div>
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_180px_180px]">
          <div className="relative">
            <SearchInput search={search} />
          </div>
          <Link
            href={categoryHref()}
            className={cn(
              'flex h-10 items-center rounded-xl border px-3 text-sm font-medium transition dark:border-[#1E335F] dark:bg-vernex-dark',
              category
                ? 'border-vernex-border bg-white text-vernex-muted hover:border-vernex-gold hover:bg-vernex-gold/10'
                : 'border-vernex-navy bg-vernex-navy text-white dark:border-vernex-gold dark:bg-vernex-gold dark:text-vernex-dark'
            )}
            title={category ? `Clear ${categoryLabel} filter` : 'Showing all categories'}
          >
            {categoryLabel}
          </Link>
          <div className="flex h-10 cursor-not-allowed items-center rounded-xl border border-vernex-border bg-white px-3 text-sm text-vernex-muted opacity-60 dark:border-[#1E335F] dark:bg-vernex-dark" title="Brand data is not configured for products yet.">
            All Products
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
      <CardContent className="min-h-[520px] p-3 pb-28 md:p-4">
        {data.length ? (
          <div className="grid grid-cols-2 gap-2.5 md:gap-4 xl:grid-cols-3 2xl:grid-cols-4">
            {data.map((item) => {
              return (
                <article
                  key={item.id}
                  className="group relative flex aspect-[0.92] min-h-0 flex-col rounded-xl border border-vernex-border bg-white p-2 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-500 hover:shadow-md md:aspect-auto md:min-h-[190px] md:rounded-2xl md:p-4 dark:border-[#1E335F] dark:bg-vernex-dark"
                >
                  <div className="absolute right-1.5 top-1.5 z-10 md:right-3 md:top-3">
                    <Dropdown product={item} />
                  </div>
                  <div className="flex min-h-0 flex-1 flex-col gap-1.5 md:flex-row md:gap-4 md:pr-8">
                    <div className="relative grid h-10 w-full shrink-0 place-items-center overflow-hidden rounded-lg bg-vernex-surface md:h-24 md:w-24 md:rounded-xl dark:bg-vernex-navy">
                      {item.productstock.imageProduct ? (
                        <Image src={item.productstock.imageProduct} alt={item.productstock.name} fill className="object-cover" sizes="96px" />
                      ) : (
                        <ShoppingBag className="h-5 w-5 text-emerald-600 md:h-8 md:w-8" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="line-clamp-2 pr-5 text-xs font-bold leading-snug text-vernex-text md:pr-0 md:text-base dark:text-white">
                        {item.productstock.name}
                      </h3>
                      <p className="mt-1 hidden text-xs text-vernex-muted md:block dark:text-slate-400">
                        SKU: {item.productstock.id}
                      </p>
                      <p className="mt-0.5 text-sm font-black leading-tight text-vernex-navy md:mt-3 md:text-base dark:text-vernex-gold">
                        {formatMoney(item.sellprice, currency)}
                      </p>
                      <p className="mt-0.5 text-[10px] leading-4 text-vernex-muted md:mt-1 md:text-xs dark:text-slate-400">
                        Cost: {formatMoney(item.productstock.price, currency)}
                      </p>
                    </div>
                  </div>
                  <div className="mt-1.5 flex items-center justify-between gap-2 md:mt-4 md:gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="max-w-[76px] truncate rounded-full px-1.5 text-[9px] leading-4 md:max-w-none md:px-2.5 md:text-xs">
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
