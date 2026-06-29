import { db } from '@/lib/db';
import { getCurrentUserContext } from '@/lib/auth';

export type RecordsPeriod = 'all' | 'daily' | 'weekly' | 'monthly';

function getPeriodRange(period: RecordsPeriod) {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  if (period === 'weekly') {
    start.setDate(start.getDate() - 6);
  }

  if (period === 'monthly') {
    start.setDate(1);
  }

  return { start, end };
}

export async function fetchRecords({
  take = 5,
  skip = 0,
  query,
  period = 'all',
}: {
  query?: string;
  take: number;
  skip: number;
  period?: RecordsPeriod;
}) {
  const ctx = await getCurrentUserContext();
  const trimmedQuery = query?.trim();
  const range = period === 'all' ? null : getPeriodRange(period);
  const where = {
    businessId: ctx.businessId,
    isComplete: true,
    ...(range ? { completedAt: { gte: range.start, lte: range.end } } : {}),
    ...(trimmedQuery
      ? {
          OR: [
            { id: { contains: trimmedQuery, mode: 'insensitive' as const } },
            { billNumber: { contains: trimmedQuery, mode: 'insensitive' as const } },
            { customerName: { contains: trimmedQuery, mode: 'insensitive' as const } },
            { customerPhone: { contains: trimmedQuery, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  };
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
      totalTransactions,
    },
  };
}
