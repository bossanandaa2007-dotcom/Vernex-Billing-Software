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
    select: { completedAt: true, products: { select: { quantity: true } } },
  });

  const totals = new Map<string, number>();
  for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
    totals.set(dayKey(date), 0);
  }
  for (const transaction of transactions) {
    if (!transaction.completedAt) continue;
    const day = dayKey(transaction.completedAt);
    const quantity = transaction.products.reduce((sum, item) => sum + item.quantity, 0);
    totals.set(day, (totals.get(day) ?? 0) + quantity);
  }

  return NextResponse.json({
    combinedResult: Array.from(totals, ([day, totalQuantity]) => ({ day, totalQuantity })),
  });
}
