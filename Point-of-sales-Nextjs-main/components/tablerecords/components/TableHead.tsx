import { TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function TableHeadRecords() {
  return (
    <TableHeader><TableRow>
      <TableHead>Bill</TableHead><TableHead>Customer</TableHead><TableHead>Date</TableHead><TableHead>Items</TableHead>
      <TableHead>Subtotal</TableHead><TableHead>Tax</TableHead><TableHead>Discount</TableHead>
      <TableHead>Grand Total</TableHead><TableHead>Payment</TableHead><TableHead>Status</TableHead><TableHead />
    </TableRow></TableHeader>
  );
}
