import { authErrorResponse, requirePermission } from '@/lib/auth';
import { getReportDateRange } from '@/lib/report-date-range';
import { getSalesReport, getShopForBusiness } from '@/lib/report-calculations';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const ctx = await requirePermission(request, 'REPORTS_VIEW');
    const range = getReportDateRange(request.url);
    const [sales, shop] = await Promise.all([getSalesReport(ctx.businessId, range), getShopForBusiness(ctx.businessId)]);
    return NextResponse.json({ range, currency: shop?.currency ?? 'INR', sales, summary: {
      billCount: sales.length,
      grossTotal: sales.reduce((sum, sale) => sum + sale.grossTotal, 0),
      refundTotal: sales.reduce((sum, sale) => sum + sale.refundedAmount, 0),
      netTotal: sales.reduce((sum, sale) => sum + sale.netTotal, 0),
    }});
  } catch (error) {
    const response = authErrorResponse(error);
    if (response) return response;
    return NextResponse.json({ error: 'Unable to load sales report.' }, { status: 500 });
  }
}

