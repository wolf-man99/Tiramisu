'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Button, type ButtonProps } from '@/components/ui/primitives';
import type { Product } from '@/lib/payments/pricing';

/**
 * Buy -> pay -> unlock, in one button. Creates the Razorpay order server-side, opens
 * Checkout.js, verifies the result, then refreshes the page so newly-granted access
 * (a paid module, Run) renders immediately without a manual reload.
 */

interface RazorpaySuccessResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  order_id: string;
  name: string;
  description: string;
  handler: (response: RazorpaySuccessResponse) => void;
  modal?: { ondismiss?: () => void };
  theme?: { color?: string };
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => { open: () => void };
  }
}

let scriptPromise: Promise<void> | null = null;
function loadRazorpayScript(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Could not load the checkout — check your connection and try again.'));
      document.body.appendChild(script);
    });
  }
  return scriptPromise;
}

export function CheckoutButton({
  product, label, variant = 'primary', size = 'md', className,
}: {
  product: Product;
  label: string;
  variant?: ButtonProps['variant'];
  size?: ButtonProps['size'];
  className?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function buy() {
    setBusy(true);
    setError('');
    try {
      const orderRes = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ product }),
      });
      const order = await orderRes.json();
      if (!orderRes.ok) throw new Error(order.error ?? 'Could not start checkout.');

      await loadRazorpayScript();
      if (!window.Razorpay) throw new Error('Checkout failed to load.');

      const razorpay = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        order_id: order.orderId,
        name: 'Tiramisu — Meta Ads Mastery',
        description: label,
        theme: { color: '#045099' },
        modal: { ondismiss: () => setBusy(false) },
        handler: async (response) => {
          try {
            const verifyRes = await fetch('/api/payments/verify', {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify(response),
            });
            const result = await verifyRes.json();
            if (!verifyRes.ok) throw new Error(result.error ?? 'Payment verification failed.');
            router.refresh();
          } catch (e) {
            setError(e instanceof Error ? e.message : 'Payment verification failed — contact support with your payment ID.');
          } finally {
            setBusy(false);
          }
        },
      });
      razorpay.open();
      setBusy(false);
    } catch (e) {
      setBusy(false);
      setError(e instanceof Error ? e.message : 'Could not start checkout.');
    }
  }

  return (
    <div>
      <Button type="button" variant={variant} size={size} className={className} onClick={buy} disabled={busy}>
        {busy ? <Loader2 size={15} className="animate-spin" /> : null}
        {label}
      </Button>
      {error && <p className="mt-1.5 text-xs font-semibold text-[var(--red)]">{error}</p>}
    </div>
  );
}
