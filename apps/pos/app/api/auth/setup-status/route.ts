import { NextResponse } from 'next/server';
import { getServerEnvironment } from '@/lib/env.server';

export async function GET() {
  try {
    const environment = getServerEnvironment();
    const result = await fetch(`${environment.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/platform-admin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: environment.NEXT_PUBLIC_SUPABASE_ANON_KEY },
      body: JSON.stringify({ action: 'setup-status' }),
      cache: 'no-store',
    });
    const data = result.ok ? await result.json() : { available: false };
    const response = NextResponse.json(data);
    response.headers.set('Cache-Control', 'no-store');
    return response;
  } catch {
    return NextResponse.json({ available: false });
  }
}
