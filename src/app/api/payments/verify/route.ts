import { prisma } from '@/lib/db';
import { getProfileId } from '@/lib/auth/server';
import { verifyPaymentSignature } from '@/lib/payments/razorpay';
import { grantEntitlement } from '@/lib/payments/entitle';

export const runtime = 'nodejs';

/**
 * Called by the client right after Checkout.js reports success. This is the fast
 * path to unlocking content, the webhook (/api/payments/webhook) is the durable
 * backstop for when this call never fires (closed tab, dropped network).
 */
export async function POST(req: Request) {
  const profileId = await getProfileId();
  if (!profileId) return Response.json({ error: 'Not signed in.' }, { status: 401 });

  let body: { razorpay_order_id?: string; razorpay_payment_id?: string; razorpay_signature?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }
  const orderId = body.razorpay_order_id;
  const paymentId = body.razorpay_payment_id;
  const signature = body.razorpay_signature;
  if (!orderId || !paymentId || !signature) {
    return Response.json({ error: 'Missing payment fields.' }, { status: 400 });
  }

  const payment = await prisma.payment.findUnique({ where: { razorpayOrderId: orderId } });
  if (!payment || payment.profileId !== profileId) {
    return Response.json({ error: 'Order not found.' }, { status: 404 });
  }
  if (!verifyPaymentSignature(orderId, paymentId, signature)) {
    return Response.json({ error: 'Signature verification failed.' }, { status: 400 });
  }

  await grantEntitlement(payment, paymentId);
  return Response.json({ ok: true, product: payment.product });
}
