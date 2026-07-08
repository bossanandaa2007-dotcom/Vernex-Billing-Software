'use client';

import { PrintableReceipt } from '@/components/receipt/PrintableReceipt';
import { ReceiptActions } from '@/components/receipt/ReceiptActions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ReceiptItem, ReceiptSale, ReceiptShop } from '@/lib/receipt';
import axios from 'axios';
import { useSearchParams } from 'next/navigation';
import { use, useEffect, useRef, useState } from 'react';
import { useReactToPrint } from 'react-to-print';
import { ReturnPanel } from '@/components/returns/ReturnPanel';
import { useBusinessAccess } from '@/hooks/use-business-access';

export default function DetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [sale, setSale] = useState<ReceiptSale | null>(null);
  const [items, setItems] = useState<ReceiptItem[]>([]);
  const [shop, setShop] = useState<ReceiptShop>({});
  const [returns, setReturns] = useState<Array<{ items: Array<{ onSaleProductId: string; quantity: number }> }>>([]);
  const { hasModuleAccess } = useBusinessAccess();
  const receiptRef = useRef<HTMLDivElement>(null);
  const autoPrinted = useRef(false);
  const searchParams = useSearchParams();
  const print = useReactToPrint({ content: () => receiptRef.current, documentTitle: sale?.billNumber ?? id });

  const load = () => {
    Promise.all([axios.get(`/api/transactions/${id}`), axios.get('/api/shopdata')])
      .then(([saleResponse, shopResponse]) => {
        setSale(saleResponse.data.transaction);
        setItems(saleResponse.data.items);
        setReturns(saleResponse.data.transaction.returns ?? []);
        setShop(shopResponse.data.data ?? {});
      })
      .catch(() => setSale(null));
  };

  useEffect(() => {
    load();
    // load is scoped to this transaction route.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (sale && searchParams.get('print') === '1' && !autoPrinted.current) {
      autoPrinted.current = true;
      const timer = setTimeout(print, 300);
      return () => clearTimeout(timer);
    }
  }, [sale, searchParams, print]);

  if (!sale) return <div className="py-16 text-center text-vernex-muted">Sale not found.</div>;

  return <div className="w-full space-y-6"><Card className="w-full">
    <CardHeader className="flex-row items-center justify-between"><CardTitle>{sale.billNumber || sale.id}</CardTitle><ReceiptActions receiptRef={receiptRef} label="Reprint Receipt" /></CardHeader>
    <CardContent><div className="rounded-lg bg-slate-100 p-3"><PrintableReceipt ref={receiptRef} sale={sale} items={items} shop={shop} /></div></CardContent>
  </Card>{hasModuleAccess('returns_refunds') && <ReturnPanel transactionId={sale.id} items={items} returns={returns} onComplete={load} />}</div>;
}
