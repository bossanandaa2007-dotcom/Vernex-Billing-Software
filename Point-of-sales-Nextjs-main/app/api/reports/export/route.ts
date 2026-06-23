import { authErrorResponse } from '@/lib/auth';
import { requirePaidFeature } from '@/lib/guards';
import { csvResponse, toCsv } from '@/lib/csv-export';
import {
  getCustomerReport,
  getInventoryReport,
  getPaymentReport,
  getProductReport,
  getReturnsReport,
  getSalesReport,
} from '@/lib/report-calculations';
import { getReportDateRange } from '@/lib/report-date-range';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const ctx = await requirePaidFeature(request, 'REPORTS_VIEW');
    const params = new URL(request.url).searchParams;
    const type = params.get('type') ?? 'sales';
    const range = getReportDateRange(request.url);
    let rows: Record<string, unknown>[] = [];

    if (type === 'sales') rows = await getSalesReport(ctx.businessId, range);
    else if (type === 'payments') {
      const report = await getPaymentReport(ctx.businessId, range);
      rows = Object.entries(report.totals).map(([method, total]) => ({ method, total }));
      rows.push({ method: 'REFUNDS', total: report.refundTotal }, { method: 'NET_COLLECTION', total: report.netCollection });
    } else if (type === 'products') rows = (await getProductReport(ctx.businessId, range)).products;
    else if (type === 'customers') rows = await getCustomerReport(ctx.businessId, range);
    else if (type === 'inventory') rows = (await getInventoryReport(ctx.businessId, range)).movements.map((item) => ({
      createdAt: item.createdAt,
      productName: item.productNameSnapshot,
      type: item.movementType,
      quantityChange: item.quantityChange,
      previousStock: item.previousStock,
      newStock: item.newStock,
      reference: item.referenceBillNumber ?? item.referenceId,
      reason: item.reason,
    }));
    else if (type === 'returns') rows = (await getReturnsReport(ctx.businessId, range)).returns;
    else return NextResponse.json({ error: 'Unknown report export type.' }, { status: 400 });

    return csvResponse(`vernex-${type}-${range.start.toISOString().slice(0, 10)}.csv`, toCsv(rows));
  } catch (error) {
    const response = authErrorResponse(error);
    if (response) return response;
    return NextResponse.json({ error: 'Unable to export report.' }, { status: 500 });
  }
}
