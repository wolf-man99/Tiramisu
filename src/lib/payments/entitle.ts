import { prisma } from '../db';
import type { Payment } from '@prisma/client';

/**
 * Marks a Payment paid and grants the matching Enrollment entitlement. Idempotent,
 * safe to call from both the client-side verify route and the webhook for the same
 * payment, since whichever arrives first wins the guarded update and the other is a
 * harmless no-op rather than a double-grant.
 */
export async function grantEntitlement(payment: Payment, razorpayPaymentId: string): Promise<void> {
  if (payment.status === 'paid') return;

  await prisma.$transaction(async (tx) => {
    const claimed = await tx.payment.updateMany({
      where: { id: payment.id, status: { not: 'paid' } },
      data: { status: 'paid', paidAt: new Date(), razorpayPaymentId },
    });
    if (claimed.count === 0) return; // another call already processed this payment

    const grants =
      payment.product === 'bundle' ? { learnPurchasedAt: new Date(), runPurchasedAt: new Date() }
      : payment.product === 'learn' ? { learnPurchasedAt: new Date() }
      : { runPurchasedAt: new Date() };

    await tx.enrollment.updateMany({
      where: { profileId: payment.profileId, courseId: payment.courseId },
      data: grants,
    });
  });
}
