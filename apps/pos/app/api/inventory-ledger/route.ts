import { NextResponse } from 'next/server';
import { z } from 'zod';
import { authErrorResponse, requirePermission } from '@/lib/auth';
import { requirePaidFeature } from '@/lib/guards';
import { safeOperationMessage } from '@/lib/api-error';
import { createServerClient } from '@/src/lib/supabase/server';

const adjustmentSchema = z.object({
  productId: z.string().min(1),
  newStock: z.number().nonnegative(),
  reason: z.string().trim().min(3).max(250),
});

export async function GET(request: Request) {
  let ctx;
  try { ctx = await requirePermission(request, 'INVENTORY_VIEW'); } catch (error) { const response = authErrorResponse(error); if (response) return response; throw error; }
  const productId = new URL(request.url).searchParams.get('productId') ?? undefined;
  const supabase = await createServerClient(request);
  let query = supabase.from('InventoryMovement').select('*').eq('businessId', ctx.businessId).order('createdAt', { ascending: false }).limit(200);
  if (productId) query = query.eq('productId', productId);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: 'Unable to load inventory.' }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  let ctx;
  try { ctx = await requirePaidFeature(request, 'STOCK_ADJUST'); } catch (error) { const response = authErrorResponse(error); if (response) return response; throw error; }
  const parsed = adjustmentSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  try {
    const supabase = await createServerClient(request);
    const { data: result, error } = await supabase.rpc('adjust_stock', {
      p_product_id: parsed.data.productId,
      p_new_stock: parsed.data.newStock,
      p_reason: parsed.data.reason,
    });
    if (error) throw new Error(error.message);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: safeOperationMessage(error, ['Product not found.'], 'Unable to adjust stock. Please try again.') },
      { status: 400 }
    );
  }
}
