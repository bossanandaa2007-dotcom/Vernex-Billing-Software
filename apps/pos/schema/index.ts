import * as z from 'zod';

import { CatProduct } from '@/src/types/domain';

const categoryValidator = (val: string): val is CatProduct =>
  Object.values(CatProduct).includes(val as CatProduct);

export const productSchema = z
  .object({
    productName: z
      .string()
      .min(2, 'Product name must be at least 2 characters')
      .min(1, 'Product name cannot be empty'),
    buyPrice: z
      .number()
      .nonnegative('Buy price cannot be negative'),
    sellPrice: z
      .number()
      .nonnegative('Sell price cannot be negative'),
    stockProduct: z
      .number()
      .nonnegative('Stock cannot be negative'),
    category: z
      .string()
      .min(1, 'Category cannot be empty')
      .refine(categoryValidator, {
        message: 'Select category',
        params: {
          validValues: Object.values(CatProduct).join(', '),
        },
      }),
  });
export const onsaleSchema = z.object({
  productId: z.string().min(1, 'Select Product'),
  qTy: z.number().int('Qty must be a whole number').positive('Qty must be a positive number'),
  transactionId: z.string().min(1, 'Transaction Id is Empty'),
});
export const orderSchema = z.object({
  qTy: z.number().int('Qty must be a whole number').positive('Qty must be a positive number'),
});
export const taxSchema = z.object({
  tax: z.number().min(0, 'Tax min 0').max(100, 'Tax max 100'),
});
export const shopnameSchema = z.object({
  storeName: z
    .string()
    .min(1, 'Store Name is Empty')
    .min(2, 'Store Name min 2 characters'),
});
export const restockSchema = z.object({
  stock: z
    .number()
    .positive('stock must be a positive number')
    .min(1, 'stock min 1'),
});

export const checkoutSchema = z.object({
  discount: z.number().nonnegative().default(0),
  paymentMethod: z.enum(['CASH', 'UPI', 'CARD', 'CREDIT', 'ONLINE']),
  amountReceived: z.number().nonnegative(),
  customerName: z.string().trim().max(120).optional().or(z.literal('')),
  customerPhone: z.string().trim().max(30).regex(/^[+\d\s()-]*$/, 'Invalid phone number').optional().or(z.literal('')),
  customerEmail: z.string().trim().email('Invalid email').max(160).optional().or(z.literal('')),
  customerAddress: z.string().trim().max(500).optional().or(z.literal('')),
  customerTaxId: z.string().trim().max(40).optional().or(z.literal('')),
  customerId: z.string().trim().optional().or(z.literal('')),
});

export const regionalSettingsSchema = z.object({
  country: z.string().min(2),
  currency: z.enum(['INR', 'USD', 'EUR', 'GBP', 'AED']),
  taxMode: z.enum(['GST', 'VAT', 'SALES_TAX', 'TAX', 'NONE']),
});
