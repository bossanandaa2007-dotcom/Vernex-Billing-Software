import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerEnvironment } from '@/lib/env.server';
import { timingSafeEqual } from 'node:crypto';

const schema = z.object({
  businessId: z.string().min(1),
  planName: z.string().trim().min(2).max(50).default('Activated Plan'),
});

export async function POST(request: Request) {
  const secret = getServerEnvironment().VERNEX_ADMIN_SECRET;
  const suppliedSecret = request.headers.get('x-vernex-admin-secret') ?? '';
  const expected = Buffer.from(secret);
  const supplied = Buffer.from(suppliedSecret);
  const authorized = supplied.length === expected.length && timingSafeEqual(supplied, expected);
  if (!authorized) {
    return NextResponse.json({ error: 'Admin activation is not authorized.' }, { status: 403 });
  }
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: 'Enter a valid business and plan name.' }, { status: 400 });
  try {
    const environment = getServerEnvironment();
    const response = await fetch(`${environment.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/platform-admin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: environment.NEXT_PUBLIC_SUPABASE_ANON_KEY },
      body: JSON.stringify({ action: 'activate', secret: suppliedSecret, ...parsed.data }),
      cache: 'no-store',
    });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json({ error: 'Unable to activate this business. Please try again.' }, { status: 500 });
  }
}
