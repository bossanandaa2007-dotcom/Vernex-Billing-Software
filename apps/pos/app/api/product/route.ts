import { productSchema } from '@/schema';
import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { authErrorResponse } from '@/lib/auth';
import { requirePaidFeature } from '@/lib/guards';
import { writeAuditLog } from '@/lib/audit';
import { createServerClient } from '@/src/lib/supabase/server';

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

  const { productName, stockProduct, buyPrice, sellPrice, category, hasVariants, variants } = parsed.data;
  const id = `PRD-${randomUUID().slice(0, 8)}`;

  try {
    const supabase = await createServerClient(request);
    const { data: stock, error: stockError } = await supabase
      .from('ProductStock')
      .insert({
        id,
        businessId: ctx.businessId,
        name: productName.trim(),
        stock: stockProduct,
        price: buyPrice,
        cat: category,
      })
      .select('*')
      .single();
    if (stockError) throw stockError;
    const { data: saleProduct, error: productError } = await supabase
      .from('Product')
      .insert({ productId: id, sellprice: sellPrice })
      .select('*')
      .single();
    if (productError) {
      await supabase.from('ProductStock').delete().eq('id', id);
      throw productError;
    }
    let variantRows: unknown[] = [];
    if (hasVariants && variants.length) {
      const { data, error } = await supabase
        .from('ProductVariant')
        .insert(variants.map((variant, index) => ({
          productId: id,
          businessId: ctx.businessId,
          name: variant.name.trim(),
          price: variant.price,
          sku: variant.sku?.trim() || null,
          sortOrder: index,
        })))
        .select('*');
      if (error) {
        await supabase.from('ProductStock').delete().eq('id', id);
        throw error;
      }
      variantRows = data ?? [];
    }
    const product = { ...stock, Product: [saleProduct], variants: variantRows };
    await writeAuditLog(ctx, { action: 'PRODUCT_CREATED', entityType: 'ProductStock', entityId: product.id, description: `Created product ${product.name}` });
    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Unable to create product.' }, { status: 500 });
  }
}
