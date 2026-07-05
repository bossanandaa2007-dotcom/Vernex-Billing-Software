import { NextResponse } from 'next/server';
import { globalSearch } from '@/services/admin-data.server';

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get('q')?.trim() ?? '';
  if (query.length < 2) return NextResponse.json({ businesses: [], users: [] });
  try {
    return NextResponse.json(await globalSearch(query));
  } catch {
    return NextResponse.json({ error: 'Unable to search right now.' }, { status: 500 });
  }
}

