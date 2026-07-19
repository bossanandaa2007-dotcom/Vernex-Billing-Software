import { getCurrentUserContext } from '@/lib/auth';
import { createServerClient } from '@/src/lib/supabase/server';

export type RecordsPeriod = 'all' | 'daily' | 'weekly' | 'monthly';

function getPeriodRange(period: RecordsPeriod) {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  if (period === 'weekly') {
    start.setDate(start.getDate() - 6);
  }

  if (period === 'monthly') {
    start.setDate(1);
  }

  return { start, end };
}

export async function fetchRecords({
  take = 5,
  skip = 0,
  query,
  period = 'all',
}: {
  query?: string;
  take: number;
  skip: number;
  period?: RecordsPeriod;
}) {
  try {
    const ctx = await getCurrentUserContext();
  const trimmedQuery = query?.trim();
  const range = period === 'all' ? null : getPeriodRange(period);
  const supabase = await createServerClient();
  const applyFilters = (builder: any) => {
    let q = builder.eq('businessId', ctx.businessId).eq('isComplete', true);
    if (range) q = q.gte('completedAt', range.start.toISOString()).lte('completedAt', range.end.toISOString());
    if (trimmedQuery) q = q.or(`id.ilike.%${trimmedQuery}%,billNumber.ilike.%${trimmedQuery}%,customerName.ilike.%${trimmedQuery}%,customerPhone.ilike.%${trimmedQuery}%`);
    return q;
  };
  const recordsQuery = applyFilters(
    supabase.from('Transaction').select('*, products:OnSaleProduct(quantity)', { count: 'exact' }),
  ).order('completedAt', { ascending: false }).range(skip, skip + take - 1);
  const totalsQuery = applyFilters(
    supabase.from('Transaction').select('totalAmount, products:OnSaleProduct(quantity)'),
  );
  const [recordsResult, totalsResult, shopResult] = await Promise.all([
    recordsQuery,
    totalsQuery,
    supabase.from('ShopData').select('currency').eq('businessId', ctx.businessId).maybeSingle(),
  ]);
  if (recordsResult.error) throw recordsResult.error;
  if (totalsResult.error) throw totalsResult.error;
  const results = (recordsResult.data ?? []) as any[];
  const totalsRows = (totalsResult.data ?? []) as any[];
  const totalRevenue = totalsRows.reduce((sum, item) => sum + Number(item.totalAmount), 0);
  const totalItems = totalsRows.reduce(
    (sum, item) => sum + (item.products ?? []).reduce((s: number, p: any) => s + p.quantity, 0),
    0,
  );
  const totalTransactions = recordsResult.count ?? 0;
  const shop = shopResult.data;

    return {
    data: results.map((transaction) => ({
      id: transaction.id,
      billNumber: transaction.billNumber ?? transaction.id,
      completedAt: new Date(transaction.completedAt ?? transaction.createdAt),
      itemCount: transaction.products.reduce((sum: number, item: any) => sum + item.quantity, 0),
      subtotal: Number(transaction.subtotal),
      taxAmount: Number(transaction.taxAmount),
      discount: Number(transaction.discount),
      totalAmount: Number(transaction.totalAmount),
      paymentMethod: transaction.paymentMethod,
      paymentStatus: transaction.paymentStatus,
      customerName: transaction.customerName,
      returnStatus: transaction.returnStatus,
      refundedAmount: Number(transaction.refundedAmount),
    })),
    currency: shop?.currency ?? 'INR',
    metadata: {
      hasNextPage: skip + take < totalTransactions,
      totalPages: Math.ceil(totalTransactions / take),
      totalTransactions,
      totalRevenue,
      totalItems,
    },
    };
  } catch {
    return {
      data: [],
      currency: 'INR',
      metadata: { hasNextPage: false, totalPages: 0, totalTransactions: 0, totalRevenue: 0, totalItems: 0 },
    };
  }
}
