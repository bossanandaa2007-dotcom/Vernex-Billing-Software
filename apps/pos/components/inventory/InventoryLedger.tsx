'use client';

import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSubscriptionStatus } from '@/components/subscription/useSubscriptionStatus';
import { History, Loader2, SlidersHorizontal } from 'lucide-react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'react-toastify';

type Movement = {
  id: string;
  productNameSnapshot: string;
  movementType: string;
  quantityChange: number;
  previousStock: number;
  newStock: number;
  referenceBillNumber: string | null;
  reason: string | null;
  createdAt: Date;
};

type Product = { id: string; name: string; stock: number };

export function InventoryLedger({ movements, products }: { movements: Movement[]; products: Product[] }) {
  const { isBlocked, expiredMessage } = useSubscriptionStatus();
  const [productId, setProductId] = useState(products[0]?.id ?? '');
  const [newStock, setNewStock] = useState('');
  const [reason, setReason] = useState('Physical stock correction');
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  const adjust = async () => {
    if (isBlocked) return toast.error(expiredMessage);
    if (!productId || newStock === '' || Number(newStock) < 0 || !reason.trim()) {
      return toast.error('Please select a product and enter valid stock details.');
    }
    setSaving(true);
    try {
      await axios.post('/api/inventory-ledger', { productId, newStock: Number(newStock), reason });
      toast.success('Stock updated successfully.');
      setNewStock('');
      router.refresh();
    } catch {
      toast.error('Unable to update stock. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <Card className="border-vernex-border/80 shadow-sm">
        <CardHeader className="border-b border-vernex-border dark:border-[#1E335F]">
          <CardTitle className="flex items-center gap-2 text-base">
            <SlidersHorizontal className="h-5 w-5 text-vernex-gold" />
            Adjust Stock
          </CardTitle>
          <p className="text-sm text-vernex-muted dark:text-slate-300">
            Set the current quantity after a physical stock count.
          </p>
        </CardHeader>
        <CardContent className="grid items-end gap-4 p-5 md:grid-cols-2 xl:grid-cols-[1.2fr_0.7fr_1.4fr_auto]">
          <div className="space-y-2">
            <Label htmlFor="inventory-product">Product</Label>
            <select
              id="inventory-product"
              className="h-10 w-full rounded-md border border-vernex-border bg-white px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vernex-gold dark:border-[#1E335F] dark:bg-vernex-dark"
              value={productId}
              onChange={(event) => setProductId(event.target.value)}
              disabled={isBlocked || saving || !products.length}
            >
              {products.map((item) => <option key={item.id} value={item.id}>{item.name} - Current: {item.stock}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="inventory-stock">New Quantity</Label>
            <Input id="inventory-stock" type="number" min="0" value={newStock} onChange={(event) => setNewStock(event.target.value)} disabled={isBlocked || saving} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="inventory-reason">Reason</Label>
            <Input id="inventory-reason" value={reason} onChange={(event) => setReason(event.target.value)} disabled={isBlocked || saving} />
          </div>
          <Button className="h-10 min-w-36" onClick={adjust} disabled={isBlocked || saving || !products.length}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {saving ? 'Updating...' : 'Adjust Stock'}
          </Button>
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-vernex-border/80 shadow-sm">
        <CardHeader className="border-b border-vernex-border dark:border-[#1E335F]">
          <CardTitle className="flex items-center gap-2 text-base">
            <History className="h-5 w-5 text-vernex-gold" />
            Inventory History
          </CardTitle>
          <p className="text-sm text-vernex-muted dark:text-slate-300">Sales, returns, restocks, and manual adjustments.</p>
        </CardHeader>
        <CardContent className="p-0">
          {movements.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[840px] text-sm">
                <thead className="bg-vernex-surface text-left text-xs uppercase text-vernex-muted dark:bg-vernex-dark dark:text-slate-300">
                  <tr><th className="px-4 py-3">Date</th><th>Product</th><th>Type</th><th>Change</th><th>Previous</th><th>Current</th><th>Reference</th><th>Reason</th></tr>
                </thead>
                <tbody>
                  {movements.map((item) => (
                    <tr key={item.id} className="border-t border-vernex-border hover:bg-vernex-surface/60 dark:border-[#1E335F] dark:hover:bg-vernex-dark/60">
                      <td className="whitespace-nowrap px-4 py-3">{new Date(item.createdAt).toLocaleString()}</td>
                      <td className="font-semibold text-vernex-navy dark:text-white">{item.productNameSnapshot}</td>
                      <td>{item.movementType}</td>
                      <td className={item.quantityChange >= 0 ? 'text-emerald-600' : 'text-red-600'}>{item.quantityChange > 0 ? '+' : ''}{item.quantityChange}</td>
                      <td>{item.previousStock}</td><td>{item.newStock}</td><td>{item.referenceBillNumber ?? '-'}</td><td>{item.reason ?? '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              icon={<History className="h-7 w-7" />}
              title="No inventory movements yet"
              description="Stock adjustments, sales, returns, and restocks will appear here."
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
