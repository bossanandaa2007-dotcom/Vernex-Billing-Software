'use client';

import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Copy, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getAppContext } from '@/lib/client-data';
import {
  PAYMENT_DETAILS,
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
  method: string;
  payerName: string;
  note: string;
  status: 'APPROVED' | 'REJECTED' | 'PENDING';
  reviewNote: string;
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

const formatDate = (value?: string | null) =>
  value ? new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(new Date(value)) : '-';

function paymentQrUrl(plan: { price: number; currency: string; name: string }) {
  const upi = new URL('upi://pay');
  upi.searchParams.set('pa', PAYMENT_DETAILS.upiId);
  upi.searchParams.set('pn', PAYMENT_DETAILS.accountName);
  upi.searchParams.set('am', String(plan.price));
  upi.searchParams.set('cu', plan.currency);
  upi.searchParams.set('tn', `Vernex ${plan.name}`);
  return `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(upi.toString())}`;
}

export function SubscriptionPlans() {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [selected, setSelected] = useState<PlanKey>('MONTHLY');
  const [method, setMethod] = useState('UPI');
  const [payerName, setPayerName] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const [context, history] = await Promise.all([
        getAppContext(),
        fetch('/api/subscription/payments', { cache: 'no-store' }).then((response) => response.json()),
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
  const pending = useMemo(() => payments.find((payment) => payment.status === 'PENDING'), [payments]);

  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setSuccess('Copied.');
    } catch {
      setError('Could not copy. Please select and copy it manually.');
    }
  }

  async function submitPayment() {
    setError('');
    setSuccess('');
    setSubmitting(true);
    try {
      const response = await fetch('/api/subscription/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: selected, method, payerName, note }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error || 'Unable to submit payment details.');
        return;
      }
      setSuccess('Payment received - awaiting Vernex confirmation. You do not need to pay again.');
      setPayerName('');
      setNote('');
      await load();
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <div className="flex min-h-48 w-full items-center justify-center text-sm text-vernex-muted">Loading your subscription...</div>;
  }

  return (
    <div className="w-full space-y-6">
      <section className="rounded-xl border border-vernex-border bg-white p-5 dark:border-[#1E335F] dark:bg-vernex-navy">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-vernex-navy dark:text-white">Subscription</h1>
            <p className="mt-1 text-sm text-vernex-muted">
              {subscription?.canUsePaidFeatures
                ? `${subscription.planName || 'Your plan'} is active - ${subscription.daysRemaining} day${subscription.daysRemaining === 1 ? '' : 's'} remaining (till ${formatDate(subscription.accessEndsAt)}).`
                : 'Your access has ended. Pay with the QR and submit for Vernex approval.'}
            </p>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-bold ${subscription?.canUsePaidFeatures ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
            {subscription?.status ?? 'UNKNOWN'}
          </span>
        </div>
      </section>

      {(success || pending) && (
        <section className="flex items-start gap-3 rounded-xl border border-emerald-300 bg-emerald-50 p-5 text-emerald-900">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
          <p className="font-medium">{pending ? 'Payment received - awaiting confirmation. You do not need to pay again.' : success}</p>
        </section>
      )}

      <section className="grid gap-4 sm:grid-cols-2">
        {PLAN_LIST.map((item) => {
          const active = item.key === selected;
          return (
            <button
              key={item.key}
              type="button"
              disabled={Boolean(pending)}
              onClick={() => setSelected(item.key)}
              className={`rounded-xl border p-5 text-left transition ${active ? 'border-vernex-gold bg-vernex-gold/5 ring-2 ring-vernex-gold/30' : 'border-vernex-border bg-white hover:border-vernex-gold/50 dark:border-[#1E335F] dark:bg-vernex-navy'}`}
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
              {active && <p className="mt-3 flex items-center gap-1.5 text-xs font-bold text-emerald-700"><CheckCircle2 className="h-4 w-4" />Selected</p>}
            </button>
          );
        })}
      </section>

      <section className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-xl border border-vernex-border bg-white p-5 dark:border-[#1E335F] dark:bg-vernex-navy">
          <h2 className="font-bold text-vernex-navy dark:text-white">Step 1: Pay Vernex</h2>
          <div className="mt-4 space-y-3 text-sm">
            <div className="rounded-lg border border-vernex-border p-4 text-center">
              <p className="text-xs uppercase text-vernex-muted">Scan to pay {formatPlanPrice(plan)}</p>
              <img src={paymentQrUrl(plan)} alt={`UPI QR code for ${formatPlanPrice(plan)}`} className="mx-auto mt-3 h-48 w-48 rounded-md border border-vernex-border bg-white p-2" />
              <p className="mt-2 text-xs text-vernex-muted">Open any UPI app and scan this QR.</p>
            </div>
            <div className="rounded-lg border border-vernex-border p-3">
              <p className="text-xs uppercase text-vernex-muted">UPI ID</p>
              <div className="mt-1 flex items-center justify-between gap-2">
                <b>{PAYMENT_DETAILS.upiId}</b>
                <Button variant="outline" size="sm" onClick={() => copy(PAYMENT_DETAILS.upiId)}><Copy className="mr-2 h-4 w-4" />Copy</Button>
              </div>
            </div>
            <div className="rounded-lg border border-vernex-border p-3">
              <p className="text-xs uppercase text-vernex-muted">Account name</p>
              <b>{PAYMENT_DETAILS.accountName}</b>
            </div>
            {(PAYMENT_DETAILS.supportPhone || PAYMENT_DETAILS.supportEmail) && (
              <p className="text-xs text-vernex-muted">
                Need help? {PAYMENT_DETAILS.supportPhone || PAYMENT_DETAILS.supportEmail}
              </p>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-vernex-border bg-white p-5 dark:border-[#1E335F] dark:bg-vernex-navy">
          <h2 className="font-bold text-vernex-navy dark:text-white">Step 2: Submit payment</h2>
          <p className="mt-1 text-sm text-vernex-muted">Submit after paying {formatPlanPrice(plan)} for the {plan.name}.</p>
          {error && <p className="mt-3 rounded-md bg-red-50 p-3 text-sm font-medium text-red-700">{error}</p>}
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-medium">Plan<select disabled={Boolean(pending)} value={selected} onChange={(event) => setSelected(event.target.value as PlanKey)} className="mt-1 h-10 w-full rounded-md border border-vernex-border bg-white px-3"><option value="MONTHLY">Monthly Plan</option><option value="YEARLY">Yearly Plan</option></select></label>
            <label className="text-sm font-medium">Method<select disabled={Boolean(pending)} value={method} onChange={(event) => setMethod(event.target.value)} className="mt-1 h-10 w-full rounded-md border border-vernex-border bg-white px-3"><option value="UPI">UPI</option><option value="CASH">Cash</option></select></label>
            <label className="text-sm font-medium">Payer name<input disabled={Boolean(pending)} value={payerName} onChange={(event) => setPayerName(event.target.value)} className="mt-1 h-10 w-full rounded-md border border-vernex-border px-3" /></label>
            <label className="text-sm font-medium">Note<input disabled={Boolean(pending)} value={note} onChange={(event) => setNote(event.target.value)} className="mt-1 h-10 w-full rounded-md border border-vernex-border px-3" /></label>
          </div>
          <Button onClick={submitPayment} disabled={submitting || Boolean(pending)} className="mt-5 h-11 w-full sm:w-auto">
            {pending ? 'Awaiting confirmation' : submitting ? 'Submitting...' : 'Submit payment'}
          </Button>
        </div>
      </section>

      {payments.length > 0 && (
        <section className="rounded-xl border border-vernex-border bg-white p-5 dark:border-[#1E335F] dark:bg-vernex-navy">
          <h2 className="font-bold text-vernex-navy dark:text-white">Payment history</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="text-left text-xs uppercase text-vernex-muted">
                <tr>{['Date', 'Plan', 'Amount', 'Method', 'Status', 'Valid till'].map((label) => <th key={label} className="py-2 pr-4">{label}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-vernex-border dark:divide-[#1E335F]">
                {payments.map((payment) => (
                  <tr key={payment.id}>
                    <td className="py-2 pr-4">{formatDate(payment.createdAt)}</td>
                    <td className="py-2 pr-4">{payment.planName || payment.plan}</td>
                    <td className="py-2 pr-4">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: payment.currency || 'INR', maximumFractionDigits: 0 }).format(Number(payment.amount))}</td>
                    <td className="py-2 pr-4">{payment.method}</td>
                    <td className="py-2 pr-4">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${payment.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700' : payment.status === 'PENDING' ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'}`}>{payment.status}</span>
                      {payment.reviewNote && <span className="mt-1 block text-xs text-vernex-muted">{payment.reviewNote}</span>}
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
