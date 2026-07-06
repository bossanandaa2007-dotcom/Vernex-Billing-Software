import { onsaleSchema } from '@/schema';
import { NextResponse } from 'next/server';
import { authErrorResponse } from '@/lib/auth';
import { requirePaidFeature } from '@/lib/guards';
import { createServerClient } from '@/src/lib/supabase/server';

export async function POST(request: Request) {
  let ctx;
  try { ctx = await requirePaidFeature(request, 'POS_BILLING'); } catch (error) { const response = authErrorResponse(error); if (response) return response; throw error; }
  const parsed = onsaleSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { productId, transactionId, qTy } = parsed.data;
  try {
    const supabase = await createServerClient(request);
    const [transactionResult, productResult, existingResult] = await Promise.all([
      supabase.from('Transaction').select('*').eq('id', transactionId).eq('businessId', ctx.businessId).maybeSingle(),
      supabase.from('Product').select('*, productstock:ProductStock!inner(*)').eq('productId', productId).eq('productstock.businessId', ctx.businessId).maybeSingle(),
      supabase.from('OnSaleProduct').select('*').eq('productId', productId).eq('transactionId', transactionId).maybeSingle(),
    ]);
    const transaction = transactionResult.data;
    const product = productResult.data;
    const existing = existingResult.data;

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
      ? (await supabase.from('OnSaleProduct').update({ quantity: nextQuantity }).eq('id', existing.id).select('*').single()).data
      : (await supabase.from('OnSaleProduct').insert({
            transactionId,
            productId,
            quantity: qTy,
            productName: product.productstock.name,
            unitPrice: product.sellprice,
            costPrice: product.productstock.price,
          }).select('*').single()).data;

    return NextResponse.json(line, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Unable to add product to bill.' }, { status: 500 });
  }
}
