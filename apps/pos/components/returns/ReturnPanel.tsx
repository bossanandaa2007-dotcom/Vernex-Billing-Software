'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import axios from 'axios';
import { useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { useSubscriptionStatus } from '@/components/subscription/useSubscriptionStatus';
import { Loader2 } from 'lucide-react';
import { userFacingError } from '@/lib/user-facing-error';

type Item = { id: string; productName: string; quantity: number; lineTotal: number };
type PreviousReturn = { items: Array<{ onSaleProductId: string; quantity: number }> };
export function ReturnPanel({ transactionId, items, returns, onComplete }: { transactionId: string; items: Item[]; returns: PreviousReturn[]; onComplete: () => void }) {
  const { isBlocked, expiredMessage } = useSubscriptionStatus();
  const returned = useMemo(() => { const map: Record<string, number> = {}; returns.forEach((value) => value.items.forEach((item) => map[item.onSaleProductId] = (map[item.onSaleProductId] ?? 0) + item.quantity)); return map; }, [returns]);
  const [quantities, setQuantities] = useState<Record<string, number>>({}); const [method, setMethod] = useState('CASH'); const [reason, setReason] = useState('Customer return'); const [processing, setProcessing] = useState(false);
  const submit = async () => { if (isBlocked) return toast.error(expiredMessage); const selected = items.map((item) => ({ saleLineId: item.id, quantity: quantities[item.id] ?? 0 })).filter((item) => item.quantity > 0); if (!selected.length) return toast.error('Select at least one item to return.'); setProcessing(true); try { await axios.post('/api/returns', { transactionId, refundMethod: method, reason, items: selected }); toast.success('Return processed successfully. Stock has been updated.'); onComplete(); } catch (error) { toast.error(userFacingError(axios.isAxiosError(error) ? error.response?.data : error, 'Unable to process the return. Please try again.')); } finally { setProcessing(false); } };
  return <Card><CardHeader><CardTitle>Return / Refund</CardTitle></CardHeader><CardContent className="space-y-4">
    {items.map((item) => { const available = item.quantity - (returned[item.id] ?? 0); return <div key={item.id} className="grid items-end gap-3 sm:grid-cols-[1fr_120px]"><div><b>{item.productName}</b><div className="text-xs text-vernex-muted">Sold {item.quantity}, available to return {available}</div></div><div><Label>Quantity</Label><Input type="number" min="0" max={available} value={quantities[item.id] ?? 0} disabled={!available || isBlocked} onChange={(e) => setQuantities((current) => ({ ...current, [item.id]: Number(e.target.value) }))} /></div></div>; })}
    <div className="grid gap-3 sm:grid-cols-2"><div><Label>Refund Method</Label><select className="h-10 w-full rounded-md border bg-background px-3" value={method} disabled={isBlocked} onChange={(e) => setMethod(e.target.value)}>{['CASH','UPI','CARD','CREDIT','ONLINE'].map((item) => <option key={item}>{item}</option>)}</select></div><div><Label>Reason</Label><Input value={reason} disabled={isBlocked} onChange={(e) => setReason(e.target.value)} /></div></div>
    <Button onClick={submit} disabled={isBlocked || processing}>{processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{processing ? 'Processing...' : 'Process Return'}</Button>
  </CardContent></Card>;
}
