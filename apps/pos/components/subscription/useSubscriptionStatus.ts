'use client';

import { useEffect, useState } from 'react';
import { getSubscription } from '@/lib/client-data';

export type SubscriptionStatus = {
  status: 'TRIAL' | 'ACTIVE' | 'EXPIRED' | 'SUSPENDED';
  planName: string;
  planPeriod: string | null;
  daysRemaining: number;
  accessEndsAt: string | null;
  isTrialActive: boolean;
  isTrialExpired: boolean;
  isPlanExpired: boolean;
  needsRenewalSoon: boolean;
  renewalReminderDays: number;
  canUsePaidFeatures: boolean;
};

export function expiredMessageFor(subscription: SubscriptionStatus | null) {
  if (subscription?.isPlanExpired) return 'Your subscription has ended. Renew your plan to continue using Vernex.';
  if (subscription?.status === 'SUSPENDED') return 'Your account is suspended. Contact Vernex to restore access.';
  return 'Your trial has expired. Choose a monthly or yearly plan to continue using Vernex.';
}

export function useSubscriptionStatus() {
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    getSubscription()
      .then((data) => setSubscription(data?.subscription ?? null))
      .catch(() => setSubscription(null))
      .finally(() => setLoading(false));
  }, []);
  return {
    subscription,
    loading,
    // Until the status is known, nothing is blocked — the server-side guards
    // remain authoritative, so an in-flight check never hides a working app.
    isBlocked: subscription ? !subscription.canUsePaidFeatures : false,
    expiredMessage: expiredMessageFor(subscription),
  };
}
