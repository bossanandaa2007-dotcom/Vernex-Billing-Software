import { SubscriptionStatus } from '@/src/types/domain';
import { AuthError, CurrentUserContext } from '@/lib/auth';
import { createServerClient } from '@/src/lib/supabase/server';

export type BusinessSubscriptionStatus = {
  businessId: string;
  status: SubscriptionStatus;
  planName: string;
  planPeriod: string | null;
  trialStartedAt: Date | null;
  trialEndsAt: Date | null;
  planExpiresAt: Date | null;
  activatedAt: Date | null;
  suspendedAt: Date | null;
  daysRemaining: number;
  accessEndsAt: Date | null;
  isTrialActive: boolean;
  isTrialExpired: boolean;
  isPlanExpired: boolean;
  needsRenewalSoon: boolean;
  renewalReminderDays: number;
  canUsePaidFeatures: boolean;
};

const daysBetween = (from: Date, to: Date) => Math.max(0, Math.ceil((to.getTime() - from.getTime()) / 86_400_000));

// Subscription state changes rarely; a short cache spares a Supabase round-trip
// on every guarded request (matches the 30s dashboard cache pattern).
const subscriptionCache = new Map<string, { data: BusinessSubscriptionStatus; expires: number }>();
const SUBSCRIPTION_CACHE_MS = 30_000;
const RENEWAL_REMINDER_DAYS = 5;

export async function getBusinessSubscriptionStatus(businessId: string): Promise<BusinessSubscriptionStatus> {
  const cached = subscriptionCache.get(businessId);
  if (cached && cached.expires > Date.now()) return cached.data;
  const supabase = await createServerClient();
  const { data: business } = await supabase.from('Business').select('*').eq('id', businessId).maybeSingle();
  if (!business) throw new AuthError('Business account not found.', 403);
  const now = new Date();
  const trialEndsAt = business.trialEndsAt ? new Date(business.trialEndsAt) : null;
  const planExpiresAt = business.planExpiresAt ? new Date(business.planExpiresAt) : null;
  const trialStillInWindow = !!trialEndsAt && trialEndsAt >= now;
  const paidStillInWindow = business.subscriptionStatus === 'ACTIVE' && (!planExpiresAt || planExpiresAt >= now);
  const isTrialActive = business.subscriptionStatus === 'TRIAL' && trialStillInWindow;
  const isTrialExpired = business.subscriptionStatus === 'EXPIRED' || (business.subscriptionStatus === 'TRIAL' && !!trialEndsAt && trialEndsAt < now);
  const isPlanExpired = business.subscriptionStatus === 'ACTIVE' && !!planExpiresAt && planExpiresAt < now;
  const canUsePaidFeatures = paidStillInWindow || isTrialActive;
  const accessEndsAt = isTrialActive ? trialEndsAt : business.subscriptionStatus === 'ACTIVE' ? planExpiresAt : null;
  const daysRemaining = accessEndsAt ? daysBetween(now, accessEndsAt) : canUsePaidFeatures ? 9999 : 0;
  const status: BusinessSubscriptionStatus = {
    businessId,
    status: (isTrialExpired || isPlanExpired) ? 'EXPIRED' : business.subscriptionStatus,
    planName: business.planName,
    planPeriod: business.planPeriod ?? null,
    trialStartedAt: business.trialStartedAt ? new Date(business.trialStartedAt) : null,
    trialEndsAt,
    planExpiresAt,
    activatedAt: business.activatedAt ? new Date(business.activatedAt) : null,
    suspendedAt: business.suspendedAt ? new Date(business.suspendedAt) : null,
    daysRemaining,
    accessEndsAt,
    isTrialActive,
    isTrialExpired,
    isPlanExpired,
    needsRenewalSoon: canUsePaidFeatures && daysRemaining <= RENEWAL_REMINDER_DAYS,
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

export async function requireActiveSubscription(ctx: CurrentUserContext) {
  const subscription = await getBusinessSubscriptionStatus(ctx.businessId);
  if (!subscription.canUsePaidFeatures) {
    throw new AuthError('Your access has expired. Choose a plan and submit payment details to continue.', 402);
  }
  return subscription;
}
