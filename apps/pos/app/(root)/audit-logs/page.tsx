import { AuditLogTable } from '@/components/audit/AuditLogTable';
import { PageHeading } from '@/components/dashboard/page-heading';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Audit Logs' };

export default function AuditLogsPage() {
  return (
    <section className="w-full">
      <PageHeading title="Audit Logs" description="Review billing, inventory, settings, and staff activity." />
      <AuditLogTable />
    </section>
  );
}
