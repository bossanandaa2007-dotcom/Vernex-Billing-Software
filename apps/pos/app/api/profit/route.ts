export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { authErrorResponse, requirePermission } from '@/lib/auth';
import { createServerClient } from '@/src/lib/supabase/server';

const dayKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

export async function GET(request: Request) {
  let ctx;
  try { ctx = await requirePermission(request, 'REPORTS_VIEW'); } catch (error) { const response = authErrorResponse(error); if (response) return response; throw error; }
  const { searchParams } = new URL(request.url);
  const start = searchParams.get('start');
  const end = searchParams.get('end');
  if (!start || !end) return NextResponse.json({ error: 'Missing date range.' }, { status: 400 });

  const startDate = new Date(`${start}T00:00:00`);
  const endDate = new Date(`${end}T23:59:59.999`);

  const supabase = await createServerClient(request);
  const [salesResult, returnsResult] = await Promise.all([
    supabase.from('Transaction').select('*, products:OnSaleProduct(*)').eq('businessId', ctx.businessId)
      .eq('isComplete', true).gte('completedAt', startDate.toISOString()).lte('completedAt', endDate.toISOString()),
    supabase.from('SaleReturn').select('*').eq('businessId', ctx.businessId)
      .gte('createdAt', startDate.toISOString()).lte('createdAt', endDate.toISOString()),
  ]);
  const transactions = (salesResult.data ?? []) as any[];
  const returns = returnsResult.data ?? [];

  const grouped = new Map<string, { netIncome: number; taxIncome: number; grossIncomeWithTax: number }>();
  for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
    grouped.set(dayKey(date), { netIncome: 0, taxIncome: 0, grossIncomeWithTax: 0 });
  }

  for (const transaction of transactions) {
    const date = dayKey(new Date(transaction.completedAt ?? transaction.createdAt));
    const entry = grouped.get(date);
    if (!entry) continue;
    const cost = transaction.products.reduce((sum: number, line: any) => sum + line.costPrice * line.quantity, 0);
    entry.netIncome += Number(transaction.subtotal) - cost - Number(transaction.discount);
    entry.taxIncome += Number(transaction.taxAmount);
    entry.grossIncomeWithTax += Number(transaction.totalAmount);
  }
  for (const saleReturn of returns) {
    const entry = grouped.get(dayKey(new Date(saleReturn.createdAt)));
    if (!entry) continue;
    entry.netIncome -= Number(saleReturn.refundAmount);
    entry.grossIncomeWithTax -= Number(saleReturn.refundAmount);
  }

  return NextResponse.json({
    groupedData: Array.from(grouped, ([date, values]) => ({ date, ...values })),
  });
}
