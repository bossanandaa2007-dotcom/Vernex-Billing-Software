'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, Lock, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getAppContext, resetAuthContextCache } from '@/lib/client-data';
import {
  CHECKOUT_BRAND,
  PLAN_LIST,
  SUBSCRIPTION_PLANS,
  formatPlanPrice,
  type PlanKey,
} from '@/lib/subscription-plans';

type Payment = {
  id: string;
  plan: string;
  planName: string;
  amount: number;
  currency: string;
  reference: string;
  paymentId: string | null;
  status: 'APPROVED' | 'FAILED' | 'REJECTED' | 'PENDING';
  failureReason: string;
  activatedUntil: string | null;
  createdAt: string;
};

type Subscription = {
  status: string;
  planName: string;
  daysRemaining: number;
  canUsePaidFeatures: boolean;
  isPlanExpired: boolean;
  accessEndsAt: string | null;
};

type CheckoutSession = {
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
  planName: string;
  businessName: string;
  customer: { name: string; email: string };
};

// Razorpay Checkout is injected by their script; we only touch the bits we use.
type RazorpayResponse = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};
type RazorpayInstance = { open: () => void; on: (event: string, handler: (payload: unknown) => void) => void };
declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => RazorpayInstance;
  }
}

const CHECKOUT_SCRIPT = 'https://checkout.razorpay.com/v1/checkout.js';

