import { AuditLogTable } from '@/components/audit/AuditLogTable';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Audit Logs' };

export default function AuditLogsPage() {
  return (
    <section className="w-full space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-vernex-navy dark:text-white">Audit Logs</h1>
        <p className="text-sm text-vernex-muted dark:text-slate-300">Read-only operational history for billing, returns, stock, settings, and staff changes.</p>
      </div>
      <AuditLogTable />
    </section>
  );
}

