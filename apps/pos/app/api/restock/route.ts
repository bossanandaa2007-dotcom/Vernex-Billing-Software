import { NextResponse } from 'next/server';
import { z } from 'zod';
import { authErrorResponse } from '@/lib/auth';
import { requirePaidFeature } from '@/lib/guards';
import { createServerClient } from '@/src/lib/supabase/server';

const schema = z.object({ productId: z.string().min(1), stock: z.number().positive(), reason: z.string().trim().min(3).max(250).default('Product restock') });

export async function POST(request: Request) {
  let ctx;
  try { ctx = await requirePaidFeature(request, 'STOCK_ADJUST'); } catch (error) { const response = authErrorResponse(error); if (response) return response; throw error; }
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: 'A product and positive stock quantity are required.' }, { status: 400 });
  }

  try {
    const supabase = await createServerClient(request);
    const { data: result, error } = await supabase.rpc('restock_product', {
      p_product_id: parsed.data.productId,
      p_quantity: parsed.data.stock,
      p_reason: parsed.data.reason,
    });
    if (error) throw error;
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: 'Product not found.' }, { status: 404 });
  }
}