// Loaded on demand rather than in the document head, so the payment script is
// only fetched by someone who actually opens this page.
function loadCheckoutScript() {
  return new Promise<boolean>((resolve) => {
    if (typeof window === 'undefined') return resolve(false);
    if (window.Razorpay) return resolve(true);
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${CHECKOUT_SCRIPT}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve(Boolean(window.Razorpay)), { once: true });
      existing.addEventListener('error', () => resolve(false), { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = CHECKOUT_SCRIPT;
    script.async = true;
    script.onload = () => resolve(Boolean(window.Razorpay));
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

const formatDate = (value?: string | null) =>
  value ? new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(new Date(value)) : '—';

export function SubscriptionPlans() {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [selected, setSelected] = useState<PlanKey>('YEARLY');
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const [context, history] = await Promise.all([
        getAppContext(),
        fetch('/api/subscription/payments').then((response) => response.json()),
      ]);
      setSubscription(context?.subscription ?? null);
      setPayments(history?.payments ?? []);
    } catch {
      setError('Unable to load your subscription. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const plan = SUBSCRIPTION_PLANS[selected];

  async function pay() {
    setError('');
    setSuccess('');
    setPaying(true);
    try {
      const response = await fetch('/api/subscription/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: selected }),
      });
      const session = (await response.json().catch(() => ({}))) as CheckoutSession & { error?: string };
      if (!response.ok) {
        setError(session.error || 'Unable to start the payment. Please try again.');
        setPaying(false);
        return;
      }

      if (!(await loadCheckoutScript())) {
        setError('Could not load the secure payment window. Check your internet connection and try again.');
        setPaying(false);
        return;
      }

      const checkout = new window.Razorpay!({
        key: session.keyId,
        order_id: session.orderId,
        amount: session.amount,
        currency: session.currency,
        name: CHECKOUT_BRAND.name,
        description: `${session.planName} — ${session.businessName}`,
        image: CHECKOUT_BRAND.logo,
        theme: { color: CHECKOUT_BRAND.themeColor },
        prefill: { name: session.customer.name, email: session.customer.email },
        // Razorpay hands us the signed result; the server decides if it is real.
        handler: async (result: RazorpayResponse) => {
          try {
            const verification = await fetch('/api/subscription/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(result),
            });
            const verified = await verification.json().catch(() => ({}));
            if (!verification.ok) {
              setError(verified.error || 'Payment received but not confirmed. Contact Vernex if money was debited.');
              return;
            }
            setSuccess(`Payment successful. Your ${session.planName} is active until ${formatDate(verified.activatedUntil)}.`);
            // Drop the cached subscription verdict so the app unlocks at once.
            resetAuthContextCache();
            await load();
          } finally {
            setPaying(false);
          }
        },
        modal: {
          // Closing the window is not an error — just let them try again.
          ondismiss: () => setPaying(false),
        },
      });

      checkout.on('payment.failed', (payload: unknown) => {
        const description = (payload as { error?: { description?: string } })?.error?.description;
        setError(description || 'The payment did not go through. No money was taken — please try again.');
        setPaying(false);
      });

      checkout.open();
    } catch {
      setError('Unable to start the payment. Please try again.');
      setPaying(false);
    }
  }

  if (loading) {
    return <div className="flex min-h-48 w-full items-center justify-center text-sm text-vernex-muted">Loading your subscription...</div>;
  }

  return (
    <div className="w-full space-y-6">
      {/* Current state */}
      <section className="rounded-2xl border border-vernex-border bg-white p-5 dark:border-[#1E335F] dark:bg-vernex-navy">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-vernex-navy dark:text-white">Subscription</h1>
            <p className="mt-1 text-sm text-vernex-muted">
              {subscription?.canUsePaidFeatures
                ? `${subscription.planName || 'Your plan'} is active — ${subscription.daysRemaining} day${subscription.daysRemaining === 1 ? '' : 's'} remaining (till ${formatDate(subscription.accessEndsAt)}).`
                : 'Your access has ended. Choose a plan and pay to switch the software back on.'}
            </p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-bold ${
              subscription?.canUsePaidFeatures
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                : 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300'
            }`}
          >
            {subscription?.status ?? 'UNKNOWN'}
          </span>
        </div>
      </section>

      {success && (
        <section className="flex items-start gap-3 rounded-2xl border border-emerald-300 bg-emerald-50 p-5 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
          <p className="font-medium">{success}</p>
        </section>
      )}

      {/* Plans */}
      <section className="grid gap-4 sm:grid-cols-2">
        {PLAN_LIST.map((item) => {
          const active = item.key === selected;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => setSelected(item.key)}
              className={`rounded-2xl border p-5 text-left transition ${
                active
                  ? 'border-vernex-gold bg-vernex-gold/5 ring-2 ring-vernex-gold/30'
                  : 'border-vernex-border bg-white hover:border-vernex-gold/50 dark:border-[#1E335F] dark:bg-vernex-navy'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-vernex-navy dark:text-white">{item.name}</span>
                {item.highlight && <span className="rounded-full bg-vernex-gold px-2 py-0.5 text-[10px] font-bold uppercase text-vernex-dark">{item.highlight}</span>}
              </div>
              <p className="mt-3 text-3xl font-black text-vernex-navy dark:text-white">{formatPlanPrice(item)}</p>
              <p className="mt-1 text-xs text-vernex-muted">{item.tagline}</p>
              <p className="mt-3 flex items-center gap-2 text-xs font-semibold text-vernex-muted">
                <ShieldCheck className="h-4 w-4 text-vernex-gold" />
                {item.durationDays} days of full access
              </p>
              {active && <p className="mt-3 flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400"><CheckCircle2 className="h-4 w-4" />Selected</p>}
            </button>
          );
        })}
      </section>

      {/* Pay */}
      <section className="rounded-2xl border border-vernex-border bg-white p-6 text-center dark:border-[#1E335F] dark:bg-vernex-navy">
        <h2 className="font-bold text-vernex-navy dark:text-white">Pay {formatPlanPrice(plan)} for the {plan.name}</h2>
        <p className="mx-auto mt-1 max-w-lg text-sm text-vernex-muted">
          Pay by UPI, card, net banking or wallet. Your licence activates the moment the payment succeeds — nothing to send us and nobody to wait for.
        </p>
        {error && <p className="mx-auto mt-4 max-w-lg text-sm font-medium text-red-600">{error}</p>}
        <Button onClick={pay} disabled={paying} className="mt-5 h-12 w-full px-10 sm:w-auto">
          {paying ? 'Opening secure payment...' : `Pay ${formatPlanPrice(plan)} now`}
        </Button>
        <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-vernex-muted">
          <Lock className="h-3.5 w-3.5" />
          Payments are processed securely by Razorpay. Vernex never sees your card details.
        </p>
      </section>

      {/* Receipts */}
      {payments.length > 0 && (
        <section className="rounded-2xl border border-vernex-border bg-white p-5 dark:border-[#1E335F] dark:bg-vernex-navy">
          <h2 className="font-bold text-vernex-navy dark:text-white">Payment history</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="text-left text-xs uppercase text-vernex-muted">
                <tr>{['Date', 'Plan', 'Amount', 'Payment ID', 'Status', 'Valid till'].map((label) => <th key={label} className="py-2 pr-4">{label}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-vernex-border dark:divide-[#1E335F]">
                {payments.map((payment) => (
                  <tr key={payment.id}>
                    <td className="py-2 pr-4">{formatDate(payment.createdAt)}</td>
                    <td className="py-2 pr-4">{payment.planName || payment.plan}</td>
                    <td className="py-2 pr-4">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: payment.currency || 'INR', maximumFractionDigits: 0 }).format(Number(payment.amount))}</td>
                    <td className="py-2 pr-4 font-mono text-xs">{payment.paymentId || payment.reference || '—'}</td>
                    <td className="py-2 pr-4">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                        payment.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300'
                      }`}>{payment.status === 'APPROVED' ? 'PAID' : payment.status}</span>
                      {payment.failureReason && <span className="mt-1 block text-xs text-vernex-muted">{payment.failureReason}</span>}
                    </td>
                    <td className="py-2 pr-4">{formatDate(payment.activatedUntil)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
