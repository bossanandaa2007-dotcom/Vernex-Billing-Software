import 'server-only';
import { getServerEnvironment } from '@/lib/env.server';

type EdgeLoginResponse = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
};

export async function signInWithUserId(userId: string, password: string) {
  const environment = getServerEnvironment();
  const normalizedUserId = userId.trim().toLowerCase();
  const endpoint = normalizedUserId.includes('@')
    ? `${environment.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/token?grant_type=password`
    : `${environment.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/login-with-user-id`;
  const response = await fetch(
    endpoint,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${environment.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
        apikey: environment.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      },
      body: JSON.stringify(
        normalizedUserId.includes('@')
          ? { email: normalizedUserId, password }
          : { userId: normalizedUserId, password }
      ),
      cache: 'no-store',
    }
  );
  if (!response.ok) return null;
  return (await response.json()) as EdgeLoginResponse;
}
