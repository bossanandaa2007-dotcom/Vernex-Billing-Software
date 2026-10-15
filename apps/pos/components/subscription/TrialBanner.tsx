'use client';

import Link from 'next/link';
import { RENEWAL_REMINDER_DAYS } from '@/lib/subscription-plans';
import { useSubscriptionStatus } from '@/components/subscription/useSubscriptionStatus';

function RenewLink({ label = 'Renew now', className = '' }: { label?: string; className?: string }) {
  return (
    <Link href="/subscription" className={`ml-2 inline-flex items-center rounded-full px-3 py-0.5 text-xs font-bold underline-offset-2 hover:underline ${className}`}>
      {label}
    </Link>
  );
}

export function TrialBanner() {
  const { subscription } = useSubscriptionStatus();

  if (!subscription) return null;

  // Locked out: trial over, paid plan lapsed, or account suspended.
  if (!subscription.canUsePaidFeatures) {
    return (
      <div className="border-b border-red-200 bg-red-50 px-4 py-3 text-center text-sm font-medium text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
        {subscription.isPlanExpired
          ? 'Your subscription has ended. Renew your plan to continue using Vernex.'
          : subscription.status === 'SUSPENDED'
            ? 'Your account is suspended. Contact Vernex to restore access.'
            : 'Your trial has expired. Choose a monthly or yearly plan to continue using Vernex.'}
        <RenewLink label="Choose a plan" className="bg-red-600 text-white hover:bg-red-700 hover:no-underline" />
      </div>
    );
  }

  // Final days of the trial or the paid period — nudge before service stops.
  if (subscription.needsRenewalSoon) {
    const days = subscription.daysRemaining;
    return (
      <div className="border-b border-amber-300 bg-amber-50 px-4 py-2 text-center text-sm font-medium text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100">
        {days === 0 ? 'Your plan ends today.' : `Only ${days} day${days === 1 ? '' : 's'} left on your ${subscription.status === 'TRIAL' ? 'free trial' : 'plan'}.`} Renew now for uninterrupted service.
        <RenewLink className="bg-amber-600 text-white hover:bg-amber-700 hover:no-underline" />
      </div>
    );
  }

  if (subscription.status === 'ACTIVE') {
    return (
      <div className="border-b border-emerald-200 bg-emerald-50 px-4 py-2 text-center text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
        {subscription.planName} active
        {subscription.accessEndsAt && ` until ${new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(new Date(subscription.accessEndsAt))}`}
      </div>
    );
  }

  return (
    <div className="border-b border-vernex-gold/30 bg-amber-50 px-4 py-2 text-center text-sm text-amber-900 dark:border-vernex-gold/40 dark:bg-vernex-navy dark:text-amber-100">
      Free Trial: {subscription.daysRemaining} day{subscription.daysRemaining === 1 ? '' : 's'} remaining.
      {subscription.daysRemaining <= RENEWAL_REMINDER_DAYS * 2 && <RenewLink label="View plans" className="text-amber-900 dark:text-amber-100" />}
    </div>
  );
}
