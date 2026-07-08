import { NextResponse } from 'next/server';
import { authErrorResponse, requirePermission } from '@/lib/auth';
import { createServerClient } from '@/src/lib/supabase/server';

const cache = new Map<string, { expires: number; data: unknown }>();
const TTL_MS = 30_000;
const periods = ['today', 'week', 'month'] as const;
type DashboardPeriod = typeof periods[number];

function getDateRange(period: DashboardPeriod) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);

  if (period === 'today') {
    end.setDate(end.getDate() + 1);
    return { start, end };
  }

  if (period === 'week') {
    start.setDate(start.getDate() - 6);
    end.setDate(end.getDate() + 1);
    return { start, end };
  }

  start.setDate(1);
  end.setMonth(end.getMonth() + 1, 1);
  return { start, end };
}

export async function GET(request: Request) {
  let ctx;
  try { ctx = await requirePermission(request, 'DASHBOARD_VIEW'); } catch (error) { const response = authErrorResponse(error); if (response) return response; throw error; }
  const periodParam = new URL(request.url).searchParams.get('period');
  const period: DashboardPeriod = periods.includes(periodParam as DashboardPeriod) ? periodParam as DashboardPeriod : 'today';
  const cacheKey = `${ctx.businessId}:${period}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expires > Date.now()) return NextResponse.json(cached.data);
  const { start, end } = getDateRange(period);

  try {
    const supabase = await createServerClient(request);
    const [products, sales, refunds, shop, creditSales, saleLines, customers] = await Promise.all([
      supabase.from('ProductStock').select('id,stock,Product!inner(id)', { count: 'exact' }).eq('businessId', ctx.businessId),
      supabase.from('Transaction').select('id,totalAmount,paymentMethod,completedAt', { count: 'exact' })
        .eq('businessId', ctx.businessId).eq('isComplete', true)
        .gte('completedAt', start.toISOString()).lt('completedAt', end.toISOString()),
      supabase.from('SaleReturn').select('refundAmount', { count: 'exact' }).eq('businessId', ctx.businessId)
        .gte('createdAt', start.toISOString()).lt('createdAt', end.toISOString()),
      supabase.from('ShopData').select('currency').eq('businessId', ctx.businessId).maybeSingle(),
      supabase.from('Transaction').select('totalAmount,amountReceived').eq('businessId', ctx.businessId)
        .eq('isComplete', true).in('paymentStatus', ['PENDING', 'PARTIAL']),
      supabase.from('OnSaleProduct').select('quantity,productName,transaction:Transaction!inner(businessId,isComplete,completedAt)')
        .eq('transaction.businessId', ctx.businessId).eq('transaction.isComplete', true)
        .gte('transaction.completedAt', start.toISOString()).lt('transaction.completedAt', end.toISOString()),
      supabase.from('Customer').select('id', { count: 'exact', head: true }).eq('businessId', ctx.businessId).eq('isActive', true),
    ]);
    const productRows = products.data ?? [];
    const salesRows = sales.data ?? [];
    const refundRows = refunds.data ?? [];
    const lineRows = saleLines.data ?? [];
    const todayRevenue = salesRows.reduce((sum, sale) => sum + Number(sale.totalAmount ?? 0), 0);
    const refundTotalToday = refundRows.reduce((sum, item) => sum + Number(item.refundAmount), 0);
    const paymentTotals = salesRows.reduce<Record<string, number>>((acc, item) => {
      if (item.paymentMethod) acc[item.paymentMethod] = (acc[item.paymentMethod] ?? 0) + Number(item.totalAmount ?? 0);
      return acc;
    }, {});
    const productsSold = new Map<string, number>();
    lineRows.forEach((line) => productsSold.set(line.productName, (productsSold.get(line.productName) ?? 0) + line.quantity));
    const topProduct = [...productsSold.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
    const data = {
      totalProducts: products.count ?? productRows.length,
      lowStockItems: productRows.filter((item) => item.stock <= 10).length,
      todayBills: sales.count ?? salesRows.length,
      todayRevenue,
      netRevenueToday: todayRevenue - refundTotalToday,
      returnsToday: refunds.count ?? refundRows.length,
      refundTotalToday,
      cashSales: paymentTotals.CASH ?? 0,
      upiSales: paymentTotals.UPI ?? 0,
      cardSales: paymentTotals.CARD ?? 0,
      creditSales: paymentTotals.CREDIT ?? 0,
      onlineSales: paymentTotals.ONLINE ?? 0,
      pendingCredit: (creditSales.data ?? []).reduce((sum, sale) => sum + Number(sale.totalAmount ?? 0) - Number(sale.amountReceived), 0),
      itemsSold: lineRows.reduce((sum, line) => sum + line.quantity, 0),
      topSellingProduct: topProduct || 'No sales yet',
      activeCustomers: customers.count ?? 0,
      currency: shop.data?.currency ?? 'INR',
      period,
    };
    cache.set(cacheKey, { expires: Date.now() + TTL_MS, data });
    return NextResponse.json(data);
  } catch (error) {
    const unavailable = authErrorResponse(error);
    if (unavailable) return unavailable;
    return NextResponse.json({ error: 'Unable to load dashboard.' }, { status: 500 });
  }
}
