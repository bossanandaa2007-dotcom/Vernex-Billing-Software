import { PageHeading } from '@/components/dashboard/page-heading';
import { InventoryLedger } from '@/components/inventory/InventoryLedger';
import { db } from '@/lib/db';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Inventory Ledger' };
export const dynamic = 'force-dynamic';
export default async function InventoryPage() {
  const [movements, products] = await Promise.all([
    db.inventoryMovement.findMany({ orderBy: { createdAt: 'desc' }, take: 200 }),
    db.productStock.findMany({ where: { Product: { some: {} } }, orderBy: { name: 'asc' } }),
  ]);
  return <div className="w-full"><PageHeading title="Inventory Ledger" description="Audit every sale, restock, return, and manual stock adjustment." /><InventoryLedger movements={movements} products={products} /></div>;
}
