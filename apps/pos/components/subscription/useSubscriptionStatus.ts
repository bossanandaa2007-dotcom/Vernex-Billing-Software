'use client';

import { useEffect, useState } from 'react';
import { getSubscription } from '@/lib/client-data';

type SubscriptionStatus = {
  canUsePaidFeatures: boolean;
  isTrialExpired: boolean;
  status: string;
};

export function useSubscriptionStatus() {
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  useEffect(() => {
    getSubscription()
      .then((data) => setSubscription(data?.subscription ?? null))
      .catch(() => setSubscription(null));
  }, []);
  return {
    subscription,
    isBlocked: subscription ? !subscription.canUsePaidFeatures : false,
    expiredMessage: 'Your trial has expired. Contact Vernex to activate your license.',
  };
}
