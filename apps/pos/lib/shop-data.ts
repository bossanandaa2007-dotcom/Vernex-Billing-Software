import { TaxMode } from '@/src/types/domain';
import { createServerClient } from '@/src/lib/supabase/server';

const shopCache = new Map<string, { expires: number; data: { data: Record<string, unknown> } }>();
const SHOP_CACHE_MS = 30_000;

export async function getBusinessShopData(businessId: string, request?: Request) {
  const cached = shopCache.get(businessId);
  if (cached && cached.expires > Date.now()) return cached.data;

  const supabase = await createServerClient(request);
  const [storedResult, sequenceResult] = await Promise.all([
    supabase.from('ShopData').select('*').eq('businessId', businessId).maybeSingle(),
    supabase.from('BillSequence').select('*').eq('id', businessId).maybeSingle(),
  ]);
  const stored = storedResult.data;
  const sequence = sequenceResult.data;
  const data = stored ?? {
    id: null,
    name: 'Vernex',
    tax: 0,
    country: 'India',
    currency: 'INR',
    taxMode: TaxMode.GST,
    phone: null,
    address: null,
    taxId: null,
    receiptFooter: 'Thank you for your business!',
    receiptLogo: null,
    billPrefix: 'VNX',
    billPadding: 6,
    showBusinessLogo: true,
    showTaxId: true,
    showCustomerDetails: true,
    showItemTax: true,
    showFooter: true,
    receiptSize: '80mm',
  };
  const response = { data: { ...data, billNextNumber: sequence?.nextNumber ?? 1 } };
  shopCache.set(businessId, { expires: Date.now() + SHOP_CACHE_MS, data: response });
  return response;
}

export function clearBusinessShopDataCache(businessId: string) {
  shopCache.delete(businessId);
}
