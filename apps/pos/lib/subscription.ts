import { SubscriptionStatus } from '@/src/types/domain';
import { AuthError, CurrentUserContext } from '@/lib/auth';
import { createServerClient } from '@/src/lib/supabase/server';
import { RENEWAL_REMINDER_DAYS, type PlanKey } from '@/lib/subscription-plans';

export type BusinessSubscriptionStatus = {
  businessId: string;
  status: SubscriptionStatus;
  planName: string;
  planPeriod: PlanKey | null;
  trialStartedAt: Date | null;
  trialEndsAt: Date | null;
  planExpiresAt: Date | null;
  /** When access actually runs out — the paid period if activated, else the trial end. */
  accessEndsAt: Date | null;
  activatedAt: Date | null;
  suspendedAt: Date | null;
  daysRemaining: number;
  isTrialActive: boolean;
  isTrialExpired: boolean;
  /** A paid plan whose period has run out — the business must renew. */
  isPlanExpired: boolean;
  /** Inside the last few days of the trial or paid period: prompt to renew. */
  needsRenewalSoon: boolean;
  renewalReminderDays: number;
  canUsePaidFeatures: boolean;
};

const daysBetween = (from: Date, to: Date) => Math.max(0, Math.ceil((to.getTime() - from.getTime()) / 86_400_000));

// Subscription state changes rarely; a short cache spares a Supabase round-trip
// on every guarded request (matches the 30s dashboard cache pattern).
const subscriptionCache = new Map<string, { data: BusinessSubscriptionStatus; expires: number }>();
const SUBSCRIPTION_CACHE_MS = 30_000;

// Called after an admin approves a payment so the business is unlocked on its
// very next request instead of waiting out the cache window.
export function invalidateSubscriptionCache(businessId?: string) {
  if (businessId) subscriptionCache.delete(businessId);
  else subscriptionCache.clear();
}

export async function getBusinessSubscriptionStatus(businessId: string): Promise<BusinessSubscriptionStatus> {
  const cached = subscriptionCache.get(businessId);
  if (cached && cached.expires > Date.now()) return cached.data;
  const supabase = await createServerClient();
  const { data: business } = await supabase.from('Business').select('*').eq('id', businessId).maybeSingle();
  if (!business) throw new AuthError('Business account not found.', 403);
  const now = new Date();
  const trialEndsAt = business.trialEndsAt ? new Date(business.trialEndsAt) : null;
  // A NULL planExpiresAt on an ACTIVE business means a perpetual licence (this
  // is how every business activated before paid plans existed is stored).
  const planExpiresAt = business.planExpiresAt ? new Date(business.planExpiresAt) : null;

  const trialStillInWindow = !!trialEndsAt && trialEndsAt >= now;
  const isTrialActive = business.subscriptionStatus === 'TRIAL' && trialStillInWindow;
  const isTrialExpired = business.subscriptionStatus === 'EXPIRED' || (business.subscriptionStatus === 'TRIAL' && !!trialEndsAt && trialEndsAt < now);

  const isPaidPlanCurrent = business.subscriptionStatus === 'ACTIVE' && (!planExpiresAt || planExpiresAt >= now);
  const isPlanExpired = business.subscriptionStatus === 'ACTIVE' && !!planExpiresAt && planExpiresAt < now;

  const canUsePaidFeatures = isPaidPlanCurrent || isTrialActive;
  const accessEndsAt = business.subscriptionStatus === 'ACTIVE' ? planExpiresAt : trialEndsAt;
  const daysRemaining = accessEndsAt ? daysBetween(now, accessEndsAt) : 0;

  const status: BusinessSubscriptionStatus = {
    businessId,
    status: isPlanExpired
      ? 'EXPIRED'
      : isTrialExpired && business.subscriptionStatus === 'TRIAL'
        ? 'EXPIRED'
        : business.subscriptionStatus,
    planName: business.planName,
    planPeriod: (business.planPeriod as PlanKey | null) ?? null,
    trialStartedAt: business.trialStartedAt ? new Date(business.trialStartedAt) : null,
    trialEndsAt,
    planExpiresAt,
    accessEndsAt,
    activatedAt: business.activatedAt ? new Date(business.activatedAt) : null,
    suspendedAt: business.suspendedAt ? new Date(business.suspendedAt) : null,
    daysRemaining,
    isTrialActive,
    isTrialExpired,
    isPlanExpired,
    // Only warn while access still works; once it lapses the hard lock takes over.
    needsRenewalSoon: canUsePaidFeatures && !!accessEndsAt && daysRemaining <= RENEWAL_REMINDER_DAYS,
    renewalReminderDays: RENEWAL_REMINDER_DAYS,
    canUsePaidFeatures,
  };
  subscriptionCache.set(businessId, { data: status, expires: Date.now() + SUBSCRIPTION_CACHE_MS });
  return status;
}

export async function isTrialActive(businessId: string) {
  return (await getBusinessSubscriptionStatus(businessId)).isTrialActive;
}

export async function isTrialExpired(businessId: string) {
  return (await getBusinessSubscriptionStatus(businessId)).isTrialExpired;
}

export async function canUsePaidFeatures(businessId: string) {
  return (await getBusinessSubscriptionStatus(businessId)).canUsePaidFeatures;
}

// Message shown wherever a locked business is turned away. Kept in one place so
// the API error, the banner and the lock screen always agree.
export function subscriptionLockMessage(subscription: Pick<BusinessSubscriptionStatus, 'isPlanExpired' | 'status'>) {
  if (subscription.isPlanExpired) return 'Your subscription has ended. Renew your plan to continue using Vernex.';
  if (subscription.status === 'SUSPENDED') return 'Your account is suspended. Contact Vernex to restore access.';
  return 'Your trial has expired. Choose a monthly or yearly plan to continue using Vernex.';
}

export async function requireActiveSubscription(ctx: CurrentUserContext) {
  const subscription = await getBusinessSubscriptionStatus(ctx.businessId);
  if (!subscription.canUsePaidFeatures) {
    throw new AuthError(subscriptionLockMessage(subscription), 402);
  }
  return subscription;
}
