import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';
import Razorpay from 'razorpay';

// Razorpay credentials are server-only. The Key ID is also exposed to the
// browser (Checkout needs it) but travels in the checkout API response rather
// than a NEXT_PUBLIC_ variable, so a key rotation takes effect without a rebuild.
export function razorpayConfig() {
  const keyId = process.env.RAZORPAY_KEY_ID?.trim();
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();
  if (!keyId || !keySecret) return null;
  return { keyId, keySecret };
}

export function isRazorpayConfigured() {
  return razorpayConfig() !== null;
}

export class PaymentsUnavailableError extends Error {
  constructor() {
    super('Online payments are not configured yet. Contact Vernex to activate your licence.');
  }
}

export function razorpayClient() {
  const config = razorpayConfig();
  if (!config) throw new PaymentsUnavailableError();
  return new Razorpay({ key_id: config.keyId, key_secret: config.keySecret });
}

// Constant-time compare so a signature check cannot be probed byte by byte.
function safeEqual(a: string, b: string) {
  const left = Buffer.from(a, 'utf8');
  const right = Buffer.from(b, 'utf8');
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

// Checkout callback: Razorpay signs `${orderId}|${paymentId}` with the key
// secret. A valid signature is the only proof the browser actually paid —
// never trust the payment id on its own.
export function verifyCheckoutSignature(orderId: string, paymentId: string, signature: string) {
  const config = razorpayConfig();
  if (!config) return false;
  const expected = createHmac('sha256', config.keySecret).update(`${orderId}|${paymentId}`).digest('hex');
  return safeEqual(expected, signature);
}

// Webhooks are signed with a separate secret set in the Razorpay dashboard.
export function verifyWebhookSignature(rawBody: string, signature: string) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET?.trim();
  if (!secret || !signature) return false;
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
  return safeEqual(expected, signature);
}

// Razorpay works in the smallest currency unit (paise for INR).
export const toMinorUnits = (amount: number) => Math.round(amount * 100);
export const fromMinorUnits = (amount: number) => amount / 100;
