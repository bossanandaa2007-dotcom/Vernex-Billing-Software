import 'server-only';
import { randomUUID } from 'node:crypto';
import * as XLSX from 'xlsx';
import { PDFParse } from 'pdf-parse';
import { z } from 'zod';
import { createPrivilegedSupabase } from '@/lib/super-admin/supabase.server';
import { writeSuperAdminAudit } from '@/services/super-admin/admin-audit.server';

const MAX_FILE_SIZE = 15 * 1024 * 1024;
const DEFAULT_CATEGORY = 'Uncategorized';
const UNLIMITED_STOCK = 1_000_000;

export const menuImportItemSchema = z.object({
  id: z.string().optional(),
  productName: z.string().trim().max(160).default(''),
  category: z.string().trim().max(80).default(DEFAULT_CATEGORY),
  subcategory: z.string().trim().max(80).optional().or(z.literal('')),
  description: z.string().trim().max(500).optional().or(z.literal('')),
  price: z.coerce.number().nonnegative().optional().nullable(),
  discount: z.coerce.number().nonnegative().optional().nullable(),
  tax: z.coerce.number().nonnegative().optional().nullable(),
  gst: z.string().trim().max(40).optional().or(z.literal('')),
  hsn: z.string().trim().max(40).optional().or(z.literal('')),
  sku: z.string().trim().max(80).optional().or(z.literal('')),
  barcode: z.string().trim().max(80).optional().or(z.literal('')),
  variant: z.string().trim().max(100).optional().or(z.literal('')),
  size: z.string().trim().max(60).optional().or(z.literal('')),
  unit: z.string().trim().max(40).optional().or(z.literal('')),
  foodType: z.enum(['VEG', 'NON_VEG', 'EGG', 'UNKNOWN']).optional().default('UNKNOWN'),
  preparationTime: z.string().trim().max(40).optional().or(z.literal('')),
  availability: z.string().trim().max(80).optional().or(z.literal('')),
  tags: z.array(z.string().trim().max(40)).optional().default([]),
  confidence: z.coerce.number().min(0).max(1).optional().default(0.5),
  duplicateAction: z.enum(['skip', 'update', 'create', 'merge']).optional().default('create'),
  existingProductId: z.string().optional().nullable(),
});

export const menuImportConfirmSchema = z.object({
  fileName: z.string().trim().max(240),
  fileType: z.string().trim().max(120),
  rows: z.array(menuImportItemSchema).max(1000),
});

export type MenuImportItem = z.infer<typeof menuImportItemSchema> & {
  validationIssues?: string[];
  duplicate?: { type: 'exact' | 'similar'; productId: string; name: string; category: string; price: number | null };
};

type ExistingProduct = { id: string; name: string; cat: string; Product?: { sellprice: number | null }[] };

export function assertSupportedFile(file: File) {
  const name = file.name.toLowerCase();
  const allowed = ['.csv', '.xlsx', '.xls', '.pdf', '.png', '.jpg', '.jpeg', '.webp'];
  if (!allowed.some((ext) => name.endsWith(ext))) throw new Error('Upload a PDF, image, Excel, or CSV menu file.');
  if (file.size > MAX_FILE_SIZE) throw new Error('Menu file is too large. Upload a file under 15 MB.');
}

export async function extractMenuRows(file: File): Promise<{ strategy: string; rows: MenuImportItem[]; rawText: string }> {
  assertSupportedFile(file);
  const name = file.name.toLowerCase();
  const buffer = Buffer.from(await file.arrayBuffer());
  if (name.endsWith('.csv')) {
    const rawText = buffer.toString('utf8');
    return { strategy: 'CSV parser', rows: rowsFromObjects(parseCsv(rawText)), rawText };
  }
  if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const rows = workbook.SheetNames.flatMap((sheet) => XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[sheet], { defval: '' }));
    return { strategy: 'Excel parser', rows: rowsFromObjects(rows), rawText: JSON.stringify(rows).slice(0, 12000) };
  }
  if (name.endsWith('.pdf')) {
    const parser = new PDFParse({ data: buffer });
    const parsed = await parser.getText();
    const rawText = parsed.text.trim();
    if (rawText) return { strategy: 'PDF text extraction', rows: await rowsFromAiOrText(rawText), rawText };
    return { strategy: 'OCR/AI required', rows: await rowsFromAiOrText('', file), rawText: '' };
  }
  return { strategy: 'Vision AI extraction', rows: await rowsFromAiOrText('', file), rawText: '' };
}

