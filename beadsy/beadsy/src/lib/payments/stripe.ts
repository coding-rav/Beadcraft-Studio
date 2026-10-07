import Stripe from "stripe";
import { HttpError } from "../api";
import { siteConfig } from "../config";

let client: Stripe | null = null;

export function stripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new HttpError(503, "Card payments are not configured yet.", "PROVIDER_NOT_CONFIGURED");
  client ??= new Stripe(key, { maxNetworkRetries: 2, appInfo: { name: "Beadsy" } });
  return client;
}

export interface StripeOrderInput {
  orderId: string;
  orderNumber: string;
  accessToken: string;
  email: string;
  currency: string;
  items: Array<{ name: string; variantName: string | null; unitPriceCents: number; quantity: number; imageUrl: string | null }>;
  shippingCents: number;
  discountCents: number;
  /** Tax charged ON TOP of the line amounts (0 when prices are tax-inclusive). */
  taxOnTopCents: number;
}

/**
 * Creates a hosted Stripe Checkout Session whose amounts come from OUR database totals.
 * The idempotency key makes retries (double click, network retry) return the same session.
 */
export async function createStripeCheckoutSession(input: StripeOrderInput): Promise<{ id: string; url: string }> {
  const s = stripe();
  const currency = input.currency.toLowerCase();

  const line_items: Stripe.Checkout.SessionCreateParams.LineItem[] = input.items.map((i) => ({
    quantity: i.quantity,
    price_data: {
      currency,
      unit_amount: i.unitPriceCents,
      product_data: {
        name: i.variantName ? `${i.name} — ${i.variantName}` : i.name,
        ...(i.imageUrl && i.imageUrl.startsWith("https://") ? { images: [i.imageUrl] } : {}),
      },
    },
  }));
  if (input.shippingCents > 0) {
    line_items.push({
      quantity: 1,
      price_data: { currency, unit_amount: input.shippingCents, product_data: { name: "Shipping" } },
    });
  }

  if (input.taxOnTopCents > 0) {
    line_items.push({
      quantity: 1,
      price_data: { currency, unit_amount: input.taxOnTopCents, product_data: { name: "GST" } },
    });
  }

  const discounts: Stripe.Checkout.SessionCreateParams.Discount[] = [];
  if (input.discountCents > 0) {
    const coupon = await s.coupons.create(
      { amount_off: input.discountCents, currency, duration: "once", name: `Beadsy order ${input.orderNumber}`, max_redemptions: 1 },
      { idempotencyKey: `coupon_${input.orderId}` },
    );
    discounts.push({ coupon: coupon.id });
  }

  const session = await s.checkout.sessions.create(
    {
      mode: "payment",
      customer_email: input.email,
      line_items,
      ...(discounts.length ? { discounts } : {}),
      client_reference_id: input.orderId,
      metadata: { orderId: input.orderId, orderNumber: input.orderNumber },
      payment_intent_data: { metadata: { orderId: input.orderId, orderNumber: input.orderNumber } },
      success_url: `${siteConfig.url}/checkout/success?o=${encodeURIComponent(input.orderNumber)}&t=${encodeURIComponent(input.accessToken)}`,
      cancel_url: `${siteConfig.url}/checkout?cancelled=1&o=${encodeURIComponent(input.orderNumber)}&t=${encodeURIComponent(input.accessToken)}`,
      expires_at: Math.floor(Date.now() / 1000) + 31 * 60,
    },
    { idempotencyKey: `session_${input.orderId}` },
  );
  if (!session.url) throw new HttpError(502, "Could not start the payment session.", "PROVIDER_ERROR");
  return { id: session.id, url: session.url };
}

/** Verifies the Stripe-Signature header against the RAW request body. Throws on failure. */
export function constructStripeEvent(rawBody: string, signature: string | null): Stripe.Event {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new HttpError(503, "Webhook secret not configured", "PROVIDER_NOT_CONFIGURED");
  if (!signature) throw new HttpError(400, "Missing signature", "BAD_SIGNATURE");
  try {
    return stripe().webhooks.constructEvent(rawBody, signature, secret);
  } catch {
    throw new HttpError(400, "Invalid signature", "BAD_SIGNATURE");
  }
}

/**
 * Asks Stripe (server-to-server, with our secret key) for the real state of a Checkout Session.
 * Used on the success page as a safety net when the webhook has not arrived yet, e.g. local
 * development without the Stripe CLI. The browser's word is never used to mark an order paid.
 */
export async function retrieveStripeSession(sessionId: string): Promise<{
  paid: boolean;
  paymentIntentId: string | null;
  amountTotal: number | null;
  currency: string | null;
}> {
  const s = await stripe().checkout.sessions.retrieve(sessionId);
  const pi = s.payment_intent;
  return {
    paid: s.payment_status === "paid",
    paymentIntentId: pi ? (typeof pi === "string" ? pi : pi.id) : null,
    amountTotal: s.amount_total,
    currency: s.currency,
  };
}
