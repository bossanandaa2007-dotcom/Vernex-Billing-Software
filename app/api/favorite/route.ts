export const dynamic = 'force-dynamic';

import { db } from '@/lib/db';
import { NextResponse } from 'next/server';
import { authErrorResponse, requirePermission } from '@/lib/auth';

const cache = new Map<string, { expires: number; data: unknown }>();

export async function GET(request: Request) {
  let ctx;
  try { ctx = await requirePermission(request, 'DASHBOARD_VIEW'); } catch (error) { const response = authErrorResponse(error); if (response) return response; throw error; }
  const cached = cache.get(ctx.businessId);
  if (cached && cached.expires > Date.now()) return NextResponse.json(cached.data);
  const rows = await db.onSaleProduct.groupBy({
    by: ['productName'],
    where: { transaction: { businessId: ctx.businessId, isComplete: true } },
    _sum: { quantity: true },
    orderBy: { _sum: { quantity: 'desc' } },
    take: 5,
  });

  const data = {
    topProducts: rows.map((row) => ({
      id: row.productName,
      productId: row.productName,
      productstock: { name: row.productName || 'Unknown product' },
      _sum: { quantity: row._sum.quantity ?? 0 },
    })),
  };
  cache.set(ctx.businessId, { expires: Date.now() + 30_000, data });
  return NextResponse.json(data);
}
