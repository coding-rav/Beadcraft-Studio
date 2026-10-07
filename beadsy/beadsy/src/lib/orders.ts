import { Prisma, type PaymentProvider, type OrderStatus } from "@prisma/client";
import { db } from "./db";
import { HttpError } from "./api";
import { commerceConfig, siteConfig, type DeliveryMethodKey } from "./config";
import { resolveLines } from "./cart";
import { evaluateCoupon, lookupCoupon, type CouponRecord } from "./coupons";
import { commitStock, refreshProductStock, releaseStock, reserveStock } from "./inventory";
import { newAccessToken, newOrderNumber } from "./ids";
import { formatMoney } from "./money";
import { computeTotals } from "./pricing";
import { emailShell, escapeHtml, sendEmail } from "./email";
import { normalizeEmail } from "./utils";
import type { AddressInput } from "./validation";
import type { CartLineInput } from "./types";

export interface CreateOrderInput {
  userId: string | null;
  items: CartLineInput[];
  couponCode?: string;
  delivery: DeliveryMethodKey;
  customer: { email: string; phone: string };
  address: AddressInput;
  notes?: string;
  provider: PaymentProvider;
}

async function lockRow(tx: Prisma.TransactionClient, table: "Order" | "Coupon", id: string) {
  if (table === "Order") await tx.$queryRaw`SELECT "id" FROM "Order" WHERE "id" = ${id} FOR UPDATE`;
  else await tx.$queryRaw`SELECT "id" FROM "Coupon" WHERE "id" = ${id} FOR UPDATE`;
}

/**
 * Creates a PENDING order. Prices, discounts, shipping, tax and totals are all computed
 * here from database values — the browser only supplies variant ids and quantities.
 * Stock is reserved atomically inside the same transaction.
 */
export async function createCheckoutOrder(input: CreateOrderInput) {
  const email = normalizeEmail(input.customer.email);

  const { lines, removedVariantIds } = await resolveLines(input.items);
  if (removedVariantIds.length || !lines.length || lines.some((l) => l.issue)) {
    throw new HttpError(409, "Some items in your cart changed. Please review your cart and try again.", "CART_CHANGED", {
      variantIds: [...removedVariantIds, ...lines.filter((l) => l.issue).map((l) => l.variantId)],
    });
  }

  const subtotal = lines.reduce((s, l) => s + l.unitPriceCents * l.quantity, 0);

  let coupon: CouponRecord | null = null;
  if (input.couponCode?.trim()) {
    const res = await lookupCoupon(input.couponCode, subtotal, { userId: input.userId, email });
    if (!res.check.ok || !res.coupon) {
      throw new HttpError(400, res.check.ok ? "That code can't be used." : res.check.message, "COUPON_INVALID");
    }
    coupon = res.coupon;
  }

  const totals = computeTotals({
    lines: lines.map((l) => ({ unitPriceCents: l.unitPriceCents, quantity: l.quantity })),
    coupon,
    delivery: input.delivery,
  });

  const attempt = async () =>
    db.$transaction(
      async (tx) => {
        if (coupon) {
          await lockRow(tx, "Coupon", coupon.id);
          const [total, mine] = await Promise.all([
            tx.couponRedemption.count({ where: { couponId: coupon.id } }),
            tx.couponRedemption.count({
              where: {
                couponId: coupon.id,
                OR: [...(input.userId ? [{ userId: input.userId }] : []), { email }],
              },
            }),
          ]);
          const check = evaluateCoupon(coupon, { subtotalCents: subtotal, now: new Date(), totalRedemptions: total, customerRedemptions: mine });
          if (!check.ok) throw new HttpError(400, check.message, "COUPON_INVALID");
        }

        await reserveStock(tx, lines.map((l) => ({ variantId: l.variantId, quantity: l.quantity })));

        const order = await tx.order.create({
          data: {
            number: newOrderNumber(),
            accessToken: newAccessToken(),
            userId: input.userId,
            email,
            phone: input.customer.phone,
            status: "PENDING",
            deliveryMethod: input.delivery,
            subtotalCents: totals.subtotalCents,
            discountCents: totals.discountCents,
            shippingCents: totals.shippingCents,
            taxCents: totals.taxCents,
            totalCents: totals.totalCents,
            currency: siteConfig.currency,
            couponCode: coupon?.code ?? null,
            shippingAddress: JSON.parse(JSON.stringify(input.address)) as Prisma.InputJsonObject,
            notes: input.notes || null,
            reservedUntil: new Date(Date.now() + commerceConfig.reservationMinutes * 60_000),
            items: {
              create: lines.map((l) => ({
                productId: l.productId,
                variantId: l.variantId,
                name: l.name,
                variantName: l.variantName,
                sku: l.sku,
                unitPriceCents: l.unitPriceCents,
                quantity: l.quantity,
                imageUrl: l.imageUrl,
              })),
            },
          },
          include: { items: true },
        });

        if (coupon) {
          await tx.couponRedemption.create({
            data: { couponId: coupon.id, orderId: order.id, userId: input.userId, email },
          });
        }
        await refreshProductStock(tx, lines.map((l) => l.productId));
        return order;
      },
      { timeout: 15_000, maxWait: 10_000 },
    );

  for (let tries = 0; ; tries++) {
    try {
      return await attempt();
    } catch (err) {
      if (err instanceof HttpError && err.code === "OUT_OF_STOCK" && tries === 0) {
        // Unpaid orders may be holding stock past their expiry — free them once and retry.
        await expireStaleOrders(25);
        continue;
      }
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002" && tries < 2) continue; // order number collision
      throw err;
    }
  }
}

