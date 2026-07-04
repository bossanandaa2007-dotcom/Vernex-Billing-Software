import { StaffTable } from '@/components/staff/StaffTable';
import { PageHeading } from '@/components/dashboard/page-heading';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Staff Management' };

export default function StaffPage() {
  return (
    <section className="w-full">
      <PageHeading title="Staff Management" description="Manage staff access, roles, and account status." />
      <StaffTable />
    </section>
  );
}
