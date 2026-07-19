import React from 'react';
import type { Metadata } from 'next';
import { PageHeading } from '@/components/dashboard/page-heading';
import { SupportPanel } from '@/components/support/support-panel';

export const metadata: Metadata = {
  title: 'Support',
};

const page = () => {
  return (
    <div className="w-full h-full">
      <PageHeading
        title="Support"
        description="Contact the Vernex team for help. Raise a ticket and track the conversation here."
      />
      <SupportPanel />
    </div>
  );
};

export default page;
