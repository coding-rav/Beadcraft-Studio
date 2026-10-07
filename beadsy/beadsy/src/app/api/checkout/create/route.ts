import { db } from "@/lib/db";
import { apiHandler, HttpError, json, readJson } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { commerceConfig, siteConfig } from "@/lib/config";
import { createCheckoutOrder, cancelPendingOrder } from "@/lib/orders";
import { configuredProviders } from "@/lib/payments/config";
import { createRazorpayOrder } from "@/lib/payments/razorpay";
import { createStripeCheckoutSession } from "@/lib/payments/stripe";
import { checkoutCreateSchema } from "@/lib/validation";

/**
 * Creates a PENDING order with server-calculated totals + reserved stock, then opens a
 * payment session with the chosen provider. The order is only marked PAID by a verified
 * provider callback (webhook / signature check) — never by this request.
 */
export const POST = apiHandler(
  async (req) => {
    const input = checkoutCreateSchema.parse(await readJson(req));
    const providers = configuredProviders();
    if (input.provider === "STRIPE" && !providers.stripe) {
      throw new HttpError(503, "Card payments aren't available right now. Please choose another method.", "PROVIDER_NOT_CONFIGURED");
    }
    if (input.provider === "RAZORPAY" && !providers.razorpay) {
      throw new HttpError(503, "UPI / Razorpay payments aren't available right now. Please choose another method.", "PROVIDER_NOT_CONFIGURED");
    }

    const session = await getSession();
    const order = await createCheckoutOrder({
      userId: session?.sub ?? null,
      items: input.items,
      couponCode: input.couponCode,
      delivery: input.delivery,
      customer: input.customer,
      address: input.address,
      notes: input.notes,
      provider: input.provider,
    });

    try {
      if (input.provider === "STRIPE") {
        const taxOnTop = commerceConfig.taxInclusive ? 0 : order.taxCents;
        const s = await createStripeCheckoutSession({
          orderId: order.id,
          orderNumber: order.number,
          accessToken: order.accessToken,
          email: order.email,
          currency: order.currency,
          items: order.items.map((i) => ({
            name: i.name,
            variantName: i.variantName,
            unitPriceCents: i.unitPriceCents,
            quantity: i.quantity,
            imageUrl: i.imageUrl,
          })),
          shippingCents: order.shippingCents,
          discountCents: order.discountCents,
          taxOnTopCents: taxOnTop,
        });
        await db.payment.create({
          data: { orderId: order.id, provider: "STRIPE", providerRef: s.id, amountCents: order.totalCents, currency: order.currency },
        });
        return json({ provider: "STRIPE", url: s.url, orderNumber: order.number }, { status: 201 });
      }

      const r = await createRazorpayOrder({
        orderId: order.id,
        orderNumber: order.number,
        amountCents: order.totalCents,
        currency: order.currency,
        email: order.email,
      });
      await db.payment.create({
        data: { orderId: order.id, provider: "RAZORPAY", providerRef: r.id, amountCents: order.totalCents, currency: order.currency },
      });
      return json(
        {
          provider: "RAZORPAY",
          orderNumber: order.number,
          accessToken: order.accessToken,
          razorpay: {
            keyId: r.keyId,
            orderId: r.id,
            amount: order.totalCents,
            currency: order.currency,
            name: siteConfig.name,
            description: `Order ${order.number}`,
            prefill: { email: order.email, contact: order.phone ?? "" },
          },
        },
        { status: 201 },
      );
    } catch (err) {
      // Never leave stock locked behind a payment session that failed to open.
      await cancelPendingOrder(order.id, "Payment session could not be created");
      throw err;
    }
  },
  { rateLimit: { name: "checkout-create", max: 15, windowMs: 10 * 60_000 } },
);
