import React from 'react';
import { BentoGridHome } from '@/components/bento/bentodemo';
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
        <BentoGridHome />
      </ErrorBoundary>
    </div>
  );
};

export default page;
