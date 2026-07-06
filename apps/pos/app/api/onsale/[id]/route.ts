import { orderSchema } from '@/schema';
import { NextResponse } from 'next/server';
import { authErrorResponse } from '@/lib/auth';
import { requirePaidFeature } from '@/lib/guards';
import { createServerClient } from '@/src/lib/supabase/server';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let ctx;
  try { ctx = await requirePaidFeature(request, 'POS_BILLING'); } catch (error) { const response = authErrorResponse(error); if (response) return response; throw error; }
  const parsed = orderSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const supabase = await createServerClient(request);
  const { data: line } = await supabase.from('OnSaleProduct')
    .select('*, transaction:Transaction(*), product:Product(*, productstock:ProductStock(*))')
    .eq('id', id).maybeSingle();
  if (!line || !line.product || line.transaction.businessId !== ctx.businessId) return NextResponse.json({ error: 'Cart line not found.' }, { status: 404 });
  if (line.transaction.isComplete) return NextResponse.json({ error: 'Completed bills cannot be changed.' }, { status: 409 });
  if (parsed.data.qTy > line.product.productstock.stock) {
    return NextResponse.json({ error: `Only ${line.product.productstock.stock} units are available.` }, { status: 409 });
  }

  return NextResponse.json(
    (await supabase.from('OnSaleProduct').update({ quantity: parsed.data.qTy }).eq('id', id).select('*').single()).data
  );
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let ctx;
  try { ctx = await requirePaidFeature(request, 'POS_BILLING'); } catch (error) { const response = authErrorResponse(error); if (response) return response; throw error; }
  const supabase = await createServerClient(request);
  const { data: line } = await supabase.from('OnSaleProduct').select('*, transaction:Transaction(*)').eq('id', id).maybeSingle();
  if (!line || line.transaction.businessId !== ctx.businessId) return NextResponse.json({ error: 'Cart line not found.' }, { status: 404 });
  if (line.transaction.isComplete) return NextResponse.json({ error: 'Completed bills cannot be changed.' }, { status: 409 });
  await supabase.from('OnSaleProduct').delete().eq('id', id);
  return NextResponse.json({ success: true });
}
