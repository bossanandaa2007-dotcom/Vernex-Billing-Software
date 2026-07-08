import { NextResponse } from 'next/server';
import { customerSchema } from '@/lib/customer-schema';
import { authErrorResponse, requirePermission } from '@/lib/auth';
import { requirePaidFeature } from '@/lib/guards';
import { writeAuditLog } from '@/lib/audit';
import { createServerClient } from '@/src/lib/supabase/server';

export async function GET(request: Request) {
  let ctx;
  try {
    ctx = await requirePermission(request, 'CUSTOMER_WRITE');
  } catch (error) {
    const response = authErrorResponse(error);
    if (response) return response;
    throw error;
  }
  const query = new URL(request.url).searchParams.get('q')?.trim() ?? '';
  const supabase = await createServerClient(request);
  let customerQuery = supabase
    .from('Customer')
    .select('*, transactions:Transaction(id,billNumber,totalAmount,refundedAmount,completedAt,isComplete)')
    .eq('businessId', ctx.businessId)
    .eq('isActive', true)
    .order('updatedAt', { ascending: false })
    .limit(100);
  if (query) customerQuery = customerQuery.or(`name.ilike.%${query}%,phone.ilike.%${query}%,email.ilike.%${query}%,taxId.ilike.%${query}%`);
  const { data: customerRows, error } = await customerQuery;
  if (error) throw error;
  const customers = ((customerRows ?? []) as any[]).map((customer) => ({
    ...customer,
    transactions: (customer.transactions ?? []).filter((sale: any) => sale.isComplete),
  }));
  return NextResponse.json(customers.map((customer) => ({
    ...customer,
    totalPurchases: customer.transactions.length,
    totalSpent: customer.transactions.reduce((sum: number, sale: any) => sum + Number(sale.totalAmount ?? 0) - Number(sale.refundedAmount), 0),
    lastPurchaseDate: customer.transactions.reduce((latest: string | null, sale: any) => !latest || (sale.completedAt && sale.completedAt > latest) ? sale.completedAt : latest, null),
  })));
}

export async function POST(request: Request) {
  let ctx;
  try {
    ctx = await requirePaidFeature(request, 'CUSTOMER_WRITE');
  } catch (error) {
    const response = authErrorResponse(error);
    if (response) return response;
    throw error;
  }
  const parsed = customerSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const data = parsed.data;
  const supabase = await createServerClient(request);
  const { data: customer, error } = await supabase.from('Customer').insert({
    businessId: ctx.businessId,
    name: data.name, phone: data.phone, email: data.email || null, address: data.address || null,
    taxId: data.taxId || null, country: data.country || null, notes: data.notes || null,
  }).select('*').single();
  if (error) return NextResponse.json({ error: 'Unable to add customer.' }, { status: 400 });
  await writeAuditLog(ctx, { action: 'CUSTOMER_CREATED', entityType: 'Customer', entityId: customer.id, description: `Created customer ${customer.name}` });
  return NextResponse.json(customer, { status: 201 });
}
