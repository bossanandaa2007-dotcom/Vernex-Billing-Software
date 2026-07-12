import { NextResponse } from 'next/server';
import { authErrorResponse, requireAuth } from '@/lib/auth';
import { createServerClient } from '@/src/lib/supabase/server';

export async function GET(request: Request) {
  let ctx;
  try { ctx = await requireAuth(request); } catch (error) { const response = authErrorResponse(error); if (response) return response; throw error; }
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(Number(searchParams.get('page') ?? '1') || 1, 1);
    const limit = Math.min(Math.max(Number(searchParams.get('limit') ?? '24') || 24, 1), 60);
    const query = searchParams.get('q')?.trim();
    const category = searchParams.get('category')?.trim();
    const brand = searchParams.get('brand')?.trim();
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const supabase = await createServerClient(request);
    let productQuery = supabase.from('ProductStock')
      .select('id,name,imageProduct,price,stock,cat,Product!inner(sellprice),variants:ProductVariant(id,name,price,sku,sortOrder)', { count: 'exact' })
      .eq('businessId', ctx.businessId)
      .order('name')
      .range(from, to);

    if (query) {
      const safeQuery = query.replaceAll('%', '\\%').replaceAll(',', '');
      productQuery = productQuery.or(`id.ilike.%${safeQuery}%,name.ilike.%${safeQuery}%`);
    }
    if (category) productQuery = productQuery.eq('cat', category);
    if (brand) productQuery = productQuery.ilike('id', `${brand}%`);

    // The category list only changes with the catalog, not with pagination or
    // filters. Skip the full-table scan except on the initial unfiltered load.
    const needCategories = page === 1 && !query && !category && !brand;
    const [productsResult, categoriesResult] = await Promise.all([
      productQuery,
      needCategories
        ? supabase.from('ProductStock').select('cat').eq('businessId', ctx.businessId).order('cat')
        : Promise.resolve({ data: null as { cat: string | null }[] | null }),
    ]);
    const { data: productStocks, error, count } = productsResult;
    if (error) throw error;
    const categories = categoriesResult.data
      ? Array.from(new Set(categoriesResult.data.map((item) => item.cat).filter(Boolean)))
      : null;
    return NextResponse.json({
      data: productStocks ?? [],
      categories,
      metadata: {
        page,
        limit,
        total: count ?? 0,
        hasNextPage: page * limit < (count ?? 0),
      },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch products.' }, { status: 500 });
  }
}
