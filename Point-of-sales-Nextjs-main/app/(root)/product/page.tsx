import React from 'react';
import TableProduct from '@/components/tableproduct/table';
import { PageProps } from '@/types/paginations';
import ErrorBoundary from '@/components/toaster/toaster';
import { PageHeading } from '@/components/dashboard/page-heading';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Products',
};
const page = async (props: PageProps) => {
  return (
    <div className="w-full h-full">
      <PageHeading
        title="Products"
        description="Manage products, selling prices, and available stock."
      />
      <ErrorBoundary>
        <TableProduct {...props} />
      </ErrorBoundary>
    </div>
  );
};

export default page;
