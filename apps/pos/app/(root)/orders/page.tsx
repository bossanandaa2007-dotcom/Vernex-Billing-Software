import React from 'react';
import { PosBilling } from '@/components/order/pos-billing';
import ErrorBoundary from '@/components/toaster/toaster';
import { PageHeading } from '@/components/dashboard/page-heading';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'POS Billing',
};
const page = () => {
  return (
    <div className="w-full h-full">
      <PageHeading title="POS Billing" />
      <ErrorBoundary>
        <PosBilling />
      </ErrorBoundary>
    </div>
  );
};

export default page;
