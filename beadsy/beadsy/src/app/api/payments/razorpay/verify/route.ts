import { z } from "zod";
import { db } from "@/lib/db";
import { apiHandler, HttpError, json, readJson } from "@/lib/api";
import { markOrderPaid } from "@/lib/orders";
import { verifyRazorpayPaymentSignature } from "@/lib/payments/razorpay";

const schema = z.object({
  orderNumber: z.string().min(3).max(20),
  token: z.string().min(10).max(100),
  razorpay_order_id: z.string().min(5).max(100),
  razorpay_payment_id: z.string().min(5).max(100),
  razorpay_signature: z.string().min(10).max(200),
});

/**
 * Called by the browser after the Razorpay modal succeeds. Nothing is trusted from the client:
 * the HMAC signature (made with our secret key) proves Razorpay confirmed this payment.
 */
export const POST = apiHandler(
  async (req) => {
    const b = schema.parse(await readJson(req));
    if (!verifyRazorpayPaymentSignature(b.razorpay_order_id, b.razorpay_payment_id, b.razorpay_signature)) {
      throw new HttpError(400, "Payment signature could not be verified.", "BAD_SIGNATURE");
    }
    // The Razorpay order must belong to the order this customer holds the access token for.
    const payment = await db.payment.findFirst({
      where: { provider: "RAZORPAY", providerRef: b.razorpay_order_id, order: { number: b.orderNumber, accessToken: b.token } },
      select: { id: true },
    });
    if (!payment) throw new HttpError(404, "Order not found", "NOT_FOUND");

    const res = await markOrderPaid({
      provider: "RAZORPAY",
      providerRef: b.razorpay_order_id,
      providerPaymentId: b.razorpay_payment_id,
    });
    if (res.result === "amount_mismatch" || res.result === "not_found") {
      throw new HttpError(409, "We couldn't confirm this payment automatically. Our team has been alerted.", "PAYMENT_REVIEW");
    }
    return json({ ok: true, status: res.result });
  },
  { rateLimit: { name: "rzp-verify", max: 30, windowMs: 10 * 60_000 } },
);
