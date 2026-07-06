import { customerSchema } from '@/lib/customer-schema';
import { NextResponse } from 'next/server';
import { authErrorResponse, requireAuth } from '@/lib/auth';
import { requirePaidFeature } from '@/lib/guards';
import { writeAuditLog } from '@/lib/audit';
import { createServerClient } from '@/src/lib/supabase/server';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let ctx;
  try { ctx = await requireAuth(request); } catch (error) { const response = authErrorResponse(error); if (response) return response; throw error; }
  const supabase = await createServerClient(request);
  const { data: customer } = await supabase.from('Customer')
    .select('*, transactions:Transaction(*)')
    .eq('id', id).eq('businessId', ctx.businessId).maybeSingle();
  if (customer) customer.transactions = ((customer.transactions ?? []) as any[])
    .filter((sale) => sale.isComplete)
    .sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''));
  return customer ? NextResponse.json(customer) : NextResponse.json({ error: 'Customer not found.' }, { status: 404 });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let ctx;
  try { ctx = await requirePaidFeature(request, 'CUSTOMER_WRITE'); } catch (error) { const response = authErrorResponse(error); if (response) return response; throw error; }
  const parsed = customerSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const value = parsed.data;
  try {
    const supabase = await createServerClient(request);
    const { data: customer } = await supabase.from('Customer').select('id').eq('id', id).eq('businessId', ctx.businessId).maybeSingle();
    if (!customer) return NextResponse.json({ error: 'Customer not found.' }, { status: 404 });
    const { data: updated, error } = await supabase.from('Customer').update({ ...value, email: value.email || null, address: value.address || null, taxId: value.taxId || null, country: value.country || null, notes: value.notes || null }).eq('id', id).select('*').single();
    if (error) throw error;
    await writeAuditLog(ctx, { action: 'CUSTOMER_UPDATED', entityType: 'Customer', entityId: updated.id, description: `Updated customer ${updated.name}` });
    return NextResponse.json(updated);
  } catch { return NextResponse.json({ error: 'Customer not found.' }, { status: 404 }); }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let ctx;
  try { ctx = await requirePaidFeature(request, 'CUSTOMER_WRITE'); } catch (error) { const response = authErrorResponse(error); if (response) return response; throw error; }
  try {
    const supabase = await createServerClient(request);
    const { data: customer } = await supabase.from('Customer').select('id').eq('id', id).eq('businessId', ctx.businessId).maybeSingle();
    if (!customer) return NextResponse.json({ error: 'Customer not found.' }, { status: 404 });
    const { data: updated, error } = await supabase.from('Customer').update({ isActive: false }).eq('id', id).select('*').single();
    if (error) throw error;
    await writeAuditLog(ctx, { action: 'CUSTOMER_DEACTIVATED', entityType: 'Customer', entityId: updated.id, description: `Deactivated customer ${updated.name}` });
    return NextResponse.json(updated);
  }
  catch { return NextResponse.json({ error: 'Customer not found.' }, { status: 404 }); }
}
