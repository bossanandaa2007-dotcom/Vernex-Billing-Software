import React from 'react';
import { Records } from '@/components/tablerecords/table';
import { PageProps } from '@/types/paginations';
import { PageHeading } from '@/components/dashboard/page-heading';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sales Records',
};
const page = async (props: PageProps) => {
  return (
    <div className="w-full h-full">
      <PageHeading
        title="Sales Records"
        description="Review completed and in-progress sales transactions."
      />
      <Records {...props} />
    </div>
  );
};

export default page;
