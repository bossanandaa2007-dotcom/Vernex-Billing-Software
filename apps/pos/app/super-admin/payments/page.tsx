import Link from 'next/link';
import { Search } from 'lucide-react';
import { listSubscriptionPayments } from '@/services/super-admin/admin-data.server';
import { PageHeader } from '@/components/super-admin/page-header';
import { Card } from '@/components/super-admin/ui/card';
import { Badge } from '@/components/super-admin/ui/badge';
import { Button } from '@/components/super-admin/ui/button';
import { EmptyState, ErrorState } from '@/components/super-admin/ui/states';
import { formatCurrency, formatDate } from '@/lib/super-admin/utils';

const STATUS_LABEL: Record<string, string> = { APPROVED: 'PAID', CREATED: 'ABANDONED' };

// Read-only ledger. Razorpay activates licences automatically once a payment's
// signature is verified, so there is nothing here for an admin to approve.
// To change a licence by hand, use the business's Activate / Extend actions.
export default async function PaymentsPage({ searchParams }: { searchParams: Promise<{ status?: string; search?: string }> }) {
  const params = await searchParams;
  const status = params.status ?? 'APPROVED';
  const search = params.search ?? '';
  try {
    const payments = await listSubscriptionPayments({ status, search });
    return (
      <div className="space-y-6">
        <PageHeader
          title="Subscription Payments"
          description="Every Razorpay transaction for a Vernex licence. Successful payments activate the business automatically — no approval needed."
        />
        <Card>
          <form className="grid gap-3 border-b border-slate-200 p-4 sm:grid-cols-[1fr_180px_auto] dark:border-slate-800">
            <label className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><input name="search" defaultValue={search} placeholder="Search payment id, payer, email" className="h-10 w-full rounded-md border border-slate-200 bg-white pl-9 pr-3 text-sm dark:border-slate-700 dark:bg-slate-950" /></label>
            <select name="status" defaultValue={status} className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950">{['APPROVED', 'FAILED', 'CREATED', 'ALL'].map((item) => <option key={item}>{item}</option>)}</select>
            <Button type="submit">Apply Filters</Button>
          </form>
          {payments.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1050px] text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500 dark:bg-slate-950"><tr>{['Business', 'Plan', 'Amount', 'Payment ID', 'Paid By', 'Date', 'Status', 'Licence Until'].map((label) => <th key={label} className="px-4 py-3">{label}</th>)}</tr></thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {payments.map((payment) => (
                    <tr key={payment.id} className="align-top hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-4"><Link href={`/super-admin/businesses/${payment.businessId}`} className="font-semibold text-blue-800 hover:underline dark:text-amber-400">{payment.businessName}</Link></td>
                      <td className="px-4 py-4">{payment.planName || payment.plan}</td>
                      <td className="px-4 py-4 font-semibold">{formatCurrency(Number(payment.amount), payment.currency)}</td>
                      <td className="px-4 py-4 font-mono text-xs">{payment.paymentId || '—'}{payment.orderId && <span className="mt-1 block text-slate-400">{payment.orderId}</span>}</td>
                      <td className="px-4 py-4"><span className="block">{payment.submittedByName}</span><span className="text-xs text-slate-500">{payment.submittedByEmail}</span></td>
                      <td className="px-4 py-4 text-slate-500">{formatDate(payment.createdAt)}</td>
                      <td className="px-4 py-4"><Badge tone={payment.status}>{STATUS_LABEL[payment.status] ?? payment.status}</Badge>{payment.failureReason && <span className="mt-1 block max-w-xs text-xs text-slate-500">{payment.failureReason}</span>}</td>
                      <td className="px-4 py-4 text-slate-500">{payment.activatedUntil ? formatDate(payment.activatedUntil) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <EmptyState title="No payments yet" description="Razorpay transactions for Vernex licences appear here automatically." />}
        </Card>
      </div>
    );
  } catch {
    return <ErrorState message="Unable to load subscription payments. Confirm the subscription_payments table exists and Supabase access is available." />;
  }
}
