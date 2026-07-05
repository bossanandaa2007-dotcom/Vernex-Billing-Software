import { authErrorResponse, requirePermission } from '@/lib/auth';
import { getCustomerReport, getShopForBusiness } from '@/lib/report-calculations';
import { getReportDateRange } from '@/lib/report-date-range';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const ctx = await requirePermission(request, 'REPORTS_VIEW');
    const range = getReportDateRange(request.url);
    const [customers, shop] = await Promise.all([getCustomerReport(ctx.businessId, range), getShopForBusiness(ctx.businessId)]);
    return NextResponse.json({ range, currency: shop?.currency ?? 'INR', customers, summary: {
      activeCustomers: customers.length,
      creditCustomers: customers.filter((item) => item.pendingCredit > 0).length,
      pendingCredit: customers.reduce((sum, item) => sum + item.pendingCredit, 0),
    }});
  } catch (error) {
    const response = authErrorResponse(error);
    if (response) return response;
    return NextResponse.json({ error: 'Unable to load customer report.' }, { status: 500 });
  }
}

