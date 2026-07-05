import { db } from '@/lib/db';
import { NextResponse } from 'next/server';
import { authErrorResponse, requirePermission } from '@/lib/auth';

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
    const [totalProducts, lowStockItems, todayBills, revenue, refunds, sold, shop, pendingCredit, paymentGroups, topProducts, activeCustomers] = await Promise.all([
      db.product.count({ where: { productstock: { businessId: ctx.businessId } } }),
      db.productStock.count({ where: { businessId: ctx.businessId, Product: { some: {} }, stock: { lte: 10 } } }),
      db.transaction.count({ where: { businessId: ctx.businessId, isComplete: true, completedAt: { gte: start, lt: end } } }),
      db.transaction.aggregate({
        where: { businessId: ctx.businessId, isComplete: true, completedAt: { gte: start, lt: end } },
        _sum: { totalAmount: true },
      }),
      db.saleReturn.aggregate({ where: { businessId: ctx.businessId, createdAt: { gte: start, lt: end } }, _sum: { refundAmount: true }, _count: true }),
      db.onSaleProduct.aggregate({
        where: { transaction: { businessId: ctx.businessId, isComplete: true, completedAt: { gte: start, lt: end } } },
        _sum: { quantity: true },
      }),
      db.shopData.findFirst({ where: { businessId: ctx.businessId } }),
      db.transaction.aggregate({ where: { businessId: ctx.businessId, isComplete: true, paymentStatus: { in: ['PENDING', 'PARTIAL'] } }, _sum: { totalAmount: true, amountReceived: true } }),
      db.transaction.groupBy({
        by: ['paymentMethod'],
        where: { businessId: ctx.businessId, isComplete: true, completedAt: { gte: start, lt: end } },
        _sum: { totalAmount: true },
      }),
      db.onSaleProduct.groupBy({
        by: ['productName'],
        where: { transaction: { businessId: ctx.businessId, isComplete: true, completedAt: { gte: start, lt: end } } },
        _sum: { quantity: true },
        orderBy: { _sum: { quantity: 'desc' } },
        take: 1,
      }),
      db.customer.count({ where: { businessId: ctx.businessId, isActive: true } }),
    ]);

    const todayRevenue = Number(revenue._sum.totalAmount ?? 0);
    const refundTotalToday = Number(refunds._sum.refundAmount ?? 0);
    const paymentTotals = paymentGroups.reduce<Record<string, number>>((acc, item) => {
      if (item.paymentMethod) acc[item.paymentMethod] = Number(item._sum.totalAmount ?? 0);
      return acc;
    }, {});
    const data = {
      totalProducts,
      lowStockItems,
      todayBills,
      todayRevenue,
      netRevenueToday: todayRevenue - refundTotalToday,
      returnsToday: refunds._count,
      refundTotalToday,
      cashSales: paymentTotals.CASH ?? 0,
      upiSales: paymentTotals.UPI ?? 0,
      cardSales: paymentTotals.CARD ?? 0,
      creditSales: paymentTotals.CREDIT ?? 0,
      onlineSales: paymentTotals.ONLINE ?? 0,
      pendingCredit: Number(pendingCredit._sum.totalAmount ?? 0) - Number(pendingCredit._sum.amountReceived ?? 0),
      itemsSold: sold._sum.quantity ?? 0,
      topSellingProduct: topProducts[0]?.productName || 'No sales yet',
      activeCustomers,
      currency: shop?.currency ?? 'INR',
      period,
    };
    cache.set(cacheKey, { expires: Date.now() + TTL_MS, data });
    return NextResponse.json(data);
  } catch (error) {
    console.error('Dashboard query failed:', error);
    const unavailable = authErrorResponse(error);
    if (unavailable) return unavailable;
    return NextResponse.json({ error: 'Unable to load dashboard.' }, { status: 500 });
  }
}
