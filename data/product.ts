import { db } from '@/lib/db';
import { getCurrentUserContext } from '@/lib/auth';
import isOnline from 'is-online';
import { CatProduct } from '@prisma/client';

export const fetchProduct = async ({
  take = 5,
  skip = 0,
  query,
  category,
}: {
  query?: string;
  category?: string;
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
  const selectedCategory = Object.values(CatProduct).includes(category as CatProduct) ? category as CatProduct : undefined;
  const productWhere = {
    productstock: {
      businessId: ctx.businessId,
      ...(query ? { name: { contains: query, mode: 'insensitive' as const } } : {}),
      ...(selectedCategory ? { cat: selectedCategory } : {}),
    },
  };
  const [results, total, shop, categoryRows] = await Promise.all([
    db.product.findMany({
      where: productWhere,
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
            imageProduct: true,
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
          ...(query ? { name: { contains: query, mode: 'insensitive' } } : {}),
          ...(selectedCategory ? { cat: selectedCategory } : {}),
        },
      },
    }),
    db.shopData.findFirst({ where: { businessId: ctx.businessId } }),
    db.productStock.findMany({
      where: { businessId: ctx.businessId, Product: { some: {} } },
      distinct: ['cat'],
      select: { cat: true },
      orderBy: { cat: 'asc' },
    }),
  ]);

  return {
      data: results,
      categories: categoryRows.map((item) => item.cat),
      currency: shop?.currency ?? 'INR',
      metadata: {
        hasNextPage: skip + take < total,
        totalPages: Math.ceil(total / take),
      },
    };
};
