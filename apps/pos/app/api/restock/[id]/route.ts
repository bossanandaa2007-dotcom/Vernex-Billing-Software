import { restockSchema } from '@/schema';
import { NextResponse } from 'next/server';
import { authErrorResponse } from '@/lib/auth';
import { requirePaidFeature } from '@/lib/guards';
import { createServerClient } from '@/src/lib/supabase/server';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let ctx;
  try { ctx = await requirePaidFeature(request, 'STOCK_ADJUST'); } catch (error) { const response = authErrorResponse(error); if (response) return response; throw error; }
  const parsed = restockSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  try {
    const supabase = await createServerClient(request);
    const { data, error } = await supabase.rpc('restock_product', {
      p_product_id: id,
      p_quantity: parsed.data.stock,
      p_reason: 'Product restock',
    });
    if (error) throw error;
    const product = (data as { product: unknown }).product;
    return NextResponse.json(product);
  } catch {
    return NextResponse.json({ error: 'Product not found.' }, { status: 404 });
  }
}
