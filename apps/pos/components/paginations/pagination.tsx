'use client';
import {
  Pagination as PaginationRoot,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from '@/components/ui/pagination';

import { usePathname, useSearchParams } from 'next/navigation';
import { generatePagination } from '@/lib/utils';

export function Pagination({ totalPages }: { totalPages: number }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentPage = Number(searchParams.get('page')) || 1;
  const pageCount = Math.max(0, totalPages);

  if (pageCount <= 1) return null;

  const createPageURL = (pageNumber: string | number) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', pageNumber.toString());
    return `${pathname}?${params.toString()}`;
  };

  const allPages = generatePagination(currentPage, pageCount);

  return (
    <PaginationRoot>
      <PaginationContent>
        <PaginationItem hidden={currentPage === 1}>
          <PaginationPrevious
            href={
              currentPage === 1 ? undefined : createPageURL(currentPage - 1)
            }
            hidden={currentPage === 1}
          />
        </PaginationItem>
        {allPages.map((page, index) => (
          <PaginationItem key={index}>
            {typeof page === 'number' ? (
              <PaginationLink
                href={createPageURL(page)}
                isActive={currentPage === page}
              >
                {page}
              </PaginationLink>
            ) : (
              <PaginationEllipsis>{page}</PaginationEllipsis>
            )}
          </PaginationItem>
        ))}
        <PaginationItem hidden={currentPage === pageCount}>
          <PaginationNext
            href={createPageURL(currentPage + 1)}
            hidden={currentPage === pageCount}
          />
        </PaginationItem>
      </PaginationContent>
    </PaginationRoot>
  );
}
