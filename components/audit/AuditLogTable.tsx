'use client';

import { EmptyState } from '@/components/ui/empty-state';
import { LoadingState } from '@/components/ui/loading-state';
import { AlertCircle, ScrollText } from 'lucide-react';
import { useEffect, useState } from 'react';

type AuditLog = {
  id: string;
  userNameSnapshot: string;
  roleSnapshot: string;
  action: string;
  entityType: string;
  referenceNumber?: string | null;
  description: string;
  createdAt: string;
};

function formatAction(action: string) {
  return action
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function AuditLogTable() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/audit-logs')
      .then(async (response) => {
        if (!response.ok) throw new Error();
        setLogs(await response.json());
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="rounded-xl border border-vernex-border bg-white shadow-sm dark:border-[#1E335F] dark:bg-vernex-navy"><LoadingState label="Loading activity history..." /></div>;
  }

  if (error) {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-5 text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300" role="alert">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
        <div><p className="font-semibold">Unable to load activity history</p><p className="mt-1 text-sm">Please check your connection and try again.</p></div>
      </div>
    );
  }

  return (
    <div className="w-full overflow-hidden rounded-xl border border-vernex-border bg-white shadow-sm dark:border-[#1E335F] dark:bg-vernex-navy">
      {logs.length ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] text-sm">
            <thead className="bg-vernex-surface text-left text-xs uppercase text-vernex-muted dark:bg-vernex-dark dark:text-slate-300">
              <tr><th className="px-4 py-3">Time</th><th>User</th><th>Role</th><th>Activity</th><th>Reference</th><th>Description</th></tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-t border-vernex-border transition hover:bg-vernex-surface/60 dark:border-[#1E335F] dark:hover:bg-vernex-dark/60">
                  <td className="whitespace-nowrap px-4 py-3">{new Date(log.createdAt).toLocaleString()}</td>
                  <td className="font-semibold text-vernex-navy dark:text-white">{log.userNameSnapshot}</td>
                  <td>{formatAction(log.roleSnapshot)}</td>
                  <td>{formatAction(log.action)}</td>
                  <td>{log.referenceNumber || '-'}</td>
                  <td>{log.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState
          icon={<ScrollText className="h-7 w-7" />}
          title="No audit logs yet"
          description="System activities will be recorded here automatically."
        />
      )}
    </div>
  );
}
