import type Stripe from "stripe";
import { db } from "@/lib/db";
import { apiHandler, json } from "@/lib/api";
import { failPaymentAndCancel, markOrderPaid, markPaymentRefunded } from "@/lib/orders";
import { constructStripeEvent } from "@/lib/payments/stripe";
import { withWebhookIdempotency } from "@/lib/webhooks";

export const runtime = "nodejs";

function paymentIntentId(pi: string | Stripe.PaymentIntent | null): string | null {
  if (!pi) return null;
  return typeof pi === "string" ? pi : pi.id;
}

async function handleEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded": {
      const s = event.data.object as Stripe.Checkout.Session;
      if (s.payment_status === "paid") {
        await markOrderPaid({
          provider: "STRIPE",
          providerRef: s.id,
          providerPaymentId: paymentIntentId(s.payment_intent),
          amountPaidCents: s.amount_total,
          currency: s.currency,
        });
      }
      // payment_status "unpaid" (e.g. bank debit) → still pending; async_payment_* event follows.
      break;
    }
    case "checkout.session.async_payment_failed": {
      const s = event.data.object as Stripe.Checkout.Session;
      await failPaymentAndCancel("STRIPE", s.id, "Payment failed");
      break;
    }
    case "checkout.session.expired": {
      const s = event.data.object as Stripe.Checkout.Session;
      await failPaymentAndCancel("STRIPE", s.id, "Checkout session expired");
      break;
    }
    case "payment_intent.payment_failed": {
      // Retriable inside the same Checkout Session, so only record it — the order stays pending.
      const pi = event.data.object as Stripe.PaymentIntent;
      const orderId = pi.metadata?.orderId;
      if (orderId) {
        await db.payment.updateMany({
          where: { orderId, provider: "STRIPE", status: { in: ["PENDING", "FAILED"] } },
          data: { status: "FAILED", failureReason: (pi.last_payment_error?.message ?? "Payment failed").slice(0, 200) },
        });
      }
      break;
    }
    case "charge.refunded": {
      const c = event.data.object as Stripe.Charge;
      const pi = paymentIntentId(c.payment_intent);
      if (pi && c.refunded) await markPaymentRefunded("STRIPE", pi);
      break;
    }
    default:
      break; // ignore everything else
  }
}

export const POST = apiHandler(
  async (req) => {
    // IMPORTANT: signature verification needs the exact raw body.
    const raw = await req.text();
    const event = constructStripeEvent(raw, req.headers.get("stripe-signature"));
    const status = await withWebhookIdempotency("STRIPE", event.id, event.type, () => handleEvent(event));
    return json({ received: true, status });
  },
  { sameOrigin: false },
);
