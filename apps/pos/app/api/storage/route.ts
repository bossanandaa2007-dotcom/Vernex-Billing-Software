import { db } from '@/lib/db';
import { NextResponse } from 'next/server';
import { authErrorResponse, requireAuth } from '@/lib/auth';

export async function GET(request: Request) {
  let ctx;
  try { ctx = await requireAuth(request); } catch (error) { const response = authErrorResponse(error); if (response) return response; throw error; }
  try {
    const productStocks = await db.productStock.findMany({
      where: { businessId: ctx.businessId, Product: { some: {} } },
      include: { Product: { select: { sellprice: true } } },
      orderBy: { name: 'asc' },
    });
    return NextResponse.json(productStocks);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch products.' }, { status: 500 });
  }
}
