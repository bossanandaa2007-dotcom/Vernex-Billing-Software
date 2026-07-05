import { authErrorResponse, requirePermission } from '@/lib/auth';
import { getInventoryReport, getShopForBusiness } from '@/lib/report-calculations';
import { getReportDateRange } from '@/lib/report-date-range';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const ctx = await requirePermission(request, 'REPORTS_VIEW');
    const range = getReportDateRange(request.url);
    const [report, shop] = await Promise.all([getInventoryReport(ctx.businessId, range), getShopForBusiness(ctx.businessId)]);
    return NextResponse.json({ range, currency: shop?.currency ?? 'INR', ...report });
  } catch (error) {
    const response = authErrorResponse(error);
    if (response) return response;
    return NextResponse.json({ error: 'Unable to load inventory report.' }, { status: 500 });
  }
}

