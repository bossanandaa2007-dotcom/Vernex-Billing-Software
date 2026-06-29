export type ReceiptSale = {
  id: string;
  billNumber: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  customerEmail?: string | null;
  customerAddress?: string | null;
  customerTaxId?: string | null;
  subtotal: string | number;
  discount: string | number;
  taxAmount: string | number;
  totalAmount: string | number | null;
  amountReceived: string | number;
  changeAmount: string | number;
  paymentMethod: string | null;
  paymentStatus: string;
  completedAt: string | Date | null;
  createdAt: string | Date;
};

export type ReceiptItem = {
  id: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  lineTotal: number;
};

export type ReceiptShop = {
  name?: string | null;
  phone?: string | null;
  address?: string | null;
  taxId?: string | null;
  receiptFooter?: string | null;
  country?: string;
  currency?: string;
  taxMode?: string;
  showBusinessLogo?: boolean;
  showTaxId?: boolean;
  showCustomerDetails?: boolean;
  showItemTax?: boolean;
  showFooter?: boolean;
  receiptSize?: string;
};
