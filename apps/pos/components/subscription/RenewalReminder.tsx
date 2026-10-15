'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSubscriptionStatus } from '@/components/subscription/useSubscriptionStatus';
import { PLAN_LIST, formatPlanPrice } from '@/lib/subscription-plans';

// Dismissals are remembered for the rest of the day only, so the prompt comes
// back each day of the final stretch instead of being silenced for good.
const dismissKey = 'vernex-renewal-dismissed';

function dismissedToday() {
  try {
    return window.localStorage.getItem(dismissKey) === new Date().toDateString();
  } catch {
    return false;
  }
}

export function RenewalReminder() {
  const pathname = usePathname();
  const { subscription } = useSubscriptionStatus();
  const [open, setOpen] = useState(false);

  const due = Boolean(subscription?.needsRenewalSoon);
  const onSubscriptionPage = pathname === '/subscription';

  useEffect(() => {
    if (!due || onSubscriptionPage) return setOpen(false);
    setOpen(!dismissedToday());
  }, [due, onSubscriptionPage]);

  if (!open || !subscription) return null;

  const days = subscription.daysRemaining;
  const endsOn = subscription.accessEndsAt
    ? new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(new Date(subscription.accessEndsAt))
    : null;

  function dismiss() {
    try {
      window.localStorage.setItem(dismissKey, new Date().toDateString());
    } catch {}
    setOpen(false);
  }

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-slate-950/50 p-4" role="dialog" aria-modal="true" aria-labelledby="renewal-title">
      <div className="w-full max-w-md rounded-2xl border border-vernex-border bg-white p-6 shadow-2xl dark:border-[#1E335F] dark:bg-vernex-navy">
        <div className="flex items-start justify-between gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-300">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <button onClick={dismiss} aria-label="Close reminder" className="rounded-md p-1 text-vernex-muted transition hover:bg-vernex-surface dark:hover:bg-vernex-dark">
            <X className="h-4 w-4" />
          </button>
        </div>
        <h2 id="renewal-title" className="mt-3 text-lg font-bold text-vernex-navy dark:text-white">
          {days === 0
            ? 'Your plan ends today'
            : `Only ${days} day${days === 1 ? '' : 's'} left on your plan`}
        </h2>
        <p className="mt-2 text-sm text-vernex-muted">
          {endsOn ? `Your access ends on ${endsOn}. ` : ''}
          Please renew now for uninterrupted service — billing stops working the moment it lapses.
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {PLAN_LIST.map((plan) => (
            <div key={plan.key} className="rounded-xl border border-vernex-border p-3 dark:border-[#1E335F]">
              <p className="text-xs font-semibold uppercase text-vernex-muted">{plan.name}</p>
              <p className="text-lg font-black text-vernex-navy dark:text-white">{formatPlanPrice(plan)}</p>
            </div>
          ))}
        </div>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row-reverse">
          <Button asChild className="h-11 flex-1"><Link href="/subscription" onClick={() => setOpen(false)}>Renew now</Link></Button>
          <Button variant="outline" className="h-11 flex-1" onClick={dismiss}>Remind me later</Button>
        </div>
      </div>
    </div>
  );
}
