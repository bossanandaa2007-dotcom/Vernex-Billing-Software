import { PageHeading } from '@/components/dashboard/page-heading';
import { InventoryLedger } from '@/components/inventory/InventoryLedger';
import { db } from '@/lib/db';
import { getCurrentUserContext } from '@/lib/auth';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Inventory Ledger' };
export const dynamic = 'force-dynamic';
export default async function InventoryPage() {
  let movements: Awaited<ReturnType<typeof db.inventoryMovement.findMany>> = [];
  let products: Awaited<ReturnType<typeof db.productStock.findMany>> = [];
  try {
    const ctx = await getCurrentUserContext();
    [movements, products] = await Promise.all([
      db.inventoryMovement.findMany({ where: { businessId: ctx.businessId }, orderBy: { createdAt: 'desc' }, take: 200 }),
      db.productStock.findMany({ where: { businessId: ctx.businessId, Product: { some: {} } }, orderBy: { name: 'asc' } }),
    ]);
  } catch {
    // The ledger component renders its existing empty state while the database recovers.
  }
  return <div className="w-full"><PageHeading title="Inventory Ledger" description="Review stock changes and make manual adjustments." /><InventoryLedger movements={movements} products={products} /></div>;
}
