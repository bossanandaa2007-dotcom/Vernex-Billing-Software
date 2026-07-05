'use client';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ReceiptItem, ReceiptSale, ReceiptShop } from '@/lib/receipt';
import { useRef } from 'react';
import { PrintableReceipt } from './PrintableReceipt';
import { ReceiptActions } from './ReceiptActions';

export function ReceiptPreview({ open, onOpenChange, sale, items, shop }: { open: boolean; onOpenChange: (open: boolean) => void; sale: ReceiptSale | null; items: ReceiptItem[]; shop: ReceiptShop }) {
  const receiptRef = useRef<HTMLDivElement>(null);
  if (!sale) return null;
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
      <DialogHeader><DialogTitle>Receipt Preview - {sale.billNumber || sale.id}</DialogTitle><DialogDescription>Sale completed successfully.</DialogDescription></DialogHeader>
      <div className="rounded-lg border bg-slate-100 p-3"><PrintableReceipt ref={receiptRef} sale={sale} items={items} shop={shop} /></div>
      <div className="flex justify-end"><ReceiptActions receiptRef={receiptRef} /></div>
    </DialogContent>
  </Dialog>;
}
