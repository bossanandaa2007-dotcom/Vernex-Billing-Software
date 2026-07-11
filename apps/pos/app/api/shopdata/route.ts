export const dynamic = 'force-dynamic';

import { TaxMode } from '@/src/types/domain';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { formatBillNumber } from '@/lib/bill-number';
import { authErrorResponse, requireAuth, requirePermission } from '@/lib/auth';
import { writeAuditLog } from '@/lib/audit';
import { requireActiveSubscription } from '@/lib/subscription';
import { clearBusinessShopDataCache, getBusinessShopData } from '@/lib/shop-data';
import { createServerClient } from '@/src/lib/supabase/server';

const MAX_LOGO_BYTES = 120 * 1024;
const MAX_LOGO_DIMENSION = 512;
const imageDimensions = (mime: string, buffer: Buffer) => {
  if (mime === 'png' && buffer.length >= 24) {
    return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
  }
  if (mime === 'jpeg') {
    let offset = 2;
    while (offset < buffer.length) {
      if (buffer[offset] !== 0xff) break;
      const marker = buffer[offset + 1];
      const length = buffer.readUInt16BE(offset + 2);
      if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
        return { width: buffer.readUInt16BE(offset + 7), height: buffer.readUInt16BE(offset + 5) };
      }
      offset += 2 + length;
    }
  }
  if (mime === 'webp' && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') {
    const type = buffer.toString('ascii', 12, 16);
    if (type === 'VP8X' && buffer.length >= 30) {
      return { width: 1 + buffer.readUIntLE(24, 3), height: 1 + buffer.readUIntLE(27, 3) };
    }
    if (type === 'VP8 ' && buffer.length >= 30) {
      return { width: buffer.readUInt16LE(26) & 0x3fff, height: buffer.readUInt16LE(28) & 0x3fff };
    }
    if (type === 'VP8L' && buffer.length >= 25) {
      const bits = buffer.readUInt32LE(21);
      return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
    }
  }
  return null;
};
const receiptLogoSchema = z
  .string()
  .trim()
  .superRefine((value, ctx) => {
    if (!value) return true;
    const match = value.match(/^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/);
    if (!match) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Logo must be a PNG, JPG, or WebP image.' });
      return false;
    }
    const [, mime, base64] = match;
    const buffer = Buffer.from(base64, 'base64');
    if (buffer.length > MAX_LOGO_BYTES) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Logo must be 120KB or smaller.' });
      return false;
    }
    const dimensions = imageDimensions(mime, buffer);
    if (!dimensions || dimensions.width > MAX_LOGO_DIMENSION || dimensions.height > MAX_LOGO_DIMENSION) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Logo dimensions must be 512 x 512 px or smaller.' });
      return false;
    }
    return true;
  })
  .refine((value) => {
    if (!value) return true;
    const base64 = value.split(',')[1] ?? '';
    return Math.ceil((base64.length * 3) / 4) <= MAX_LOGO_BYTES;
  }, 'Logo must be 120KB or smaller.');

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
    receiptLogo: receiptLogoSchema.optional(),
  })
  .refine((value) => Object.values(value).some((item) => item !== undefined), 'No settings supplied.');

export async function GET(request: Request) {
  try {
    const ctx = await requireAuth(request);
    return NextResponse.json(await getBusinessShopData(ctx.businessId, request));
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

  const supabase = await createServerClient(request);
  const { data: existing } = await supabase.from('ShopData').select('*').eq('businessId', ctx.businessId).maybeSingle();
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
    ...(values.receiptLogo !== undefined ? { receiptLogo: values.receiptLogo || null } : {}),
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
    const { data: currentSequence } = await supabase.from('BillSequence').select('*').eq('id', ctx.businessId).maybeSingle();
    const candidate = formatBillNumber(billNextNumber ?? currentSequence?.nextNumber ?? 1, values.billPrefix ?? existing?.billPrefix ?? 'VNX', values.billPadding ?? existing?.billPadding ?? 6);
    const { data: duplicate } = await supabase.from('Transaction').select('id').eq('billNumber', candidate).maybeSingle();
    if (duplicate) {
      return NextResponse.json({ error: `Bill number ${candidate} already exists. Choose a different next number or prefix.` }, { status: 409 });
    }
  }

  const saveResult = existing
    ? await supabase.from('ShopData').update(data).eq('id', existing.id).select('*').single()
    : await supabase.from('ShopData').insert({
          name: values.storeName ?? 'Vernex',
          tax: values.tax ?? 0,
          country: values.country ?? 'India',
          currency: values.currency ?? 'INR',
          taxMode: values.taxMode ?? TaxMode.GST,
          phone: values.phone || null,
          address: values.address || null,
          taxId: values.taxId || null,
          receiptFooter: values.receiptFooter || 'Thank you for your business!',
          receiptLogo: values.receiptLogo || null,
          businessId: ctx.businessId,
        }).select('*').single();
  if (saveResult.error) return NextResponse.json({ error: 'Unable to save business settings.' }, { status: 400 });
  const saved = saveResult.data;

  if (billNextNumber !== undefined) {
    await supabase.from('BillSequence').upsert({ id: ctx.businessId, businessId: ctx.businessId, nextNumber: billNextNumber });
  }
  clearBusinessShopDataCache(ctx.businessId);

  await writeAuditLog(ctx, { action: 'SETTINGS_UPDATED', entityType: 'ShopData', entityId: saved.id, description: 'Updated business/settings data', metadata: Object.keys(values) });
  if (values.billPrefix !== undefined || values.billPadding !== undefined || billNextNumber !== undefined) {
    await writeAuditLog(ctx, { action: 'BILL_SETTINGS_UPDATED', entityType: 'BillSequence', entityId: ctx.businessId, description: 'Updated bill number settings' });
  }
  if (values.showBusinessLogo !== undefined || values.showTaxId !== undefined || values.showCustomerDetails !== undefined || values.showItemTax !== undefined || values.showFooter !== undefined || values.receiptSize !== undefined || values.receiptLogo !== undefined) {
    await writeAuditLog(ctx, { action: 'RECEIPT_SETTINGS_UPDATED', entityType: 'ShopData', entityId: saved.id, description: 'Updated receipt settings' });
  }

  const { data: finalSequence } = await supabase.from('BillSequence').select('nextNumber').eq('id', ctx.businessId).maybeSingle();
  return NextResponse.json({ data: { ...saved, billNextNumber: billNextNumber ?? finalSequence?.nextNumber ?? 1 } });
}
