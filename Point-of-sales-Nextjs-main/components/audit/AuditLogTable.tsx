'use client';

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

export function AuditLogTable() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/audit-logs')
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Unable to load audit logs.');
        setLogs(data);
      })
      .catch((err) => setError(err.message));
  }, []);

  if (error) return <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}</div>;

  return (
    <div className="w-full overflow-hidden rounded-xl border border-vernex-border bg-white shadow-sm dark:border-[#1E335F] dark:bg-vernex-navy">
      <table className="w-full text-sm">
        <thead className="bg-vernex-surface text-left text-vernex-muted dark:bg-vernex-dark dark:text-slate-300">
          <tr><th className="p-3">Time</th><th>User</th><th>Role</th><th>Action</th><th>Reference</th><th>Description</th></tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr key={log.id} className="border-t border-vernex-border dark:border-[#1E335F]">
              <td className="p-3">{new Date(log.createdAt).toLocaleString()}</td>
              <td>{log.userNameSnapshot}</td>
              <td>{log.roleSnapshot}</td>
              <td className="font-medium text-vernex-navy dark:text-white">{log.action}</td>
              <td>{log.referenceNumber || '-'}</td>
              <td>{log.description}</td>
            </tr>
          ))}
          {!logs.length && <tr><td className="p-6 text-center text-vernex-muted" colSpan={6}>No audit logs yet.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

