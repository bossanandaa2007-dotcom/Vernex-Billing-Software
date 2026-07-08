import { TaxMode } from '@/src/types/domain';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerClient } from '@/src/lib/supabase/server';

const schema = z.object({
  businessName: z.string().trim().min(2),
  ownerName: z.string().trim().min(2),
  phone: z.string().trim().max(30).optional(),
  country: z.string().trim().min(2).default('India'),
  currency: z.enum(['INR', 'USD', 'EUR', 'GBP', 'AED']).default('INR'),
  taxMode: z.nativeEnum(TaxMode).default(TaxMode.GST),
});

export async function POST(request: Request) {
  try {
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    const supabase = await createServerClient(request);
    const { data: result, error } = await supabase.rpc('onboard_business', {
      p_business_name: parsed.data.businessName,
      p_owner_name: parsed.data.ownerName,
      p_phone: parsed.data.phone ?? '',
      p_country: parsed.data.country,
      p_currency: parsed.data.currency,
      p_tax_mode: parsed.data.taxMode,
    });
    if (error) throw error;

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Unable to complete account setup. Please try again.' }, { status: 400 });
  }
}
