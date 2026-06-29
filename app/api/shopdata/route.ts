export const dynamic = 'force-dynamic';

import { db } from '@/lib/db';
import { TaxMode } from '@prisma/client';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { formatBillNumber } from '@/lib/bill-number';
import { authErrorResponse, requireAuth, requirePermission } from '@/lib/auth';
import { writeAuditLog } from '@/lib/audit';
import { requireActiveSubscription } from '@/lib/subscription';

const settingsSchema = z
  .object({
    storeName: z.string().trim().min(2).optional(),
    tax: z.number().min(0).max(100).optional(),
    country: z.string().trim().min(2).optional(),
    currency: z.enum(['INR', 'USD', 'EUR', 'GBP', 'AED']).optional(),
    taxMode: z.nativeEnum(TaxMode).optional(),
    phone: z.string().trim().max(30).optional(),
    address: z.string().trim().max(500).optional(),
    taxId: z.string().trim().max(40).optional(),
    receiptFooter: z.string().trim().max(250).optional(),
    billPrefix: z.string().trim().min(1).max(12).regex(/^[A-Za-z0-9-]+$/).optional(),
    billPadding: z.number().int().min(1).max(10).optional(),
    billNextNumber: z.number().int().positive().optional(),
    showBusinessLogo: z.boolean().optional(),
    showTaxId: z.boolean().optional(),
    showCustomerDetails: z.boolean().optional(),
    showItemTax: z.boolean().optional(),
    showFooter: z.boolean().optional(),
    receiptSize: z.literal('80mm').optional(),
  })
  .refine((value) => Object.values(value).some((item) => item !== undefined), 'No settings supplied.');

const shopCache = new Map<string, { expires: number; data: unknown }>();
const SHOP_CACHE_MS = 30_000;

