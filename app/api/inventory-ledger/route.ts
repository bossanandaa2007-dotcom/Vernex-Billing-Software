import { db } from '@/lib/db';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { authErrorResponse, requirePermission } from '@/lib/auth';
import { requirePaidFeature } from '@/lib/guards';
import { writeAuditLog } from '@/lib/audit';
import { safeOperationMessage } from '@/lib/api-error';

const adjustmentSchema = z.object({
  productId: z.string().min(1),
  newStock: z.number().nonnegative(),
  reason: z.string().trim().min(3).max(250),
});

export async function GET(request: Request) {
  let ctx;
  try { ctx = await requirePermission(request, 'INVENTORY_VIEW'); } catch (error) { const response = authErrorResponse(error); if (response) return response; throw error; }
  const productId = new URL(request.url).searchParams.get('productId') ?? undefined;
  return NextResponse.json(await db.inventoryMovement.findMany({
    where: { businessId: ctx.businessId, ...(productId ? { productId } : {}) }, orderBy: { createdAt: 'desc' }, take: 200,
  }));
}

export async function POST(request: Request) {
  let ctx;
  try { ctx = await requirePaidFeature(request, 'STOCK_ADJUST'); } catch (error) { const response = authErrorResponse(error); if (response) return response; throw error; }
  const parsed = adjustmentSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  try {
    const result = await db.$transaction(async (tx) => {
      const product = await tx.productStock.findFirst({ where: { id: parsed.data.productId, businessId: ctx.businessId } });
      if (!product) throw new Error('Product not found.');
      const updated = await tx.productStock.update({ where: { id: product.id }, data: { stock: parsed.data.newStock } });
      const movement = await tx.inventoryMovement.create({ data: {
        businessId: ctx.businessId, productId: product.id, productNameSnapshot: product.name, movementType: 'ADJUSTMENT',
        quantityChange: updated.stock - product.stock, previousStock: product.stock, newStock: updated.stock,
        referenceType: 'ADJUSTMENT', reason: parsed.data.reason,
      }});
      return { product: updated, movement };
    });
    await writeAuditLog(ctx, { action: 'STOCK_ADJUSTED', entityType: 'ProductStock', entityId: result.product.id, description: `Adjusted stock for ${result.product.name}`, metadata: { newStock: result.product.stock } });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: safeOperationMessage(error, ['Product not found.'], 'Unable to adjust stock. Please try again.') },
      { status: 400 }
    );
  }
}
