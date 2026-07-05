import { db } from '@/lib/db';
import { onsaleSchema } from '@/schema';
import { NextResponse } from 'next/server';
import { authErrorResponse } from '@/lib/auth';
import { requirePaidFeature } from '@/lib/guards';

export async function POST(request: Request) {
  let ctx;
  try { ctx = await requirePaidFeature(request, 'POS_BILLING'); } catch (error) { const response = authErrorResponse(error); if (response) return response; throw error; }
  const parsed = onsaleSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { productId, transactionId, qTy } = parsed.data;
  try {
    const [transaction, product, existing] = await Promise.all([
      db.transaction.findFirst({ where: { id: transactionId, businessId: ctx.businessId } }),
      db.product.findFirst({ where: { productId, productstock: { businessId: ctx.businessId } }, include: { productstock: true } }),
      db.onSaleProduct.findFirst({ where: { productId, transactionId } }),
    ]);

    if (!transaction || transaction.isComplete) {
      return NextResponse.json({ error: 'Bill is missing or already completed.' }, { status: 409 });
    }
    if (!product) {
      return NextResponse.json({ error: 'Product is not sellable.' }, { status: 404 });
    }

    const nextQuantity = (existing?.quantity ?? 0) + qTy;
    if (nextQuantity > product.productstock.stock) {
      return NextResponse.json(
        { error: `Only ${product.productstock.stock} units are available.` },
        { status: 409 }
      );
    }

    const line = existing
      ? await db.onSaleProduct.update({
          where: { id: existing.id },
          data: { quantity: nextQuantity },
        })
      : await db.onSaleProduct.create({
          data: {
            transactionId,
            productId,
            quantity: qTy,
            productName: product.productstock.name,
            unitPrice: product.sellprice,
            costPrice: product.productstock.price,
          },
        });

    return NextResponse.json(line, { status: 201 });
  } catch (error) {
    console.error('Add cart line failed:', error);
    return NextResponse.json({ error: 'Unable to add product to bill.' }, { status: 500 });
  }
}

