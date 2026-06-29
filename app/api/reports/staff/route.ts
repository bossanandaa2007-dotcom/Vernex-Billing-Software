import { authErrorResponse, requirePermission } from '@/lib/auth';
import { getStaffReport } from '@/lib/report-calculations';
import { getReportDateRange } from '@/lib/report-date-range';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const ctx = await requirePermission(request, 'REPORTS_VIEW');
    const range = getReportDateRange(request.url);
    return NextResponse.json({ range, staff: await getStaffReport(ctx.businessId, range) });
  } catch (error) {
    const response = authErrorResponse(error);
    if (response) return response;
    return NextResponse.json({ error: 'Unable to load staff report.' }, { status: 500 });
  }
}

