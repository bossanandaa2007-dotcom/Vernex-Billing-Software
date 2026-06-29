import { PageHeading } from '@/components/dashboard/page-heading';
import { ReportsDashboard } from '@/components/reports/ReportsDashboard';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Reports',
};

export default function ReportsPage() {
  return (
    <div className="w-full">
      <PageHeading
        title="Reports"
        description="Dynamic sales, payment, product, customer, staff, inventory, and returns insights."
      />
      <ReportsDashboard />
    </div>
  );
}

