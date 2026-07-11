import { formatMoney } from '@/lib/currency';
import { ReceiptItem, ReceiptSale, ReceiptShop } from '@/lib/receipt';
import Image from 'next/image';
import { forwardRef } from 'react';

export const PrintableReceipt = forwardRef<HTMLDivElement, { sale: ReceiptSale; items: ReceiptItem[]; shop: ReceiptShop }>(
  ({ sale, items, shop }, ref) => {
    const currency = shop.currency ?? 'INR';
    const taxLabel = shop.taxMode === 'NONE' ? 'Tax' : shop.taxMode?.replace('_', ' ') ?? 'Tax';
    const date = new Date(sale.completedAt ?? sale.createdAt);
    const showCustomer = shop.showCustomerDetails !== false;
    const logoSrc = shop.receiptLogo || '/assets/vernex-logo.png';
    return <div ref={ref} className="receipt-print mx-auto w-full max-w-[80mm] bg-white p-4 font-mono text-[12px] leading-5 text-black">
      <div className="text-center">
        {shop.showBusinessLogo !== false && <Image src={logoSrc} alt="Receipt logo" width={52} height={52} unoptimized={logoSrc.startsWith('data:')} className="mx-auto mb-1 h-12 w-12 object-contain" />}
        <div className="text-lg font-bold">VERNEX</div>
        {shop.name && shop.name !== 'Vernex' && <div className="font-bold">{shop.name}</div>}
        {shop.address && <div>{shop.address}</div>}
        {shop.phone && <div>Phone: {shop.phone}</div>}
        {shop.showTaxId !== false && shop.taxId && <div>{shop.country === 'India' ? 'GSTIN' : 'Tax ID'}: {shop.taxId}</div>}
      </div>
      <div className="my-3 border-y border-dashed border-black py-2">
        <div>Bill: <strong>{sale.billNumber || sale.id}</strong></div><div>Date: {date.toLocaleString()}</div>
        {showCustomer && sale.customerName && <div>Customer: {sale.customerName}</div>}
        {showCustomer && sale.customerPhone && <div>Phone: {sale.customerPhone}</div>}
        {showCustomer && sale.customerEmail && <div>Email: {sale.customerEmail}</div>}
        {showCustomer && sale.customerAddress && <div>Address: {sale.customerAddress}</div>}
        {showCustomer && sale.customerTaxId && <div>{shop.country === 'India' ? 'GSTIN' : 'Tax ID'}: {sale.customerTaxId}</div>}
      </div>
      <div className="space-y-2">{items.map((item) => <div key={item.id}>
        <div className="font-bold">{item.productName}</div>
        <div className="flex justify-between"><span>{item.quantity} x {formatMoney(item.unitPrice, currency)}{shop.showItemTax !== false && item.taxRate ? ` @ ${item.taxRate}%` : ''}</span><span>{formatMoney(item.lineTotal, currency)}</span></div>
      </div>)}</div>
      <div className="my-3 border-y border-dashed border-black py-2">
        <Row label="Subtotal" value={formatMoney(sale.subtotal, currency)} />
        <Row label={taxLabel} value={formatMoney(sale.taxAmount, currency)} /><Row label="Grand Total" value={formatMoney(sale.totalAmount, currency)} bold />
        <Row label="Payment" value={`${sale.paymentMethod ?? '-'} / ${sale.paymentStatus}`} />
      </div>
      <div className="text-center">{shop.showFooter !== false && <div>{shop.receiptFooter || 'Thank you for your business!'}</div>}<div className="mt-2 text-[10px]">Powered by Vernex</div></div>
    </div>;
  }
);
PrintableReceipt.displayName = 'PrintableReceipt';

function Row({ label, value, bold = false }: { label: string; value: string; bold?: boolean }) {
  return <div className={`flex justify-between ${bold ? 'text-sm font-bold' : ''}`}><span>{label}</span><span>{value}</span></div>;
}