/** Cancels an UNPAID order and returns its reserved stock. Safe to call repeatedly. */
export async function cancelPendingOrder(orderId: string, reason: string): Promise<boolean> {
  return db.$transaction(async (tx) => {
    await lockRow(tx, "Order", orderId);
    const order = await tx.order.findUnique({ where: { id: orderId }, include: { items: true } });
    if (!order || order.status !== "PENDING") return false;

    if (!order.reservationReleased) {
      const stockLines = order.items
        .filter((i) => i.variantId)
        .map((i) => ({ variantId: i.variantId!, quantity: i.quantity }));
      await releaseStock(tx, stockLines);
      await refreshProductStock(tx, order.items.map((i) => i.productId).filter((x): x is string => Boolean(x)));
    }
    await tx.couponRedemption.deleteMany({ where: { orderId } });
    await tx.payment.updateMany({ where: { orderId, status: "PENDING" }, data: { status: "CANCELLED", failureReason: reason.slice(0, 200) } });
    await tx.order.update({
      where: { id: orderId },
      data: { status: "CANCELLED", reservationReleased: true, reservedUntil: null },
    });
    return true;
  });
}

export async function expireStaleOrders(limit = 100): Promise<number> {
  const stale = await db.order.findMany({
    where: { status: "PENDING", reservedUntil: { lt: new Date() } },
    select: { id: true },
    take: limit,
  });
  let n = 0;
  for (const o of stale) if (await cancelPendingOrder(o.id, "Reservation expired")) n++;
  return n;
}

export type PaidResult = "paid" | "already" | "not_found" | "amount_mismatch";

/**
 * Idempotent: marks the order paid, commits stock, records the payment.
 * Safe to call from both the browser-return verification and the webhook.
 */
export async function markOrderPaid(opts: {
  provider: PaymentProvider;
  providerRef: string;
  providerPaymentId?: string | null;
  amountPaidCents?: number | null;
  currency?: string | null;
}): Promise<{ result: PaidResult; orderId?: string }> {
  const payment = await db.payment.findUnique({
    where: { provider_providerRef: { provider: opts.provider, providerRef: opts.providerRef } },
  });
  if (!payment) return { result: "not_found" };

  const outcome = await db.$transaction(
    async (tx) => {
      await lockRow(tx, "Order", payment.orderId);
      const order = await tx.order.findUnique({ where: { id: payment.orderId }, include: { items: true } });
      if (!order) return "not_found" as const;
      if (order.status !== "PENDING" && order.status !== "CANCELLED") {
        await tx.payment.updateMany({
          where: { id: payment.id, status: { not: "REFUNDED" } },
          data: { status: "SUCCEEDED", providerPaymentId: opts.providerPaymentId ?? undefined },
        });
        return "already" as const;
      }

      const mismatch =
        (opts.amountPaidCents != null && opts.amountPaidCents !== order.totalCents) ||
        (opts.currency != null && opts.currency.toUpperCase() !== order.currency.toUpperCase());
      if (mismatch) {
        await tx.order.update({
          where: { id: order.id },
          data: { internalNote: `PAYMENT AMOUNT MISMATCH: received ${opts.amountPaidCents} ${opts.currency}, expected ${order.totalCents} ${order.currency}. Not fulfilled — investigate / refund.` },
        });
        await tx.payment.update({ where: { id: payment.id }, data: { providerPaymentId: opts.providerPaymentId ?? undefined, failureReason: "Amount mismatch" } });
        return "amount_mismatch" as const;
      }

      const stockLines = order.items.filter((i) => i.variantId).map((i) => ({ variantId: i.variantId!, quantity: i.quantity }));
      const shortfalls = await commitStock(tx, stockLines, order.reservationReleased);

      // The order may have been cancelled/expired before the money arrived: restore the coupon redemption.
      if (order.status === "CANCELLED" && order.couponCode) {
        const coupon = await tx.coupon.findUnique({ where: { code: order.couponCode }, select: { id: true } });
        if (coupon) {
          await tx.couponRedemption.createMany({
            data: [{ couponId: coupon.id, orderId: order.id, userId: order.userId, email: order.email }],
            skipDuplicates: true,
          });
        }
      }

      for (const item of order.items) {
        if (item.productId) {
          await tx.product.update({ where: { id: item.productId }, data: { soldCount: { increment: item.quantity } } });
        }
      }
      await refreshProductStock(tx, order.items.map((i) => i.productId).filter((x): x is string => Boolean(x)));

      await tx.order.update({
        where: { id: order.id },
        data: {
          status: "PAID",
          paidAt: new Date(),
          reservedUntil: null,
          reservationReleased: false,
          internalNote: shortfalls.length
            ? `STOCK SHORTFALL after payment (variants: ${shortfalls.join(", ")}). Restock or refund.`
            : order.internalNote,
        },
      });
      await tx.payment.update({
        where: { id: payment.id },
        data: { status: "SUCCEEDED", providerPaymentId: opts.providerPaymentId ?? undefined, failureReason: null },
      });
      return "paid" as const;
    },
    { timeout: 15_000, maxWait: 10_000 },
  );

  if (outcome === "paid") await sendOrderConfirmation(payment.orderId);
  return { result: outcome, orderId: payment.orderId };
}

