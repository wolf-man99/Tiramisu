import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Thin wrapper over Razorpay's REST API: no SDK dependency, since order creation is
 * a single POST and everything else here is just HMAC verification (Node's built-in
 * crypto already does that for session tokens, see src/lib/auth/session.ts).
 */

const RAZORPAY_API = 'https://api.razorpay.com/v1';

export function isRazorpayConfigured(): boolean {
  return Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
}

function authHeader(): string {
  const id = process.env.RAZORPAY_KEY_ID!;
  const secret = process.env.RAZORPAY_KEY_SECRET!;
  return `Basic ${Buffer.from(`${id}:${secret}`).toString('base64')}`;
}

export interface RazorpayOrder {
  id: string;
  amount: number;
  currency: string;
}

/** Creates a Razorpay Order, the object Checkout.js needs to open its payment modal.
 *  `amountPaise` must come from a server-side price lookup, never from the client. */
export async function createRazorpayOrder(amountPaise: number, receipt: string, notes: Record<string, string>): Promise<RazorpayOrder> {
  const res = await fetch(`${RAZORPAY_API}/orders`, {
    method: 'POST',
    headers: { authorization: authHeader(), 'content-type': 'application/json' },
    body: JSON.stringify({ amount: amountPaise, currency: 'INR', receipt, notes }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Razorpay order creation failed (${res.status}): ${detail}`);
  }
  return res.json();
}

/** Verifies a Checkout.js success callback's signature: HMAC-SHA256 of
 *  `orderId|paymentId` using the key secret, per Razorpay's documented scheme. */
export function verifyPaymentSignature(orderId: string, paymentId: string, signature: string): boolean {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) return false;
  const expected = createHmac('sha256', secret).update(`${orderId}|${paymentId}`).digest('hex');
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Verifies a webhook delivery's signature, a separate secret from the key secret,
 *  configured against the webhook URL in the Razorpay dashboard. Must run over the
 *  raw request body, not a re-serialized parse of it. */
export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return false;
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
