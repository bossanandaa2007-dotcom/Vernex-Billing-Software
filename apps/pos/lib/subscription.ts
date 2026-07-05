import { SubscriptionStatus } from '@prisma/client';
import { AuthError, CurrentUserContext } from '@/lib/auth';
import { db } from '@/lib/db';

export type BusinessSubscriptionStatus = {
  businessId: string;
  status: SubscriptionStatus;
  planName: string;
  trialStartedAt: Date | null;
  trialEndsAt: Date | null;
  activatedAt: Date | null;
  suspendedAt: Date | null;
  daysRemaining: number;
  isTrialActive: boolean;
  isTrialExpired: boolean;
  canUsePaidFeatures: boolean;
};

const daysBetween = (from: Date, to: Date) => Math.max(0, Math.ceil((to.getTime() - from.getTime()) / 86_400_000));

export async function getBusinessSubscriptionStatus(businessId: string): Promise<BusinessSubscriptionStatus> {
  const business = await db.business.findUnique({ where: { id: businessId } });
  if (!business) throw new AuthError('Business account not found.', 403);
  const now = new Date();
  const trialEndsAt = business.trialEndsAt;
  const trialStillInWindow = !!trialEndsAt && trialEndsAt >= now;
  const isTrialActive = business.subscriptionStatus === 'TRIAL' && trialStillInWindow;
  const isTrialExpired = business.subscriptionStatus === 'EXPIRED' || (business.subscriptionStatus === 'TRIAL' && !!trialEndsAt && trialEndsAt < now);
  const canUsePaidFeatures = business.subscriptionStatus === 'ACTIVE' || isTrialActive;
  return {
    businessId,
    status: isTrialExpired && business.subscriptionStatus === 'TRIAL' ? 'EXPIRED' : business.subscriptionStatus,
    planName: business.planName,
    trialStartedAt: business.trialStartedAt,
    trialEndsAt,
    activatedAt: business.activatedAt,
    suspendedAt: business.suspendedAt,
    daysRemaining: trialEndsAt ? daysBetween(now, trialEndsAt) : 0,
    isTrialActive,
    isTrialExpired,
    canUsePaidFeatures,
  };
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
    throw new AuthError('Your trial has expired. Contact Vernex to activate your license.', 402);
  }
  return subscription;
}