export async function enrichRowsWithTenantContext(businessId: string, rows: MenuImportItem[]) {
  const supabase = createPrivilegedSupabase();
  const { data, error } = await supabase
    .from('ProductStock')
    .select('id,name,cat,Product(sellprice)')
    .eq('businessId', businessId)
    .limit(2000);
  if (error) throw error;
  const existing = (data ?? []) as ExistingProduct[];
  return rows.map((row) => addValidation(addDuplicate(row, existing)));
}

export async function importMenuRows(businessId: string, input: z.infer<typeof menuImportConfirmSchema>) {
  const started = Date.now();
  const supabase = createPrivilegedSupabase();
  const rows = (await enrichRowsWithTenantContext(businessId, input.rows))
    .filter((row) => row.duplicateAction !== 'skip')
    .filter((row) => !row.validationIssues?.length);
  const creates = rows.filter((row) => row.duplicateAction === 'create' || !row.existingProductId);
  const updates = rows.filter((row) => ['update', 'merge'].includes(row.duplicateAction ?? '') && row.existingProductId);

  const stockRows = creates.map((row) => ({
    id: `PRD-${randomUUID().slice(0, 8)}`,
    businessId,
    name: row.productName.trim(),
    stock: UNLIMITED_STOCK,
    price: 0,
    cat: row.category.trim() || DEFAULT_CATEGORY,
    imageProduct: null,
  }));
  const productRows = stockRows.map((stock, index) => ({ productId: stock.id, sellprice: creates[index].price ?? 0 }));
  const variantRows = stockRows.flatMap((stock, index) => {
    const variant = creates[index].variant?.trim();
    return variant ? [{ productId: stock.id, businessId, name: variant, price: creates[index].price ?? 0, sku: creates[index].sku || null, sortOrder: 0 }] : [];
  });

  try {
    if (stockRows.length) {
      const { error: stockError } = await supabase.from('ProductStock').insert(stockRows);
      if (stockError) throw stockError;
      const { error: productError } = await supabase.from('Product').insert(productRows);
      if (productError) throw productError;
      if (variantRows.length) {
        const { error: variantError } = await supabase.from('ProductVariant').insert(variantRows);
        if (variantError) throw variantError;
      }
    }
    for (const row of updates) {
      await supabase.from('ProductStock').update({ name: row.productName.trim(), cat: row.category.trim() || DEFAULT_CATEGORY }).eq('businessId', businessId).eq('id', row.existingProductId);
      await supabase.from('Product').update({ sellprice: row.price ?? 0 }).eq('productId', row.existingProductId);
    }
    await writeSuperAdminAudit({
      businessId,
      action: 'MENU_IMPORT',
      entityType: 'ProductStock',
      description: `Imported ${stockRows.length} products from ${input.fileName}.`,
      metadata: {
        fileName: input.fileName,
        fileType: input.fileType,
        importedProducts: stockRows.length,
        updatedProducts: updates.length,
        importedCategories: new Set(stockRows.map((row) => row.cat)).size,
        durationMs: Date.now() - started,
        result: 'success',
      },
    });
    return { created: stockRows.length, updated: updates.length, skipped: input.rows.length - rows.length };
  } catch (error) {
    if (stockRows.length) await supabase.from('ProductStock').delete().eq('businessId', businessId).in('id', stockRows.map((row) => row.id));
    await writeSuperAdminAudit({
      businessId,
      action: 'MENU_IMPORT_FAILED',
      entityType: 'ProductStock',
      description: `Menu import failed for ${input.fileName}.`,
      metadata: { fileName: input.fileName, fileType: input.fileType, durationMs: Date.now() - started, result: 'failed' },
    });
    throw error;
  }
}

function rowsFromObjects(rows: Record<string, unknown>[]): MenuImportItem[] {
  return rows.map((row) => {
    const entries = Object.entries(row);
    const read = (...keys: string[]) => {
      const found = entries.find(([key]) => keys.includes(normalizeKey(key)));
      return found ? String(found[1] ?? '').trim() : '';
    };
    const productName = read('productname', 'product', 'item', 'itemname', 'name', 'dish', 'menuname', 'menuitem')
      || String(entries[0]?.[1] ?? '').trim();
    return {
      id: randomUUID(),
      productName,
      category: read('category', 'cat', 'section') || DEFAULT_CATEGORY,
      subcategory: read('subcategory', 'subcat'),
      description: read('description', 'desc', 'details'),
      price: parsePrice(read('price', 'sellprice', 'sellingprice', 'rate', 'amount', 'mrp')),
      discount: parsePrice(read('discount')),
      tax: parsePrice(read('tax')),
      gst: read('gst'),
      hsn: read('hsn'),
      sku: read('sku'),
      barcode: read('barcode'),
      variant: read('variant', 'variation'),
      size: read('size'),
      unit: read('unit'),
      foodType: inferFoodType(read('veg', 'type', 'foodtype')),
      preparationTime: read('preparationtime', 'preptime'),
      availability: read('availability', 'available'),
      tags: read('tags').split(',').map((tag) => tag.trim()).filter(Boolean),
      confidence: 0.8,
      duplicateAction: 'create' as const,
    };
  }).filter((row) => row.productName || row.price !== null);
}

