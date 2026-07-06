import { checkoutSchema } from '@/schema';
import { NextResponse } from 'next/server';
import { authErrorResponse, requirePermission } from '@/lib/auth';
import { requirePaidFeature } from '@/lib/guards';
import { safeOperationMessage } from '@/lib/api-error';
import { createServerClient } from '@/src/lib/supabase/server';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let ctx;
  try { ctx = await requirePermission(request, 'POS_BILLING'); } catch (error) { const response = authErrorResponse(error); if (response) return response; throw error; }
  const supabase = await createServerClient(request);
  const { data: transaction } = await supabase.from('Transaction')
    .select('*, products:OnSaleProduct(*, product:Product(*, productstock:ProductStock(*))), returns:SaleReturn(*, items:ReturnItem(*))')
    .eq('id', id).eq('businessId', ctx.businessId).maybeSingle();
  if (transaction) {
    transaction.products = ((transaction.products ?? []) as any[]).sort((a, b) => a.productName.localeCompare(b.productName));
    transaction.returns = ((transaction.returns ?? []) as any[]).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  if (!transaction) return NextResponse.json({ error: 'Bill not found.' }, { status: 404 });
  return NextResponse.json({ transaction, items: transaction.products });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let ctx;
  try { ctx = await requirePaidFeature(request, 'POS_BILLING'); } catch (error) { const response = authErrorResponse(error); if (response) return response; throw error; }
  const parsed = checkoutSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const supabase = await createServerClient(request);
    const { data: result, error } = await supabase.rpc('complete_sale', {
      p_transaction_id: id,
      p_checkout: parsed.data,
    });
    if (error) throw new Error(error.message);
    return NextResponse.json(result);
  } catch (error) {
    const rawMessage = safeOperationMessage(
      error,
      [
        'Transaction already closed',
        'Bill not found.',
        'already been checked out.',
        'Add at least one product',
        'Selected customer is unavailable.',
        'Payment method is not available',
        'product in this bill no longer exists.',
        'Insufficient stock',
        'Amount received',
      ],
      'Unable to complete the bill. Please try again.'
    );
    const message = rawMessage.includes('Transaction already closed')
      ? 'Checkout took too long. Please try Complete Payment again.'
      : rawMessage;
    const status = message.includes('already') ? 409 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let ctx;
  try { ctx = await requirePaidFeature(request, 'POS_BILLING'); } catch (error) { const response = authErrorResponse(error); if (response) return response; throw error; }
  const supabase = await createServerClient(request);
  const { data: transaction } = await supabase.from('Transaction').select('id,isComplete').eq('id', id).eq('businessId', ctx.businessId).maybeSingle();
  if (!transaction) return NextResponse.json({ error: 'Bill not found.' }, { status: 404 });
  if (transaction.isComplete) {
    return NextResponse.json({ error: 'Completed sales cannot be deleted.' }, { status: 409 });
  }
  await supabase.from('Transaction').delete().eq('id', id);
  return NextResponse.json({ success: true });
}
