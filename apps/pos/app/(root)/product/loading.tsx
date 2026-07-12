import { PageHeading } from '@/components/dashboard/page-heading';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';

// Instant skeleton shown while the Products server component fetches data.
// Purely visual — it renders immediately on navigation and is swapped for the
// real page once the data resolves. No product logic lives here.
export default function Loading() {
  return (
    <div className="w-full h-full">
      <PageHeading title="Products" />
      <Card className="w-full overflow-hidden border-vernex-border/80 bg-white shadow-sm dark:border-[#1E335F] dark:bg-vernex-navy">
        <CardHeader className="border-b border-vernex-border bg-white/95 p-4 dark:border-[#1E335F] dark:bg-vernex-navy">
          <div className="flex justify-end">
            <div className="flex items-center gap-2">
              <div className="hidden h-9 w-24 animate-pulse rounded-xl bg-vernex-surface dark:bg-vernex-dark sm:block" />
              <div className="h-9 w-28 animate-pulse rounded-xl bg-vernex-surface dark:bg-vernex-dark" />
            </div>
          </div>
          <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_180px_180px]">
            <div className="h-10 animate-pulse rounded-xl bg-vernex-surface dark:bg-vernex-dark" />
            <div className="h-10 animate-pulse rounded-xl bg-vernex-surface dark:bg-vernex-dark" />
            <div className="h-10 animate-pulse rounded-xl bg-vernex-surface dark:bg-vernex-dark" />
          </div>
        </CardHeader>
        <CardContent className="min-h-[520px] p-3 pb-28 md:p-4">
          <div className="grid grid-cols-2 gap-2 md:gap-4 xl:grid-cols-3 2xl:grid-cols-4">
            {Array.from({ length: 12 }).map((_, index) => (
              <div
                key={index}
                className="flex min-h-[74px] flex-col rounded-xl border border-vernex-border bg-white p-1.5 shadow-sm sm:min-h-[86px] sm:p-2 md:min-h-[190px] md:rounded-2xl md:p-4 dark:border-[#1E335F] dark:bg-vernex-dark"
              >
                <div className="flex flex-1 items-start gap-1.5 md:gap-4">
                  <div className="h-8 w-8 shrink-0 animate-pulse rounded-lg bg-vernex-surface sm:h-9 sm:w-9 md:h-24 md:w-24 md:rounded-xl dark:bg-vernex-navy" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="h-3 w-4/5 animate-pulse rounded bg-vernex-surface dark:bg-vernex-navy" />
                    <div className="h-3 w-1/2 animate-pulse rounded bg-vernex-surface dark:bg-vernex-navy" />
                    <div className="h-4 w-2/3 animate-pulse rounded bg-vernex-surface dark:bg-vernex-navy md:mt-3" />
                  </div>
                </div>
                <div className="mt-2 md:mt-4">
                  <div className="h-4 w-16 animate-pulse rounded-full bg-vernex-surface dark:bg-vernex-navy" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
        <CardFooter className="border-t border-vernex-border bg-white/80 p-4 dark:border-[#1E335F] dark:bg-vernex-navy">
          <div className="h-9 w-full max-w-xs animate-pulse rounded-xl bg-vernex-surface dark:bg-vernex-dark" />
        </CardFooter>
      </Card>
    </div>
  );
}
