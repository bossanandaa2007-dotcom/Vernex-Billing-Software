import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { authErrorResponse } from '@/lib/auth';
import { requirePaidFeature } from '@/lib/guards';
import { createServerClient } from '@/src/lib/supabase/server';

export async function POST(request: Request) {
  let ctx;
  try { ctx = await requirePaidFeature(request, 'POS_BILLING'); } catch (error) { const response = authErrorResponse(error); if (response) return response; throw error; }
  try {
    const supabase = await createServerClient(request);
    const { data: transaction, error } = await supabase
      .from('Transaction')
      .insert({ id: `TRS-${randomUUID().slice(0, 8).toUpperCase()}`, businessId: ctx.businessId })
      .select('*')
      .single();
    if (error) throw error;
    return NextResponse.json(transaction, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Unable to start bill.' }, { status: 500 });
  }
}