async function rowsFromAiOrText(rawText: string, file?: File): Promise<MenuImportItem[]> {
  if (process.env.OPENAI_API_KEY) {
    const rows = await aiExtract(rawText, file);
    if (rows.length) return rows;
  }
  if (!rawText) throw new Error('This scanned file needs OCR or AI vision. Configure OPENAI_API_KEY to extract it.');
  return rawText.split(/\r?\n/).map((line) => {
    const match = line.match(/(.+?)\s+(?:rs\.?|inr|₹)?\s*([0-9]+(?:\.[0-9]{1,2})?)\s*$/i);
    return match ? { id: randomUUID(), productName: match[1].trim(), category: DEFAULT_CATEGORY, price: Number(match[2]), confidence: 0.45, duplicateAction: 'create' as const } : null;
  }).filter(Boolean) as MenuImportItem[];
}

async function aiExtract(rawText: string, file?: File): Promise<MenuImportItem[]> {
  const content: Record<string, unknown>[] = [{ type: 'text', text: `Extract restaurant menu products as JSON array only. Do not invent missing fields. Text:\n${rawText.slice(0, 18000)}` }];
  if (file && file.type.startsWith('image/')) {
    const base64 = Buffer.from(await file.arrayBuffer()).toString('base64');
    content.push({ type: 'image_url', image_url: { url: `data:${file.type};base64,${base64}` } });
  }
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: process.env.OPENAI_MENU_IMPORT_MODEL ?? 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [{ role: 'user', content }],
    }),
  });
  if (!response.ok) throw new Error('AI extraction failed. Please try again.');
  const json = await response.json();
  const parsed = JSON.parse(json.choices?.[0]?.message?.content ?? '{}');
  const rows = Array.isArray(parsed) ? parsed : parsed.products ?? parsed.items ?? [];
  return rowsFromObjects(rows);
}

function parseCsv(text: string) {
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  const headers = splitCsvLine(lines.shift() ?? '');
  return lines.map((line) => Object.fromEntries(splitCsvLine(line).map((value, index) => [headers[index] ?? `column_${index}`, value])));
}

function splitCsvLine(line: string) {
  const values: string[] = [];
  let value = '';
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"' && line[index + 1] === '"') { value += '"'; index += 1; continue; }
    if (char === '"') { quoted = !quoted; continue; }
    if (char === ',' && !quoted) { values.push(value); value = ''; continue; }
    value += char;
  }
  values.push(value);
  return values.map((item) => item.trim());
}

function addValidation(row: MenuImportItem): MenuImportItem {
  const issues = [];
  if (!row.productName.trim()) issues.push('Product name is missing.');
  if (row.price === null || row.price === undefined || Number.isNaN(row.price)) issues.push('Price is missing or invalid.');
  if (!row.category.trim()) issues.push('Category is missing.');
  return { ...row, validationIssues: issues };
}

function addDuplicate(row: MenuImportItem, existing: ExistingProduct[]): MenuImportItem {
  const normalized = normalizeName(row.productName);
  const exact = existing.find((item) => normalizeName(item.name) === normalized);
  const similar = exact ?? existing.find((item) => similarity(normalizeName(item.name), normalized) > 0.82);
  if (!similar) return row;
  const sale = Array.isArray(similar.Product) ? similar.Product[0]?.sellprice : null;
  return { ...row, duplicate: { type: exact ? 'exact' : 'similar', productId: similar.id, name: similar.name, category: similar.cat, price: sale ?? null }, existingProductId: similar.id };
}

function normalizeKey(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function parsePrice(value: string) {
  if (!value) return null;
  const number = Number(value.replace(/[^0-9.]/g, ''));
  return Number.isFinite(number) ? number : null;
}

function inferFoodType(value: string): 'VEG' | 'NON_VEG' | 'EGG' | 'UNKNOWN' {
  const normalized = value.toLowerCase();
  if (normalized.includes('non')) return 'NON_VEG';
  if (normalized.includes('egg')) return 'EGG';
  if (normalized.includes('veg')) return 'VEG';
  return 'UNKNOWN';
}

function normalizeName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function similarity(a: string, b: string) {
  if (!a || !b) return 0;
  const left = new Set(a.split(' '));
  const right = new Set(b.split(' '));
  const shared = [...left].filter((word) => right.has(word)).length;
  return shared / Math.max(left.size, right.size);
}
