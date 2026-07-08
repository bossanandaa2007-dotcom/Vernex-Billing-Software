export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { authErrorResponse, requirePermission } from '@/lib/auth';
import { createServerClient } from '@/src/lib/supabase/server';

const cache = new Map<string, { expires: number; data: unknown }>();

export async function GET(request: Request) {
  let ctx;
  try { ctx = await requirePermission(request, 'DASHBOARD_VIEW'); } catch (error) { const response = authErrorResponse(error); if (response) return response; throw error; }
  const cached = cache.get(ctx.businessId);
  if (cached && cached.expires > Date.now()) return NextResponse.json(cached.data);
  const supabase = await createServerClient(request);
  const { data: lines = [] } = await supabase.from('OnSaleProduct')
    .select('productName,quantity,transaction:Transaction!inner(businessId,isComplete)')
    .eq('transaction.businessId', ctx.businessId).eq('transaction.isComplete', true);
  const grouped = new Map<string, number>();
  (lines ?? []).forEach((line) => grouped.set(line.productName, (grouped.get(line.productName) ?? 0) + line.quantity));
  const rows = [...grouped.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);

  const data = {
    topProducts: rows.map(([productName, quantity]) => ({
      id: productName,
      productId: productName,
      productstock: { name: productName || 'Unknown product' },
      _sum: { quantity },
    })),
  };
  cache.set(ctx.businessId, { expires: Date.now() + 30_000, data });
  return NextResponse.json(data);
}
