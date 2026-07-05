import { db } from '@/lib/db';
import { restockSchema } from '@/schema';
import { NextResponse } from 'next/server';
import { authErrorResponse } from '@/lib/auth';
import { requirePaidFeature } from '@/lib/guards';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let ctx;
  try { ctx = await requirePaidFeature(request, 'STOCK_ADJUST'); } catch (error) { const response = authErrorResponse(error); if (response) return response; throw error; }
  const parsed = restockSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  try {
    const product = await db.productStock.update({
      where: { id, businessId: ctx.businessId },
      data: { stock: { increment: parsed.data.stock } },
    });
    return NextResponse.json(product);
  } catch {
    return NextResponse.json({ error: 'Product not found.' }, { status: 404 });
  }
}
