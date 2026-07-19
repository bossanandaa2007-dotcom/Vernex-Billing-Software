'use client';

import { useRouter } from 'next/navigation';
import { Building2 } from 'lucide-react';

type Option = { id: string; name: string };

export function AnalyticsBusinessFilter({ businesses, selected }: { businesses: Option[]; selected: string }) {
  const router = useRouter();

  function onChange(value: string) {
    router.push(value ? `/super-admin/analytics?businessId=${encodeURIComponent(value)}` : '/super-admin/analytics');
  }

  return (
    <label className="relative flex items-center">
      <Building2 className="pointer-events-none absolute left-3 h-4 w-4 text-slate-400" />
      <select
        aria-label="Filter analytics by business"
        value={selected}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full min-w-[220px] rounded-md border border-slate-200 bg-white pl-9 pr-8 text-sm shadow-sm outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 dark:border-slate-700 dark:bg-slate-950 sm:w-64"
      >
        <option value="">All businesses (platform)</option>
        {businesses.map((business) => (
          <option key={business.id} value={business.id}>
            {business.name}
          </option>
        ))}
      </select>
    </label>
  );
}
