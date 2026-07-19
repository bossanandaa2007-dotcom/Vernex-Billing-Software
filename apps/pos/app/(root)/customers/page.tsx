import { CustomerDirectory } from '@/components/customers/CustomerDirectory';
import { PageHeading } from '@/components/dashboard/page-heading';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Customers' };

export default function CustomersPage() {
  return (
    <div className="w-full">
      <PageHeading title="Customers" />
      <CustomerDirectory />
    </div>
  );
}
