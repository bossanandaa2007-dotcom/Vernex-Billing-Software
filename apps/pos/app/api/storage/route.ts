import { NextResponse } from 'next/server';
import { authErrorResponse, requireAuth } from '@/lib/auth';
import { createServerClient } from '@/src/lib/supabase/server';

export async function GET(request: Request) {
  let ctx;
  try { ctx = await requireAuth(request); } catch (error) { const response = authErrorResponse(error); if (response) return response; throw error; }
  try {
    const supabase = await createServerClient(request);
    const { data: productStocks, error } = await supabase.from('ProductStock')
      .select('*, Product!inner(sellprice)').eq('businessId', ctx.businessId).order('name');
    if (error) throw error;
    return NextResponse.json(productStocks);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch products.' }, { status: 500 });
  }
}
