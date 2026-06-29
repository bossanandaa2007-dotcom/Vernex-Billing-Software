import React from 'react';
import { Orders } from '@/components/order/demo';
import ErrorBoundary from '@/components/toaster/toaster';
import { PageHeading } from '@/components/dashboard/page-heading';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'POS Billing',
};
const page = () => {
  return (
    <div className="w-full h-full">
      <PageHeading
        title="POS Billing"
        description="Create and manage the current customer billing transaction."
      />
      <ErrorBoundary>
        <Orders />
      </ErrorBoundary>
    </div>
  );
};

export default page;
