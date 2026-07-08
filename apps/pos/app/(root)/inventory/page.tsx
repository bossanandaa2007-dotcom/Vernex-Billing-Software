import { PageHeading } from '@/components/dashboard/page-heading';
import { InventoryLedger } from '@/components/inventory/InventoryLedger';
import { getCurrentUserContext } from '@/lib/auth';
import type { Metadata } from 'next';
import { createServerClient } from '@/src/lib/supabase/server';

export const metadata: Metadata = { title: 'Inventory Ledger' };
export const dynamic = 'force-dynamic';
export default async function InventoryPage() {
  let movements: any[] = [];
  let products: any[] = [];
  try {
    const ctx = await getCurrentUserContext();
    const supabase = await createServerClient();
    const [movementResult, productResult] = await Promise.all([
      supabase.from('InventoryMovement').select('*').eq('businessId', ctx.businessId).order('createdAt', { ascending: false }).limit(200),
      supabase.from('ProductStock').select('*, Product!inner(id)').eq('businessId', ctx.businessId).order('name'),
    ]);
    movements = movementResult.data ?? [];
    products = productResult.data ?? [];
  } catch {
    // The ledger component renders its existing empty state while the database recovers.
  }
  return <div className="w-full"><PageHeading title="Inventory Ledger" description="Review stock changes and make manual adjustments." /><InventoryLedger movements={movements} products={products} /></div>;
}
