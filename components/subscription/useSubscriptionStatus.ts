'use client';

import { useEffect, useState } from 'react';

type SubscriptionStatus = {
  canUsePaidFeatures: boolean;
  isTrialExpired: boolean;
  status: string;
};

export function useSubscriptionStatus() {
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  useEffect(() => {
    fetch('/api/subscription')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setSubscription(data?.subscription ?? null))
      .catch(() => setSubscription(null));
  }, []);
  return {
    subscription,
    isBlocked: subscription ? !subscription.canUsePaidFeatures : false,
    expiredMessage: 'Your free trial has expired. Contact Vernex to activate your account.',
  };
}

