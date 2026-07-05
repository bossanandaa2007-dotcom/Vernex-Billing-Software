import { db } from '@/lib/db';
import { productSchema } from '@/schema';
import { NextResponse } from 'next/server';
import { authErrorResponse } from '@/lib/auth';
import { requirePaidFeature } from '@/lib/guards';
import { writeAuditLog } from '@/lib/audit';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
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
  try {
    const product = await db.productStock.update({
      where: { id, businessId: ctx.businessId },
      data: {
        name: productName.trim(),
        stock: stockProduct,
        price: buyPrice,
        cat: category,
        Product: {
          update: { where: { productId: id }, data: { sellprice: sellPrice } },
        },
      },
      include: { Product: true },
    });
    await writeAuditLog(ctx, { action: 'PRODUCT_UPDATED', entityType: 'ProductStock', entityId: product.id, description: `Updated product ${product.name}` });
    return NextResponse.json(product);
  } catch (error) {
    console.error('Update product failed:', error);
    return NextResponse.json({ error: 'Product not found or invalid.' }, { status: 404 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let ctx;
  try {
    ctx = await requirePaidFeature(request, 'PRODUCT_WRITE');
  } catch (error) {
    const response = authErrorResponse(error);
    if (response) return response;
    throw error;
  }
  try {
    await db.productStock.delete({ where: { id, businessId: ctx.businessId } });
    await writeAuditLog(ctx, { action: 'PRODUCT_DELETED_OR_DEACTIVATED', entityType: 'ProductStock', entityId: id, description: `Deleted product ${id}` });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Product not found.' }, { status: 404 });
  }
}
