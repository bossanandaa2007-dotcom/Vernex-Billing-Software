import Link from 'next/link';
import { Search } from 'lucide-react';
import { listSubscriptionPayments } from '@/services/super-admin/admin-data.server';
import { PageHeader } from '@/components/super-admin/page-header';
import { Card } from '@/components/super-admin/ui/card';
import { Badge } from '@/components/super-admin/ui/badge';
import { Button } from '@/components/super-admin/ui/button';
import { EmptyState, ErrorState } from '@/components/super-admin/ui/states';
import { PaymentReviewActions } from '@/components/super-admin/payment-review-actions';
import { formatCurrency, formatDate } from '@/lib/super-admin/utils';

export default async function PaymentsPage({ searchParams }: { searchParams: Promise<{ status?: string; search?: string }> }) {
  const params = await searchParams;
  const status = params.status ?? 'PENDING';
  const search = params.search ?? '';
  try {
    const payments = await listSubscriptionPayments({ status, search });
    return (
      <div className="space-y-6">
        <PageHeader
          title="Subscription Payments"
          description="Review offline QR payments and activate licences manually."
        />
        <Card>
          <form className="grid gap-3 border-b border-slate-200 p-4 sm:grid-cols-[1fr_180px_auto] dark:border-slate-800">
            <label className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><input name="search" defaultValue={search} placeholder="Search payer or email" className="h-10 w-full rounded-md border border-slate-200 bg-white pl-9 pr-3 text-sm dark:border-slate-700 dark:bg-slate-950" /></label>
            <select name="status" defaultValue={status} className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950">{['PENDING', 'APPROVED', 'REJECTED', 'ALL'].map((item) => <option key={item}>{item}</option>)}</select>
            <Button type="submit">Apply Filters</Button>
          </form>
          {payments.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1120px] text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500 dark:bg-slate-950"><tr>{['Business', 'Plan', 'Amount', 'Method', 'Submitted by', 'Date', 'Status', 'Licence Until', 'Actions'].map((label) => <th key={label} className="px-4 py-3">{label}</th>)}</tr></thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {payments.map((payment) => (
                    <tr key={payment.id} className="align-top hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-4"><Link href={`/super-admin/businesses/${payment.businessId}`} className="font-semibold text-blue-800 hover:underline dark:text-amber-400">{payment.businessName}</Link></td>
                      <td className="px-4 py-4">{payment.planName || payment.plan}</td>
                      <td className="px-4 py-4 font-semibold">{formatCurrency(Number(payment.amount), payment.currency)}</td>
                      <td className="px-4 py-4">{payment.method}{payment.note && <span className="mt-1 block max-w-xs text-xs text-slate-500">{payment.note}</span>}</td>
                      <td className="px-4 py-4"><span className="block">{payment.payerName || payment.submittedByName}</span><span className="text-xs text-slate-500">{payment.submittedByEmail}</span></td>
                      <td className="px-4 py-4 text-slate-500">{formatDate(payment.createdAt)}</td>
                      <td className="px-4 py-4"><Badge tone={payment.status}>{payment.status}</Badge>{payment.reviewNote && <span className="mt-1 block max-w-xs text-xs text-slate-500">{payment.reviewNote}</span>}</td>
                      <td className="px-4 py-4 text-slate-500">{payment.activatedUntil ? formatDate(payment.activatedUntil) : '-'}</td>
                      <td className="px-4 py-4">{payment.status === 'PENDING' ? <PaymentReviewActions id={payment.id} /> : <span className="text-xs text-slate-400">Reviewed</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <EmptyState title="No payments found" description="Pending manual payments appear here after a customer submits them." />}
        </Card>
      </div>
    );
  } catch {
    return <ErrorState message="Unable to load subscription payments. Apply the subscription payment migration and confirm Supabase access." />;
  }
}
