import { db } from '@/lib/db';
import { NextResponse } from 'next/server';
import { customerSchema } from '@/lib/customer-schema';
import { authErrorResponse, requireAuth } from '@/lib/auth';
import { requirePaidFeature } from '@/lib/guards';
import { writeAuditLog } from '@/lib/audit';

export async function GET(request: Request) {
  let ctx;
  try {
    ctx = await requireAuth(request);
  } catch (error) {
    const response = authErrorResponse(error);
    if (response) return response;
    throw error;
  }
  const query = new URL(request.url).searchParams.get('q')?.trim() ?? '';
  const customers = await db.customer.findMany({
    where: {
      businessId: ctx.businessId,
      isActive: true,
      ...(query ? { OR: ['name', 'phone', 'email', 'taxId'].map((field) => ({ [field]: { contains: query, mode: 'insensitive' } })) } : {}),
    },
    include: {
      transactions: { where: { isComplete: true }, select: { id: true, billNumber: true, totalAmount: true, refundedAmount: true, completedAt: true } },
    },
    orderBy: { updatedAt: 'desc' },
    take: 100,
  });
  return NextResponse.json(customers.map((customer) => ({
    ...customer,
    totalPurchases: customer.transactions.length,
    totalSpent: customer.transactions.reduce((sum, sale) => sum + Number(sale.totalAmount ?? 0) - Number(sale.refundedAmount), 0),
    lastPurchaseDate: customer.transactions.reduce<Date | null>((latest, sale) => !latest || (sale.completedAt && sale.completedAt > latest) ? sale.completedAt : latest, null),
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
  const customer = await db.customer.create({ data: {
    businessId: ctx.businessId,
    name: data.name, phone: data.phone, email: data.email || null, address: data.address || null,
    taxId: data.taxId || null, country: data.country || null, notes: data.notes || null,
  }});
  await writeAuditLog(ctx, { action: 'CUSTOMER_CREATED', entityType: 'Customer', entityId: customer.id, description: `Created customer ${customer.name}` });
  return NextResponse.json(customer, { status: 201 });
}

