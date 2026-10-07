import Razorpay from "razorpay";
import { createHmac, timingSafeEqual } from "node:crypto";
import { HttpError } from "../api";

let client: Razorpay | null = null;

function razorpay(): Razorpay {
  const id = process.env.RAZORPAY_KEY_ID;
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!id || !secret) throw new HttpError(503, "UPI / card payments via Razorpay are not configured yet.", "PROVIDER_NOT_CONFIGURED");
  client ??= new Razorpay({ key_id: id, key_secret: secret });
  return client;
}

export async function createRazorpayOrder(input: {
  orderId: string;
  orderNumber: string;
  amountCents: number;
  currency: string;
  email: string;
}): Promise<{ id: string; keyId: string }> {
  const order = await razorpay().orders.create({
    amount: input.amountCents,
    currency: input.currency,
    receipt: input.orderNumber,
    notes: { orderId: input.orderId, orderNumber: input.orderNumber, email: input.email },
  });
  return { id: String(order.id), keyId: process.env.RAZORPAY_KEY_ID! };
}

export function hmacSha256Hex(secret: string, payload: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

export function safeEqualHex(a: string, b: string): boolean {
  const ba = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

/** Checkout handler signature: HMAC_SHA256(order_id + "|" + payment_id, key_secret). */
export function verifyRazorpayPaymentSignature(
  orderId: string,
  paymentId: string,
  signature: string,
  keySecret = process.env.RAZORPAY_KEY_SECRET,
): boolean {
  if (!keySecret) return false;
  return safeEqualHex(hmacSha256Hex(keySecret, `${orderId}|${paymentId}`), signature);
}

/** Webhook signature: HMAC_SHA256(raw body, webhook secret) in the X-Razorpay-Signature header. */
export function verifyRazorpayWebhookSignature(
  rawBody: string,
  signature: string | null,
  webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET,
): boolean {
  if (!webhookSecret || !signature) return false;
  return safeEqualHex(hmacSha256Hex(webhookSecret, rawBody), signature);
}
