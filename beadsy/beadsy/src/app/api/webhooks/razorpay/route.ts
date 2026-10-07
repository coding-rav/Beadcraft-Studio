import { db } from "@/lib/db";
import { apiHandler, HttpError, json } from "@/lib/api";
import { sha256 } from "@/lib/ids";
import { markOrderPaid, markPaymentRefunded, recordPaymentFailure } from "@/lib/orders";
import { verifyRazorpayWebhookSignature } from "@/lib/payments/razorpay";
import { withWebhookIdempotency } from "@/lib/webhooks";

export const runtime = "nodejs";

interface PaymentEntity {
  id?: string;
  order_id?: string;
  amount?: number;
  currency?: string;
  status?: string;
  error_description?: string | null;
}
interface RefundEntity {
  payment_id?: string;
  amount?: number;
}
interface WebhookBody {
  event?: string;
  payload?: {
    payment?: { entity?: PaymentEntity };
    refund?: { entity?: RefundEntity };
  };
}

export const POST = apiHandler(
  async (req) => {
    const raw = await req.text(); // raw body is required for the HMAC check
    if (!verifyRazorpayWebhookSignature(raw, req.headers.get("x-razorpay-signature"))) {
      throw new HttpError(400, "Invalid signature", "BAD_SIGNATURE");
    }
    let body: WebhookBody;
    try {
      body = JSON.parse(raw) as WebhookBody;
    } catch {
      throw new HttpError(400, "Invalid JSON", "BAD_JSON");
    }
    const type = body.event ?? "unknown";
    const eventId = req.headers.get("x-razorpay-event-id") ?? sha256(raw);

    const status = await withWebhookIdempotency("RAZORPAY", eventId, type, async () => {
      const pay = body.payload?.payment?.entity;
      switch (type) {
        case "payment.captured":
        case "order.paid":
          if (pay?.order_id && pay.id) {
            await markOrderPaid({
              provider: "RAZORPAY",
              providerRef: pay.order_id,
              providerPaymentId: pay.id,
              amountPaidCents: pay.amount ?? null,
              currency: pay.currency ?? null,
            });
          }
          break;
        case "payment.failed":
          // Retriable in the same Razorpay order — record it, keep the order pending until it expires.
          if (pay?.order_id) await recordPaymentFailure("RAZORPAY", pay.order_id, pay.error_description ?? "Payment failed");
          break;
        case "refund.processed": {
          const refund = body.payload?.refund?.entity;
          if (refund?.payment_id) {
            const payment = await db.payment.findFirst({ where: { provider: "RAZORPAY", providerPaymentId: refund.payment_id } });
            if (payment && (refund.amount ?? 0) >= payment.amountCents) await markPaymentRefunded("RAZORPAY", refund.payment_id);
          }
          break;
        }
        default:
          break;
      }
    });
    return json({ received: true, status });
  },
  { sameOrigin: false },
);