export async function GET(request: Request) {
  try {
    const ctx = await requireAuth(request);
    const cached = shopCache.get(ctx.businessId);
    if (cached && cached.expires > Date.now()) return NextResponse.json(cached.data);
    const [stored, sequence] = await Promise.all([db.shopData.findFirst({ where: { businessId: ctx.businessId } }), db.billSequence.findUnique({ where: { id: 'main' } })]);
    const data = stored ?? {
      id: null,
      name: 'Vernex Demo Shop',
      tax: 0,
      country: 'India',
      currency: 'INR',
      taxMode: TaxMode.GST,
      phone: null,
      address: null,
      taxId: null,
      receiptFooter: 'Thank you for your business!',
      billPrefix: 'VNX', billPadding: 6, showBusinessLogo: true, showTaxId: true,
      showCustomerDetails: true, showItemTax: true, showFooter: true, receiptSize: '80mm',
    };
    const response = { data: { ...data, billNextNumber: sequence?.nextNumber ?? 1 } };
    shopCache.set(ctx.businessId, { expires: Date.now() + SHOP_CACHE_MS, data: response });
    return NextResponse.json(response);
  } catch (error) {
    const response = authErrorResponse(error);
    if (response) return response;
    return NextResponse.json({ error: 'Failed to fetch business settings.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  let ctx;
  try { ctx = await requirePermission(request, 'SETTINGS_WRITE'); } catch (error) { const response = authErrorResponse(error); if (response) return response; throw error; }
  try { await requireActiveSubscription(ctx); } catch (error) { const response = authErrorResponse(error); if (response) return response; throw error; }
  const parsed = settingsSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await db.shopData.findFirst({ where: { businessId: ctx.businessId } });
  const values = parsed.data;
  const { billNextNumber, ...shopValues } = values;
  const data = {
    ...(shopValues.storeName !== undefined ? { name: shopValues.storeName } : {}),
    ...(values.tax !== undefined ? { tax: values.tax } : {}),
    ...(values.country !== undefined ? { country: values.country } : {}),
    ...(values.currency !== undefined ? { currency: values.currency } : {}),
    ...(values.taxMode !== undefined ? { taxMode: values.taxMode } : {}),
    ...(values.phone !== undefined ? { phone: values.phone || null } : {}),
    ...(values.address !== undefined ? { address: values.address || null } : {}),
    ...(values.taxId !== undefined ? { taxId: values.taxId || null } : {}),
    ...(values.receiptFooter !== undefined ? { receiptFooter: values.receiptFooter || 'Thank you for your business!' } : {}),
    ...(values.billPrefix !== undefined ? { billPrefix: values.billPrefix.toUpperCase() } : {}),
    ...(values.billPadding !== undefined ? { billPadding: values.billPadding } : {}),
    ...(values.showBusinessLogo !== undefined ? { showBusinessLogo: values.showBusinessLogo } : {}),
    ...(values.showTaxId !== undefined ? { showTaxId: values.showTaxId } : {}),
    ...(values.showCustomerDetails !== undefined ? { showCustomerDetails: values.showCustomerDetails } : {}),
    ...(values.showItemTax !== undefined ? { showItemTax: values.showItemTax } : {}),
    ...(values.showFooter !== undefined ? { showFooter: values.showFooter } : {}),
    ...(values.receiptSize !== undefined ? { receiptSize: values.receiptSize } : {}),
  };

  if (billNextNumber !== undefined || values.billPrefix !== undefined || values.billPadding !== undefined) {
    const currentSequence = await db.billSequence.findUnique({ where: { id: 'main' } });
    const candidate = formatBillNumber(billNextNumber ?? currentSequence?.nextNumber ?? 1, values.billPrefix ?? existing?.billPrefix ?? 'VNX', values.billPadding ?? existing?.billPadding ?? 6);
    if (await db.transaction.findUnique({ where: { billNumber: candidate } })) {
      return NextResponse.json({ error: `Bill number ${candidate} already exists. Choose a different next number or prefix.` }, { status: 409 });
    }
  }

  const saved = existing
    ? await db.shopData.update({ where: { id: existing.id }, data })
    : await db.shopData.create({
        data: {
          name: values.storeName ?? 'Vernex Demo Shop',
          tax: values.tax ?? 0,
          country: values.country ?? 'India',
          currency: values.currency ?? 'INR',
          taxMode: values.taxMode ?? TaxMode.GST,
          phone: values.phone || null,
          address: values.address || null,
          taxId: values.taxId || null,
          receiptFooter: values.receiptFooter || 'Thank you for your business!',
          businessId: ctx.businessId,
        },
      });

  if (billNextNumber !== undefined) {
    await db.billSequence.upsert({ where: { id: 'main' }, create: { id: 'main', businessId: ctx.businessId, nextNumber: billNextNumber }, update: { nextNumber: billNextNumber, businessId: ctx.businessId } });
  }
  shopCache.delete(ctx.businessId);

  await writeAuditLog(ctx, { action: 'SETTINGS_UPDATED', entityType: 'ShopData', entityId: saved.id, description: 'Updated business/settings data', metadata: Object.keys(values) });
  if (values.billPrefix !== undefined || values.billPadding !== undefined || billNextNumber !== undefined) {
    await writeAuditLog(ctx, { action: 'BILL_SETTINGS_UPDATED', entityType: 'BillSequence', entityId: 'main', description: 'Updated bill number settings' });
  }
  if (values.showBusinessLogo !== undefined || values.showTaxId !== undefined || values.showCustomerDetails !== undefined || values.showItemTax !== undefined || values.showFooter !== undefined || values.receiptSize !== undefined) {
    await writeAuditLog(ctx, { action: 'RECEIPT_SETTINGS_UPDATED', entityType: 'ShopData', entityId: saved.id, description: 'Updated receipt settings' });
  }

  return NextResponse.json({ data: { ...saved, billNextNumber: billNextNumber ?? (await db.billSequence.findUnique({ where: { id: 'main' } }))?.nextNumber ?? 1 } });
}
