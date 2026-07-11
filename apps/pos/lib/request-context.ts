import type { CurrentUserContext } from '@/lib/auth';

export const requestContextHeader = 'x-vernex-auth-context';
export const requestContextSignatureHeader = 'x-vernex-auth-signature';
export const requestContextCookieName = 'vernex-auth-context';
export const REQUEST_CONTEXT_COOKIE_MAX_AGE = 60;

function signingSecret() {
  return process.env.VERNEX_ADMIN_SECRET;
}

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

function base64UrlToBytes(value: string) {
  const padded = value.replaceAll('-', '+').replaceAll('_', '/') + '='.repeat((4 - value.length % 4) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

function timingSafeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

async function hmac(value: string) {
  const secret = signingSecret();
  if (!secret) return null;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value));
  return bytesToBase64Url(new Uint8Array(signature));
}

export async function encodeRequestContext(ctx: CurrentUserContext, token: string) {
  const payload = bytesToBase64Url(new TextEncoder().encode(JSON.stringify(ctx)));
  const signature = await hmac(`${payload}.${token}`);
  if (!signature) return null;
  return { payload, signature };
}

export function encodeRequestContextCookieValue(encoded: { payload: string; signature: string }) {
  return `${encoded.payload}.${encoded.signature}`;
}

async function decodeSignedContext(payload: string | null, signature: string | null, token: string) {
  if (!payload || !signature) return null;
  const expected = await hmac(`${payload}.${token}`);
  if (!expected || !timingSafeEqual(expected, signature)) return null;
  try {
    return JSON.parse(new TextDecoder().decode(base64UrlToBytes(payload))) as CurrentUserContext;
  } catch {
    return null;
  }
}

export async function decodeRequestContext(headers: Headers, token: string): Promise<CurrentUserContext | null> {
  const payload = headers.get(requestContextHeader);
  const signature = headers.get(requestContextSignatureHeader);
  return decodeSignedContext(payload, signature, token);
}

export async function decodeRequestContextCookie(value: string | undefined, token: string): Promise<CurrentUserContext | null> {
  if (!value) return null;
  const separatorIndex = value.lastIndexOf('.');
  if (separatorIndex <= 0 || separatorIndex === value.length - 1) return null;
  return decodeSignedContext(value.slice(0, separatorIndex), value.slice(separatorIndex + 1), token);
}

export function stripRequestContextHeaders(headers: Headers) {
  headers.delete(requestContextHeader);
  headers.delete(requestContextSignatureHeader);
}
