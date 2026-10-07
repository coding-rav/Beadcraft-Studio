import { commerceConfig, type DeliveryMethodKey } from "./config";
import type { TotalsDTO } from "./types";

export interface PricedLine {
  unitPriceCents: number;
  quantity: number;
}

export interface CouponRule {
  type: "PERCENTAGE" | "FIXED";
  /** PERCENTAGE: 1-100, FIXED: minor units */
  value: number;
  maxDiscountCents?: number | null;
}

export type PricingConfig = Pick<
  typeof commerceConfig,
  "standardShippingCents" | "expressShippingCents" | "freeShippingOverCents" | "taxRateBps" | "taxInclusive"
>;

export function computeDiscount(subtotalCents: number, coupon: CouponRule | null | undefined): number {
  if (!coupon || subtotalCents <= 0) return 0;
  let discount =
    coupon.type === "PERCENTAGE"
      ? Math.floor((subtotalCents * Math.min(Math.max(coupon.value, 0), 100)) / 100)
      : Math.max(coupon.value, 0);
  if (coupon.maxDiscountCents != null) discount = Math.min(discount, coupon.maxDiscountCents);
  return Math.min(discount, subtotalCents);
}

/**
 * The single source of truth for order totals. Always runs on the server with
 * prices read from the database — never with numbers sent by the browser.
 */
export function computeTotals(
  input: { lines: PricedLine[]; coupon?: CouponRule | null; delivery: DeliveryMethodKey },
  cfg: PricingConfig = commerceConfig,
): TotalsDTO {
  const subtotalCents = input.lines.reduce((sum, l) => sum + l.unitPriceCents * l.quantity, 0);
  const discountCents = computeDiscount(subtotalCents, input.coupon);
  const afterDiscount = subtotalCents - discountCents;

  let shippingCents = 0;
  if (subtotalCents > 0) {
    if (input.delivery === "EXPRESS") shippingCents = cfg.expressShippingCents;
    else shippingCents = afterDiscount >= cfg.freeShippingOverCents ? 0 : cfg.standardShippingCents;
  }

  const taxable = afterDiscount + shippingCents;
  const rate = cfg.taxRateBps / 10_000;
  let taxCents: number;
  let totalCents: number;
  if (cfg.taxInclusive) {
    taxCents = Math.round(taxable - taxable / (1 + rate)); // portion of the total that is tax
    totalCents = taxable;
  } else {
    taxCents = Math.round(taxable * rate);
    totalCents = taxable + taxCents;
  }

  const freeShippingRemainingCents =
    subtotalCents > 0 && input.delivery === "STANDARD" ? Math.max(cfg.freeShippingOverCents - afterDiscount, 0) : 0;

  return { subtotalCents, discountCents, shippingCents, taxCents, totalCents, freeShippingRemainingCents };
}
