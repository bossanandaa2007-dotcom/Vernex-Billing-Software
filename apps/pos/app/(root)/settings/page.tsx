import React from 'react';
import { Setting } from '@/components/setting/setting';
import { PageHeading } from '@/components/dashboard/page-heading';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Business Settings',
};
const page = () => {
  return (
    <div className="w-full h-full">
      <PageHeading
        title="Business Settings"
        description="Manage business details, regional preferences, receipts, and bill numbering."
      />
      <Setting />
    </div>
  );
};

export default page;
