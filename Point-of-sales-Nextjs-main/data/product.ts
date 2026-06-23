import { db } from '@/lib/db';
import { getCurrentUserContext } from '@/lib/auth';
import isOnline from 'is-online';

export const fetchProduct = async ({
  take = 5,
  skip = 0,
  query,
}: {
  query?: string;
  take: number;
  skip: number;
}) => {
  const isOnlineResult = await isOnline();

  if (!isOnlineResult) {
    throw new Error('No internet connection');
    return;
  }

  ('use server');
  const ctx = await getCurrentUserContext();
  const [results, total, shop] = await Promise.all([
    db.product.findMany({
      where: {
        productstock: {
          businessId: ctx.businessId,
          name: { contains: query, mode: 'insensitive' },
        },
      },
      skip,
      take,
      select: {
        id: true,
        productId: true,
        sellprice: true,
        productstock: {
          select: {
            id: true,
            name: true,
            cat: true,
            stock: true,
            price: true,
          },
        },
      },
      orderBy: {
        productstock: {
          name: 'asc',
        },
      },
    }),
    db.product.count({
      where: {
        productstock: {
          businessId: ctx.businessId,
          name: { contains: query, mode: 'insensitive' },
        },
      },
    }),
    db.shopData.findFirst({ where: { businessId: ctx.businessId } }),
  ]);

  return {
      data: results,
      currency: shop?.currency ?? 'INR',
      metadata: {
        hasNextPage: skip + take < total,
        totalPages: Math.ceil(total / take),
      },
    };
};
