import { prisma } from '@/lib/db';
import { verifyWebhookSignature } from '@/lib/payments/razorpay';
import { grantEntitlement } from '@/lib/payments/entitle';

export const runtime = 'nodejs';

/**
 * Razorpay's server-to-server callback, the durable source of truth for a payment,
 * since the client-side verify call can fail to fire even when the payment went
 * through. No session cookie here; authenticated purely by the HMAC signature over
 * the raw body, using a separate secret from the API key (configured against this
 * URL in the Razorpay dashboard).
 */
export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature = req.headers.get('x-razorpay-signature');
  if (!signature || !verifyWebhookSignature(rawBody, signature)) {
    return Response.json({ error: 'Invalid signature.' }, { status: 400 });
  }

  let event: { event?: string; payload?: { payment?: { entity?: { id?: string; order_id?: string } } } };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return Response.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  if (event.event === 'payment.captured') {
    const entity = event.payload?.payment?.entity;
    if (entity?.order_id && entity?.id) {
      const payment = await prisma.payment.findUnique({ where: { razorpayOrderId: entity.order_id } });
      if (payment) await grantEntitlement(payment, entity.id);
    }
  }

  return Response.json({ ok: true });
}
