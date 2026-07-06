import { getCurrentUserContext } from '@/lib/auth';
import isOnline from 'is-online';
import { CatProduct } from '@/src/types/domain';
import { createServerClient } from '@/src/lib/supabase/server';

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
  'use server';

  try {
    const isOnlineResult = await isOnline();

    if (!isOnlineResult) return null;

  const ctx = await getCurrentUserContext();
  const selectedCategory = Object.values(CatProduct).includes(category as CatProduct) ? category as CatProduct : undefined;
  const supabase = await createServerClient();
  let productsQuery = supabase
    .from('Product')
    .select('id, productId, sellprice, productstock:ProductStock!inner(id,name,imageProduct,cat,stock,price,businessId)', { count: 'exact' })
    .eq('productstock.businessId', ctx.businessId)
    .range(skip, skip + take - 1);
  if (query) productsQuery = productsQuery.ilike('productstock.name', `%${query}%`);
  if (selectedCategory) productsQuery = productsQuery.eq('productstock.cat', selectedCategory);
  const [productsResult, shopResult, categoryResult] = await Promise.all([
    productsQuery,
    supabase.from('ShopData').select('currency').eq('businessId', ctx.businessId).maybeSingle(),
    supabase.from('ProductStock').select('cat').eq('businessId', ctx.businessId).order('cat'),
  ]);
  if (productsResult.error) throw productsResult.error;
  const results = (productsResult.data ?? []).map((row) => ({
    ...row,
    productstock: Array.isArray(row.productstock) ? row.productstock[0] : row.productstock,
  }));
  const total = productsResult.count ?? 0;
  const shop = shopResult.data;
  const categoryRows = Array.from(new Set((categoryResult.data ?? []).map((item) => item.cat)))
    .map((cat) => ({ cat }));

    return {
      data: results,
      categories: categoryRows.map((item) => item.cat),
      currency: shop?.currency ?? 'INR',
      metadata: {
        hasNextPage: skip + take < total,
        totalPages: Math.ceil(total / take),
      },
    };
  } catch {
    return null;
  }
};
