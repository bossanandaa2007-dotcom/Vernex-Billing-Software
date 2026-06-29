import { db } from '@/lib/db';
import { productSchema } from '@/schema';
import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { authErrorResponse } from '@/lib/auth';
import { requirePaidFeature } from '@/lib/guards';
import { writeAuditLog } from '@/lib/audit';

export async function POST(request: Request) {
  let ctx;
  try {
    ctx = await requirePaidFeature(request, 'PRODUCT_WRITE');
  } catch (error) {
    const response = authErrorResponse(error);
    if (response) return response;
    throw error;
  }
  const parsed = productSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { productName, stockProduct, buyPrice, sellPrice, category } = parsed.data;
  const id = `PRD-${uuidv4().slice(0, 8)}`;

  try {
    const product = await db.productStock.create({
      data: {
        id,
        businessId: ctx.businessId,
        name: productName.trim(),
        stock: stockProduct,
        price: buyPrice,
        cat: category,
        Product: { create: { sellprice: sellPrice } },
      },
      include: { Product: true },
    });
    await writeAuditLog(ctx, { action: 'PRODUCT_CREATED', entityType: 'ProductStock', entityId: product.id, description: `Created product ${product.name}` });
    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error('Create product failed:', error);
    return NextResponse.json({ error: 'Unable to create product.' }, { status: 500 });
  }
}

