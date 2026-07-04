'use client';

import { useEffect, useState } from 'react';
import { getSubscription } from '@/lib/client-data';

type Subscription = {
  status: 'TRIAL' | 'ACTIVE' | 'EXPIRED' | 'SUSPENDED';
  planName: string;
  daysRemaining: number;
  isTrialActive: boolean;
  isTrialExpired: boolean;
  canUsePaidFeatures: boolean;
};

export function TrialBanner() {
  const [subscription, setSubscription] = useState<Subscription | null>(null);

  useEffect(() => {
    getSubscription()
      .then((data) => setSubscription(data?.subscription ?? null))
      .catch(() => setSubscription(null));
  }, []);

  if (!subscription) return null;
  if (subscription.status === 'ACTIVE') {
    return (
      <div className="border-b border-emerald-200 bg-emerald-50 px-4 py-2 text-center text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
        {subscription.planName} active
      </div>
    );
  }
  if (subscription.isTrialExpired || subscription.status === 'EXPIRED' || subscription.status === 'SUSPENDED') {
    return (
      <div className="border-b border-red-200 bg-red-50 px-4 py-3 text-center text-sm font-medium text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
        Your trial has expired. Contact Vernex to activate your license.
      </div>
    );
  }
  return (
    <div className="border-b border-vernex-gold/30 bg-amber-50 px-4 py-2 text-center text-sm text-amber-900 dark:border-vernex-gold/40 dark:bg-vernex-navy dark:text-amber-100">
      Free Trial: {subscription.daysRemaining} day{subscription.daysRemaining === 1 ? '' : 's'} remaining.
    </div>
  );
}
