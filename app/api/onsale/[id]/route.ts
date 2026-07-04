import { db } from '@/lib/db';
import { orderSchema } from '@/schema';
import { NextResponse } from 'next/server';
import { authErrorResponse } from '@/lib/auth';
import { requirePaidFeature } from '@/lib/guards';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let ctx;
  try { ctx = await requirePaidFeature(request, 'POS_BILLING'); } catch (error) { const response = authErrorResponse(error); if (response) return response; throw error; }
  const parsed = orderSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const line = await db.onSaleProduct.findUnique({
    where: { id },
    include: { transaction: true, product: { include: { productstock: true } } },
  });
  if (!line || !line.product || line.transaction.businessId !== ctx.businessId) return NextResponse.json({ error: 'Cart line not found.' }, { status: 404 });
  if (line.transaction.isComplete) return NextResponse.json({ error: 'Completed bills cannot be changed.' }, { status: 409 });
  if (parsed.data.qTy > line.product.productstock.stock) {
    return NextResponse.json({ error: `Only ${line.product.productstock.stock} units are available.` }, { status: 409 });
  }

  return NextResponse.json(
    await db.onSaleProduct.update({ where: { id }, data: { quantity: parsed.data.qTy } })
  );
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let ctx;
  try { ctx = await requirePaidFeature(request, 'POS_BILLING'); } catch (error) { const response = authErrorResponse(error); if (response) return response; throw error; }
  const line = await db.onSaleProduct.findUnique({ where: { id }, include: { transaction: true } });
  if (!line || line.transaction.businessId !== ctx.businessId) return NextResponse.json({ error: 'Cart line not found.' }, { status: 404 });
  if (line.transaction.isComplete) return NextResponse.json({ error: 'Completed bills cannot be changed.' }, { status: 409 });
  await db.onSaleProduct.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
