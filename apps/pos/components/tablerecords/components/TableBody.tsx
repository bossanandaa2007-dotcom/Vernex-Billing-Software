'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TableBody, TableCell, TableRow } from '@/components/ui/table';
import { formatMoney } from '@/lib/currency';
import { cn } from '@/lib/utils';
import { CalendarClock, CreditCard, Eye, Printer, ReceiptText, UserRound } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Dropdown from './btn/Dropdown';

type RecordRow = {
  id: string;
  billNumber: string;
  completedAt: Date;
  itemCount: number;
  subtotal: number;
  taxAmount: number;
  discount: number;
  totalAmount: number;
  paymentMethod: string | null;
  paymentStatus: string;
  customerName: string | null;
  returnStatus: string | null;
  refundedAmount: number;
};

export default function TableBodyRecords({ data, currency }: { data: RecordRow[]; currency: string }) {
  const router = useRouter();
  const openBill = (id: string, print = false) => router.push(`/records/${id}${print ? '?print=1' : ''}`);
  const recordPayload = (item: RecordRow) => ({
    ...item,
    totalQuantity: item.itemCount,
    createdAt: item.completedAt,
    totalAmount: String(item.totalAmount),
    isComplete: true,
    products: [],
  });
  const statusLabel = (item: RecordRow) => item.returnStatus ?? item.paymentStatus;
  const statusClass = (status: string) => {
    const normalized = status.toLowerCase();
    if (normalized.includes('paid')) return 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300';
    if (normalized.includes('partial')) return 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300';
    if (normalized.includes('return') || normalized.includes('refund')) return 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300';
    return 'border-vernex-border bg-white text-vernex-navy dark:border-[#1E335F] dark:bg-vernex-dark dark:text-white';
  };

  return (
    <TableBody>
      {data.map((item) => (
        <TableRow
          key={item.id}
          tabIndex={0}
          onClick={() => openBill(item.id)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') openBill(item.id);
          }}
          className="hidden cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vernex-gold md:table-row"
        >
          <TableCell>
            <div className="font-bold text-vernex-navy dark:text-white">{item.billNumber}</div>
            <div className="text-xs text-vernex-muted dark:text-slate-400">{item.id.slice(0, 8)}</div>
          </TableCell>
          <TableCell>{item.customerName || 'Walk-in'}</TableCell>
          <TableCell>{new Date(item.completedAt).toLocaleString()}</TableCell>
          <TableCell>
            <span className="rounded-full bg-vernex-surface px-2.5 py-1 text-xs font-bold dark:bg-vernex-dark">{item.itemCount}</span>
          </TableCell>
          <TableCell>{formatMoney(item.subtotal, currency)}</TableCell>
          <TableCell>{formatMoney(item.taxAmount, currency)}</TableCell>
          <TableCell>{formatMoney(item.discount, currency)}</TableCell>
          <TableCell className="font-black text-vernex-navy dark:text-vernex-gold">{formatMoney(item.totalAmount, currency)}</TableCell>
          <TableCell>{item.paymentMethod ?? '-'}</TableCell>
          <TableCell><Badge variant="outline" className={cn('rounded-full', statusClass(statusLabel(item)))}>{statusLabel(item)}</Badge></TableCell>
          <TableCell onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-end gap-1">
              <Button size="icon" variant="ghost" title="View bill" onClick={() => openBill(item.id)}>
                <Eye className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" title="Print receipt" onClick={() => openBill(item.id, true)}>
                <Printer className="h-4 w-4" />
              </Button>
              <Dropdown records={recordPayload(item)} />
            </div>
          </TableCell>
        </TableRow>
      ))}
      <TableRow className="border-0 md:hidden">
        <TableCell colSpan={11} className="p-0">
          <div className="grid gap-3">
            {data.map((item) => (
              <div
                key={item.id}
                role="button"
                tabIndex={0}
                onClick={() => openBill(item.id)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') openBill(item.id);
                }}
                className="rounded-xl border border-vernex-border bg-white p-4 shadow-sm transition hover:border-emerald-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vernex-gold dark:border-[#1E335F] dark:bg-vernex-navy"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 font-black text-vernex-navy dark:text-white">
                      <ReceiptText className="h-4 w-4 text-emerald-600" />
                      {item.billNumber}
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-xs text-vernex-muted dark:text-slate-400">
                      <CalendarClock className="h-3.5 w-3.5" />
                      {new Date(item.completedAt).toLocaleString()}
                    </div>
                  </div>
                  <Badge variant="outline" className={cn('rounded-full', statusClass(statusLabel(item)))}>{statusLabel(item)}</Badge>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2 text-vernex-muted dark:text-slate-400">
                    <UserRound className="h-4 w-4" />
                    {item.customerName || 'Walk-in'}
                  </div>
                  <div className="flex items-center gap-2 text-vernex-muted dark:text-slate-400">
                    <CreditCard className="h-4 w-4" />
                    {item.paymentMethod ?? '-'}
                  </div>
                  <div>
                    <p className="text-xs text-vernex-muted dark:text-slate-400">Items</p>
                    <p className="font-bold text-vernex-navy dark:text-white">{item.itemCount}</p>
                  </div>
                  <div>
                    <p className="text-xs text-vernex-muted dark:text-slate-400">Grand total</p>
                    <p className="font-black text-vernex-navy dark:text-vernex-gold">{formatMoney(item.totalAmount, currency)}</p>
                  </div>
                </div>
                <div className="mt-4 flex gap-2" onClick={(event) => event.stopPropagation()}>
                  <Button className="flex-1" size="sm" onClick={() => openBill(item.id)}>
                    <Eye className="mr-2 h-4 w-4" /> View
                  </Button>
                  <Button className="flex-1" size="sm" variant="outline" onClick={() => openBill(item.id, true)}>
                    <Printer className="mr-2 h-4 w-4" /> Print
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </TableCell>
      </TableRow>
    </TableBody>
  );
}
