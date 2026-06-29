'use client';

import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import { RefObject } from 'react';
import { useReactToPrint } from 'react-to-print';

export function ReceiptActions({ receiptRef, label = 'Print Receipt' }: { receiptRef: RefObject<HTMLDivElement>; label?: string }) {
  const print = useReactToPrint({ content: () => receiptRef.current, documentTitle: 'Vernex Receipt' });
  return <Button onClick={print}><Printer className="mr-2 h-4 w-4" />{label}</Button>;
}
