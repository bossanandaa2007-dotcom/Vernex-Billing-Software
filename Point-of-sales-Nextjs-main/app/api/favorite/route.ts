export const dynamic = 'force-dynamic';

import { db } from '@/lib/db';
import { NextResponse } from 'next/server';
import { authErrorResponse, requirePermission } from '@/lib/auth';

export async function GET(request: Request) {
  let ctx;
  try { ctx = await requirePermission(request, 'DASHBOARD_VIEW'); } catch (error) { const response = authErrorResponse(error); if (response) return response; throw error; }
  const rows = await db.onSaleProduct.groupBy({
    by: ['productName'],
    where: { transaction: { businessId: ctx.businessId, isComplete: true } },
    _sum: { quantity: true },
    orderBy: { _sum: { quantity: 'desc' } },
    take: 5,
  });

  return NextResponse.json({
    topProducts: rows.map((row) => ({
      id: row.productName,
      productId: row.productName,
      productstock: { name: row.productName || 'Unknown product' },
      _sum: { quantity: row._sum.quantity ?? 0 },
    })),
  });
}
