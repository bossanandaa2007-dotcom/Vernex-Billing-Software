import { db } from '@/lib/db';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { authErrorResponse } from '@/lib/auth';
import { requirePaidFeature } from '@/lib/guards';
import { writeAuditLog } from '@/lib/audit';

const schema = z.object({ productId: z.string().min(1), stock: z.number().positive(), reason: z.string().trim().min(3).max(250).default('Product restock') });

export async function POST(request: Request) {
  let ctx;
  try { ctx = await requirePaidFeature(request, 'STOCK_ADJUST'); } catch (error) { const response = authErrorResponse(error); if (response) return response; throw error; }
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: 'A product and positive stock quantity are required.' }, { status: 400 });
  }

  try {
    const result = await db.$transaction(async (tx) => {
      const previous = await tx.productStock.findFirst({ where: { id: parsed.data.productId, businessId: ctx.businessId } });
      if (!previous) throw new Error('Product not found.');
      const product = await tx.productStock.update({ where: { id: previous.id }, data: { stock: { increment: parsed.data.stock } } });
      const movement = await tx.inventoryMovement.create({ data: {
        businessId: ctx.businessId, productId: previous.id, productNameSnapshot: previous.name, movementType: 'RESTOCK',
        quantityChange: parsed.data.stock, previousStock: previous.stock, newStock: product.stock,
        referenceType: 'RESTOCK', reason: parsed.data.reason,
      }});
      return { product, movement };
    });
    await writeAuditLog(ctx, { action: 'STOCK_RESTOCKED', entityType: 'ProductStock', entityId: result.product.id, description: `Restocked ${result.product.name}`, metadata: { quantity: parsed.data.stock } });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: 'Product not found.' }, { status: 404 });
  }
}

