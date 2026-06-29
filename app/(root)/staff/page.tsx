import { StaffTable } from '@/components/staff/StaffTable';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Staff Management' };

export default function StaffPage() {
  return (
    <section className="w-full space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-vernex-navy dark:text-white">Staff Management</h1>
        <p className="text-sm text-vernex-muted dark:text-slate-300">Owner-only staff profiles, roles, and active status.</p>
      </div>
      <StaffTable />
    </section>
  );
}

