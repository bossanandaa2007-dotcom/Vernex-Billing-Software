import { productSchema } from '@/schema';
import { NextResponse } from 'next/server';
import { authErrorResponse } from '@/lib/auth';
import { requirePaidFeature } from '@/lib/guards';
import { writeAuditLog } from '@/lib/audit';
import { createServerClient } from '@/src/lib/supabase/server';

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

  const { productName, stockProduct, buyPrice, sellPrice, category, hasVariants, variants } = parsed.data;
  try {
    const supabase = await createServerClient(request);
    const { data: stock, error } = await supabase
      .from('ProductStock')
      .update({
        name: productName.trim(),
        stock: stockProduct,
        price: buyPrice,
        cat: category,
      })
      .eq('id', id)
      .eq('businessId', ctx.businessId)
      .select('*')
      .single();
    if (error) throw error;
    const { data: saleProduct, error: priceError } = await supabase
      .from('Product')
      .update({ sellprice: sellPrice })
      .eq('productId', id)
      .select('*')
      .single();
    if (priceError) throw priceError;
    await supabase.from('ProductVariant').delete().eq('productId', id).eq('businessId', ctx.businessId);
    let variantRows: unknown[] = [];
    if (hasVariants && variants.length) {
      const { data, error: variantError } = await supabase
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
      if (variantError) throw variantError;
      variantRows = data ?? [];
    }
    const product = { ...stock, Product: [saleProduct], variants: variantRows };
    await writeAuditLog(ctx, { action: 'PRODUCT_UPDATED', entityType: 'ProductStock', entityId: product.id, description: `Updated product ${product.name}` });
    return NextResponse.json(product);
  } catch (error) {
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
    const supabase = await createServerClient(request);
    const { error } = await supabase.from('ProductStock').delete().eq('id', id).eq('businessId', ctx.businessId);
    if (error) throw error;
    await writeAuditLog(ctx, { action: 'PRODUCT_DELETED_OR_DEACTIVATED', entityType: 'ProductStock', entityId: id, description: `Deleted product ${id}` });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Product not found.' }, { status: 404 });
  }
}
