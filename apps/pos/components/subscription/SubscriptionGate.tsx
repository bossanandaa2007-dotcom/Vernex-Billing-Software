'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSubscriptionStatus } from '@/components/subscription/useSubscriptionStatus';
import { PLAN_LIST, formatPlanPrice } from '@/lib/subscription-plans';

// Pages a locked business can still open: paying for a plan, and asking Vernex
// for help with that payment. Everything else shows the lock screen.
const OPEN_WHEN_LOCKED = ['/subscription', '/support'];

export function SubscriptionGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { subscription, isBlocked, expiredMessage } = useSubscriptionStatus();
  const onOpenPage = OPEN_WHEN_LOCKED.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));

  if (!isBlocked || onOpenPage) return <>{children}</>;

  return (
    <div className="w-full">
      <div className="mx-auto max-w-2xl rounded-2xl border border-red-200 bg-white p-8 text-center dark:border-red-900/60 dark:bg-vernex-navy">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-300">
          <Lock className="h-7 w-7" />
        </div>
        <h1 className="mt-4 text-xl font-bold text-vernex-navy dark:text-white">
          {subscription?.isPlanExpired ? 'Your subscription has ended' : 'Your trial has expired'}
        </h1>
        <p className="mt-2 text-sm text-vernex-muted">{expiredMessage}</p>
        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          {PLAN_LIST.map((plan) => (
            <div key={plan.key} className="rounded-xl border border-vernex-border p-3 text-left dark:border-[#1E335F]">
              <p className="text-xs font-semibold uppercase text-vernex-muted">{plan.name}</p>
              <p className="text-lg font-black text-vernex-navy dark:text-white">{formatPlanPrice(plan)}</p>
            </div>
          ))}
        </div>
        <Button asChild className="mt-6 h-11 w-full sm:w-auto sm:px-8">
          <Link href="/subscription">Choose a plan &amp; pay</Link>
        </Button>
        <p className="mt-4 text-xs text-vernex-muted">
          Your data is safe. Billing, products, reports and every other feature unlock the moment your payment is confirmed.
        </p>
      </div>
    </div>
  );
}
