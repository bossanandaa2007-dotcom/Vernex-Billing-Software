import { db } from '@/lib/db';
import { getCurrentUserContext } from '@/lib/auth';

export async function fetchRecords({ take = 5, skip = 0, query }: { query?: string; take: number; skip: number }) {
  const ctx = await getCurrentUserContext();
  const where = { businessId: ctx.businessId, isComplete: true, OR: [{ id: { contains: query, mode: 'insensitive' as const } }, { billNumber: { contains: query, mode: 'insensitive' as const } }, { customerName: { contains: query, mode: 'insensitive' as const } }] };
  const [results, totalTransactions, shop] = await Promise.all([
    db.transaction.findMany({
      where,
      skip,
      take,
      include: { products: { select: { quantity: true } } },
      orderBy: { completedAt: 'desc' },
    }),
    db.transaction.count({ where }),
    db.shopData.findFirst({ where: { businessId: ctx.businessId } }),
  ]);

  return {
    data: results.map((transaction) => ({
      id: transaction.id,
      billNumber: transaction.billNumber ?? transaction.id,
      completedAt: transaction.completedAt ?? transaction.createdAt,
      itemCount: transaction.products.reduce((sum, item) => sum + item.quantity, 0),
      subtotal: Number(transaction.subtotal),
      taxAmount: Number(transaction.taxAmount),
      discount: Number(transaction.discount),
      totalAmount: Number(transaction.totalAmount),
      paymentMethod: transaction.paymentMethod,
      paymentStatus: transaction.paymentStatus,
      customerName: transaction.customerName,
      returnStatus: transaction.returnStatus,
      refundedAmount: Number(transaction.refundedAmount),
    })),
    currency: shop?.currency ?? 'INR',
    metadata: {
      hasNextPage: skip + take < totalTransactions,
      totalPages: Math.ceil(totalTransactions / take),
    },
  };
}
