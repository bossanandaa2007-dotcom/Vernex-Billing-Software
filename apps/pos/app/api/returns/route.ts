import { PaymentMethod } from '@/src/types/domain';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { authErrorResponse } from '@/lib/auth';
import { requirePaidFeature } from '@/lib/guards';
import { safeOperationMessage } from '@/lib/api-error';
import { createServerClient } from '@/src/lib/supabase/server';

const schema = z.object({
  transactionId: z.string().min(1),
  refundMethod: z.nativeEnum(PaymentMethod),
  reason: z.string().trim().min(3).max(250),
  items: z.array(z.object({ saleLineId: z.string().min(1), quantity: z.number().int().positive() })).min(1),
});

export async function POST(request: Request) {
  let ctx;
  try { ctx = await requirePaidFeature(request, 'RETURNS_MANAGE'); } catch (error) { const response = authErrorResponse(error); if (response) return response; throw error; }
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  try {
    const supabase = await createServerClient(request);
    const { data: result, error } = await supabase.rpc('process_return', {
      p_transaction_id: parsed.data.transactionId,
      p_refund_method: parsed.data.refundMethod,
      p_reason: parsed.data.reason,
      p_items: parsed.data.items,
    });
    if (error) throw new Error(error.message);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error: safeOperationMessage(
          error,
          [
            'Completed sale not found.',
            'selected sale item was not found.',
            'Return quantity exceeds',
            'can no longer be returned',
            'no longer exists.',
          ],
          'Unable to process the return. Please try again.'
        ),
      },
      { status: 400 }
    );
  }
}
