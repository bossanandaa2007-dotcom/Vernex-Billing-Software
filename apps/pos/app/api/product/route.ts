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
    // ProductStock must exist first: both Product and ProductVariant reference its id.
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

    // Product and variants only depend on the stock id, not on each other, so
    // insert them concurrently instead of in two sequential round-trips.
    const shouldInsertVariants = hasVariants && variants.length > 0;
    const [productResult, variantResult] = await Promise.all([
      supabase
        .from('Product')
        .insert({ productId: id, sellprice: sellPrice })
        .select('*')
        .single(),
      shouldInsertVariants
        ? supabase
            .from('ProductVariant')
            .insert(variants.map((variant, index) => ({
              productId: id,
              businessId: ctx.businessId,
              name: variant.name.trim(),
              price: variant.price,
              sku: variant.sku?.trim() || null,
              sortOrder: index,
            })))
            .select('*')
        : Promise.resolve({ data: [], error: null } as const),
    ]);

    if (productResult.error || variantResult.error) {
      // Roll back any partial inserts so a failed create leaves nothing behind.
      await supabase.from('ProductStock').delete().eq('id', id);
      throw productResult.error ?? variantResult.error;
    }

    const product = { ...stock, Product: [productResult.data], variants: variantResult.data ?? [] };
    // Audit logging is non-critical; don't make the client wait on the extra write.
    void writeAuditLog(ctx, { action: 'PRODUCT_CREATED', entityType: 'ProductStock', entityId: product.id, description: `Created product ${product.name}` })
      .catch(() => undefined);
    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Unable to create product.' }, { status: 500 });
  }
}
