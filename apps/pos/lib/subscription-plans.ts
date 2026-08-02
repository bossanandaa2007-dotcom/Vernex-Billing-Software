// Single source of truth for what a licence costs and how long it lasts.
// Change `price` here (and nothing else) to re-price the product; every screen,
// API and receipt reads these values.

export type PlanKey = 'MONTHLY' | 'YEARLY';

export type Plan = {
  key: PlanKey;
  name: string;
  price: number;
  currency: string;
  durationDays: number;
  tagline: string;
  highlight?: string;
};

export const SUBSCRIPTION_PLANS: Record<PlanKey, Plan> = {
  MONTHLY: {
    key: 'MONTHLY',
    name: 'Monthly Plan',
    price: 300,
    currency: 'INR',
    durationDays: 30,
    tagline: 'Billed every month. Cancel any time.',
  },
  YEARLY: {
    key: 'YEARLY',
    name: 'Yearly Plan',
    price: 3000,
    currency: 'INR',
    durationDays: 365,
    tagline: 'Billed once a year — two months free.',
    highlight: 'Best value',
  },
};

export const PLAN_KEYS: PlanKey[] = ['MONTHLY', 'YEARLY'];

export const PLAN_LIST = PLAN_KEYS.map((key) => SUBSCRIPTION_PLANS[key]);

export function getPlan(key: string): Plan | null {
  return (SUBSCRIPTION_PLANS as Record<string, Plan | undefined>)[key] ?? null;
}

// How many days before the licence lapses the "please renew" prompt appears.
export const RENEWAL_REMINDER_DAYS = 5;

// The business name shown inside the Razorpay Checkout dialog.
export const CHECKOUT_BRAND = {
  name: process.env.NEXT_PUBLIC_VERNEX_ACCOUNT_NAME ?? 'Vernex Business Suite',
  logo: '/assets/vernex-logo.png',
  themeColor: '#0B2A6B',
};

export function formatPlanPrice(plan: Plan) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: plan.currency,
    maximumFractionDigits: 0,
  }).format(plan.price);
}
