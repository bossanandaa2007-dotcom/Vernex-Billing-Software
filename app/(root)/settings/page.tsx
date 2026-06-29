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
        description="Configure the business name and billing tax preferences."
      />
      <Setting />
    </div>
  );
};

export default page;
