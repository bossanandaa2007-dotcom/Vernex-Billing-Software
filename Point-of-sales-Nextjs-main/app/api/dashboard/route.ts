import { db } from '@/lib/db';
import { NextResponse } from 'next/server';
import { authErrorResponse, requirePermission } from '@/lib/auth';
import { getPaymentReport, getProductReport } from '@/lib/report-calculations';

export async function GET(request: Request) {
  let ctx;
  try { ctx = await requirePermission(request, 'DASHBOARD_VIEW'); } catch (error) { const response = authErrorResponse(error); if (response) return response; throw error; }
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  try {
    const [totalProducts, lowStockItems, todayBills, revenue, refunds, sold, shop, pendingCredit, paymentReport, productReport, activeCustomers] = await Promise.all([
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
      getPaymentReport(ctx.businessId, { start, end: new Date(end.getTime() - 1) }),
      getProductReport(ctx.businessId, { start, end: new Date(end.getTime() - 1) }),
      db.customer.count({ where: { businessId: ctx.businessId, isActive: true } }),
    ]);

    const todayRevenue = Number(revenue._sum.totalAmount ?? 0);
    const refundTotalToday = Number(refunds._sum.refundAmount ?? 0);
    return NextResponse.json({
      totalProducts,
      lowStockItems,
      todayBills,
      todayRevenue,
      netRevenueToday: todayRevenue - refundTotalToday,
      returnsToday: refunds._count,
      refundTotalToday,
      cashSales: paymentReport.totals.CASH,
      upiSales: paymentReport.totals.UPI,
      cardSales: paymentReport.totals.CARD,
      creditSales: paymentReport.totals.CREDIT,
      onlineSales: paymentReport.totals.ONLINE,
      pendingCredit: Number(pendingCredit._sum.totalAmount ?? 0) - Number(pendingCredit._sum.amountReceived ?? 0),
      itemsSold: sold._sum.quantity ?? 0,
      topSellingProduct: productReport.topProduct?.productName ?? 'No sales yet',
      activeCustomers,
      currency: shop?.currency ?? 'INR',
    });
  } catch (error) {
    console.error('Dashboard query failed:', error);
    return NextResponse.json({ error: 'Unable to load dashboard.' }, { status: 500 });
  }
}
