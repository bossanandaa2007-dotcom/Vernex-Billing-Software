'use client';

import { Badge } from '@/components/ui/badge';
import { TableBody, TableCell, TableRow } from '@/components/ui/table';
import { formatMoney } from '@/lib/currency';
import Dropdown from './btn/Dropdown';

type RecordRow = {
  id: string; billNumber: string; completedAt: Date; itemCount: number; subtotal: number; taxAmount: number;
  discount: number; totalAmount: number; paymentMethod: string | null; paymentStatus: string;
  customerName: string | null; returnStatus: string | null; refundedAmount: number;
};

export default function TableBodyRecords({ data, currency }: { data: RecordRow[]; currency: string }) {
  return <TableBody>{data.map((item) => (
    <TableRow key={item.id}>
      <TableCell className="font-medium">{item.billNumber}</TableCell>
      <TableCell>{item.customerName || 'Walk-in'}</TableCell>
      <TableCell>{new Date(item.completedAt).toLocaleString()}</TableCell>
      <TableCell>{item.itemCount}</TableCell>
      <TableCell>{formatMoney(item.subtotal, currency)}</TableCell>
      <TableCell>{formatMoney(item.taxAmount, currency)}</TableCell>
      <TableCell>{formatMoney(item.discount, currency)}</TableCell>
      <TableCell>{formatMoney(item.totalAmount, currency)}</TableCell>
      <TableCell>{item.paymentMethod ?? '—'}</TableCell>
      <TableCell><Badge variant="outline">{item.returnStatus ?? item.paymentStatus}</Badge></TableCell>
      <TableCell><Dropdown records={{ ...item, totalQuantity: item.itemCount, createdAt: item.completedAt, totalAmount: String(item.totalAmount), isComplete: true, products: [] }} /></TableCell>
    </TableRow>
  ))}</TableBody>;
}
