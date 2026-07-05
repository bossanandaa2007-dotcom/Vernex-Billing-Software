export const dynamic = 'force-dynamic';

import { db } from '@/lib/db';
import { NextResponse } from 'next/server';
import { authErrorResponse, requirePermission } from '@/lib/auth';

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

  const transactions = await db.transaction.findMany({
    where: { businessId: ctx.businessId, isComplete: true, completedAt: { gte: startDate, lte: endDate } },
    include: { products: true },
  });
  const returns = await db.saleReturn.findMany({ where: { businessId: ctx.businessId, createdAt: { gte: startDate, lte: endDate } } });

  const grouped = new Map<string, { netIncome: number; taxIncome: number; grossIncomeWithTax: number }>();
  for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
    grouped.set(dayKey(date), { netIncome: 0, taxIncome: 0, grossIncomeWithTax: 0 });
  }

  for (const transaction of transactions) {
    const date = dayKey(transaction.completedAt ?? transaction.createdAt);
    const entry = grouped.get(date);
    if (!entry) continue;
    const cost = transaction.products.reduce((sum, line) => sum + line.costPrice * line.quantity, 0);
    entry.netIncome += Number(transaction.subtotal) - cost - Number(transaction.discount);
    entry.taxIncome += Number(transaction.taxAmount);
    entry.grossIncomeWithTax += Number(transaction.totalAmount);
  }
  for (const saleReturn of returns) {
    const entry = grouped.get(dayKey(saleReturn.createdAt));
    if (!entry) continue;
    entry.netIncome -= Number(saleReturn.refundAmount);
    entry.grossIncomeWithTax -= Number(saleReturn.refundAmount);
  }

  return NextResponse.json({
    groupedData: Array.from(grouped, ([date, values]) => ({ date, ...values })),
  });
}