/** Records a (possibly retriable) payment failure without cancelling the order. */
export async function recordPaymentFailure(provider: PaymentProvider, providerRef: string, reason: string) {
  await db.payment.updateMany({
    where: { provider, providerRef, status: { in: ["PENDING", "FAILED"] } },
    data: { status: "FAILED", failureReason: reason.slice(0, 200) },
  });
}

/** Final failure (expired / async payment failed): cancel the order and free the stock. */
export async function failPaymentAndCancel(provider: PaymentProvider, providerRef: string, reason: string) {
  const payment = await db.payment.findUnique({ where: { provider_providerRef: { provider, providerRef } } });
  if (!payment) return;
  if (payment.status === "SUCCEEDED") return;
  await cancelPendingOrder(payment.orderId, reason);
  await db.payment.updateMany({ where: { id: payment.id, status: { not: "SUCCEEDED" } }, data: { status: "CANCELLED", failureReason: reason.slice(0, 200) } });
}

export async function markPaymentRefunded(provider: PaymentProvider, providerPaymentId: string) {
  const payment = await db.payment.findFirst({ where: { provider, providerPaymentId } });
  if (!payment) return false;
  await db.$transaction(async (tx) => {
    await tx.payment.update({ where: { id: payment.id }, data: { status: "REFUNDED" } });
    await tx.order.updateMany({
      where: { id: payment.orderId, status: { in: ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"] } },
      data: { status: "REFUNDED" },
    });
  });
  return true;
}

export const ORDER_STATUS_FLOW: OrderStatus[] = ["PENDING", "PAID", "PROCESSING", "SHIPPED", "DELIVERED"];

export async function sendOrderConfirmation(orderId: string): Promise<void> {
  const order = await db.order.findUnique({ where: { id: orderId }, include: { items: true } });
  if (!order) return;
  const rows = order.items
    .map(
      (i) =>
        `<tr><td style="padding:6px 0">${escapeHtml(i.name)}${i.variantName ? ` — ${escapeHtml(i.variantName)}` : ""} × ${i.quantity}</td><td style="text-align:right">${formatMoney(i.unitPriceCents * i.quantity)}</td></tr>`,
    )
    .join("");
  const link = `${siteConfig.url}/checkout/success?o=${encodeURIComponent(order.number)}&t=${encodeURIComponent(order.accessToken)}`;
  await sendEmail({
    to: order.email,
    subject: `Your Beadsy order ${order.number} is confirmed`,
    text: `Thanks for your order ${order.number}! Total ${formatMoney(order.totalCents)}. View it: ${link}`,
    html: emailShell(
      `Thank you! Order ${order.number} is confirmed`,
      `<table style="width:100%;font-size:14px">${rows}</table>
       <p style="font-size:14px">Total paid: <strong>${formatMoney(order.totalCents)}</strong></p>
       <p><a href="${link}" style="color:#6B4A82">View your order</a></p>`,
    ),
  });
}
