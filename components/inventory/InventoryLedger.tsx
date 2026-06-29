'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'react-toastify';
import { useSubscriptionStatus } from '@/components/subscription/useSubscriptionStatus';

type Movement = { id: string; productNameSnapshot: string; movementType: string; quantityChange: number; previousStock: number; newStock: number; referenceBillNumber: string | null; reason: string | null; createdAt: Date };
type Product = { id: string; name: string; stock: number };
export function InventoryLedger({ movements, products }: { movements: Movement[]; products: Product[] }) {
  const { isBlocked, expiredMessage } = useSubscriptionStatus();
  const [productId, setProductId] = useState(products[0]?.id ?? ''); const [newStock, setNewStock] = useState(''); const [reason, setReason] = useState('Physical stock correction'); const router = useRouter();
  const adjust = async () => { if (isBlocked) return toast.error(expiredMessage); try { await axios.post('/api/inventory-ledger', { productId, newStock: Number(newStock), reason }); toast.success('Stock adjusted and recorded.'); setNewStock(''); router.refresh(); } catch { toast.error('Enter a non-negative stock and a reason.'); } };
  return <div className="space-y-6"><Card><CardHeader><CardTitle>Manual Adjustment</CardTitle></CardHeader><CardContent className="grid items-end gap-3 md:grid-cols-4"><div><Label>Product</Label><select className="h-10 w-full rounded-md border bg-background px-3" value={productId} onChange={(e) => setProductId(e.target.value)} disabled={isBlocked}>{products.map((item) => <option key={item.id} value={item.id}>{item.name} (current {item.stock})</option>)}</select></div><div><Label>New Stock</Label><Input type="number" min="0" value={newStock} onChange={(e) => setNewStock(e.target.value)} disabled={isBlocked} /></div><div><Label>Reason</Label><Input value={reason} onChange={(e) => setReason(e.target.value)} disabled={isBlocked} /></div><Button onClick={adjust} disabled={isBlocked}>Save Adjustment</Button></CardContent></Card>
  <Card><CardHeader><CardTitle>Stock Movements</CardTitle></CardHeader><CardContent className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left"><th className="p-2">Date</th><th>Product</th><th>Type</th><th>Change</th><th>Previous</th><th>New</th><th>Reference</th><th>Reason</th></tr></thead><tbody>{movements.map((item) => <tr key={item.id} className="border-b"><td className="p-2">{new Date(item.createdAt).toLocaleString()}</td><td>{item.productNameSnapshot}</td><td>{item.movementType}</td><td>{item.quantityChange > 0 ? '+' : ''}{item.quantityChange}</td><td>{item.previousStock}</td><td>{item.newStock}</td><td>{item.referenceBillNumber ?? '-'}</td><td>{item.reason ?? '-'}</td></tr>)}</tbody></table>{!movements.length && <div className="py-10 text-center text-vernex-muted">No movements recorded yet.</div>}</CardContent></Card></div>;
}
