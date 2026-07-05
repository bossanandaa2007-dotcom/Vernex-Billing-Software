import { authErrorResponse, requirePermission } from '@/lib/auth';
import { getProductReport, getShopForBusiness } from '@/lib/report-calculations';
import { getReportDateRange } from '@/lib/report-date-range';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const ctx = await requirePermission(request, 'REPORTS_VIEW');
    const range = getReportDateRange(request.url);
    const [report, shop] = await Promise.all([getProductReport(ctx.businessId, range), getShopForBusiness(ctx.businessId)]);
    return NextResponse.json({ range, currency: shop?.currency ?? 'INR', ...report });
  } catch (error) {
    const response = authErrorResponse(error);
    if (response) return response;
    return NextResponse.json({ error: 'Unable to load product report.' }, { status: 500 });
  }
}

