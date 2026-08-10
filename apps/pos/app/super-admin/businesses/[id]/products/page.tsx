import { notFound } from 'next/navigation';
import { PackageSearch } from 'lucide-react';
import { getBusiness, listBusinessProducts } from '@/services/super-admin/admin-data.server';
import { PageHeader } from '@/components/super-admin/page-header';
import { Card } from '@/components/super-admin/ui/card';
import { Badge } from '@/components/super-admin/ui/badge';
import { ErrorState } from '@/components/super-admin/ui/states';
import { MenuImportPanel } from '@/components/super-admin/menu-import-panel';
import { formatCurrency } from '@/lib/super-admin/utils';

export default async function BusinessProductsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const [{ business }, products] = await Promise.all([getBusiness(id), listBusinessProducts(id)]);
    if (!business) notFound();
    return (
      <div className="space-y-6">
        <PageHeader title={`${business.name} Products`} description="Review tenant products and import menus for this selected client." />
        <MenuImportPanel businessId={id} />
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-200 p-5 dark:border-slate-800">
            <h2 className="font-semibold">Existing Products</h2>
            <Badge tone="ACTIVE">{products.length} products</Badge>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500 dark:bg-slate-950/40">
                <tr><th className="px-4 py-3">Product</th><th className="px-4 py-3">Category</th><th className="px-4 py-3">Price</th><th className="px-4 py-3">Variants</th><th className="px-4 py-3">SKU</th></tr>
              </thead>
              <tbody>
                {products.map((product) => {
                  const stock = product.productstock;
                  const variants = stock?.variants ?? [];
                  return (
                    <tr key={product.productId} className="border-t border-slate-100 dark:border-slate-800">
                      <td className="px-4 py-3 font-medium">{stock?.name}</td>
                      <td className="px-4 py-3">{stock?.cat}</td>
                      <td className="px-4 py-3">{formatCurrency(Number(product.sellprice ?? 0))}</td>
                      <td className="px-4 py-3">{variants.length || 'None'}</td>
                      <td className="px-4 py-3 text-slate-500">{product.productId}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {!products.length && <div className="flex min-h-40 flex-col items-center justify-center p-8 text-center text-sm text-slate-500"><PackageSearch className="mb-3 h-7 w-7" />No products for this client yet.</div>}
        </Card>
      </div>
    );
  } catch {
    return <ErrorState message="Unable to load this business products page." />;
  }
}
