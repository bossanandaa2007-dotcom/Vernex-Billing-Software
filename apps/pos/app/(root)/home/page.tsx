import React from 'react';
import { Dashboard } from '@/components/bento/dashboard';
import ErrorBoundary from '@/components/toaster/toaster';
import { PageHeading } from '@/components/dashboard/page-heading';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dashboard',
};

const page = () => {
  return (
    <div className="w-full">
      <PageHeading
        title="Dashboard"
        description="A clear view of today's billing activity and business performance."
      />
      <ErrorBoundary>
        <Dashboard />
      </ErrorBoundary>
    </div>
  );
};

export default page;
