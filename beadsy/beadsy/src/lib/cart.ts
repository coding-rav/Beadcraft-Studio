import { db } from "./db";
import { commerceConfig, type DeliveryMethodKey } from "./config";
import { toVisuals, variantAvailable } from "./catalog";
import { lookupCoupon, type CouponRecord } from "./coupons";
import { computeTotals } from "./pricing";
import { configuredProviders } from "./payments/config";
import { addBusinessDays } from "./utils";
import type { CartIssue, CartLineDTO, CartLineInput, CartValidationDTO } from "./types";

export interface ResolvedLine extends CartLineDTO {
  imageUrl: string | null;
}

/** Merge duplicate variant ids and clamp quantities. */
export function normalizeItems(items: CartLineInput[]): CartLineInput[] {
  const map = new Map<string, number>();
  for (const i of items) {
    map.set(i.variantId, Math.min((map.get(i.variantId) ?? 0) + i.quantity, commerceConfig.maxQuantityPerLine));
  }
  return [...map.entries()].map(([variantId, quantity]) => ({ variantId, quantity }));
}

/**
 * Reads authoritative prices and stock from the database for the requested variants.
 * This is used by BOTH the cart preview and order creation so they can never disagree.
 */
export async function resolveLines(
  rawItems: CartLineInput[],
): Promise<{ lines: ResolvedLine[]; removedVariantIds: string[] }> {
  const items = normalizeItems(rawItems);
  if (!items.length) return { lines: [], removedVariantIds: [] };

  const variants = await db.productVariant.findMany({
    where: { id: { in: items.map((i) => i.variantId) } },
    include: {
      inventory: true,
      product: { include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } } },
    },
  });
  const byId = new Map(variants.map((v) => [v.id, v]));

  const lines: ResolvedLine[] = [];
  const removedVariantIds: string[] = [];

  for (const item of items) {
    const v = byId.get(item.variantId);
    if (!v) {
      removedVariantIds.push(item.variantId);
      continue;
    }
    const p = v.product;
    const available = variantAvailable(v);
    const unitPriceCents = v.priceCents ?? p.currentPriceCents;
    const compareAtCents = unitPriceCents < p.priceCents ? p.priceCents : null;
    const maxQuantity = Math.min(available, commerceConfig.maxQuantityPerLine);

    let issue: CartIssue | null = null;
    let quantity = item.quantity;
    if (!p.isActive || !v.isActive) {
      issue = "UNAVAILABLE";
      quantity = 0;
    } else if (available <= 0) {
      issue = "OUT_OF_STOCK";
      quantity = 0;
    } else if (item.quantity > maxQuantity) {
      issue = "LIMITED";
      quantity = maxQuantity;
    }

    const visual = toVisuals({
      id: p.id,
      name: p.name,
      palette: p.palette,
      artKind: p.artKind,
      images: p.images.map((i) => ({ url: i.url, alt: i.alt })),
    })[0]!;

    lines.push({
      variantId: v.id,
      productId: p.id,
      slug: p.slug,
      name: p.name,
      variantName: v.name === "Standard" ? null : v.name,
      sku: v.sku,
      unitPriceCents,
      compareAtCents,
      requestedQuantity: item.quantity,
      quantity,
      maxQuantity,
      issue,
      image: visual,
      imageUrl: visual.url,
    });
  }
  return { lines, removedVariantIds };
}

export async function validateCart(input: {
  items: CartLineInput[];
  couponCode?: string;
  delivery: DeliveryMethodKey;
  userId?: string | null;
  email?: string | null;
}): Promise<CartValidationDTO & { coupon: CartValidationDTO["coupon"]; couponRecord: CouponRecord | null }> {
  const { lines, removedVariantIds } = await resolveLines(input.items);
  const purchasable = lines.filter((l) => l.quantity > 0);
  const subtotal = purchasable.reduce((s, l) => s + l.unitPriceCents * l.quantity, 0);

  let couponRecord: CouponRecord | null = null;
  let couponInfo: CartValidationDTO["coupon"] = null;
  if (input.couponCode && input.couponCode.trim()) {
    const { coupon, check } = await lookupCoupon(input.couponCode, subtotal, {
      userId: input.userId,
      email: input.email,
    });
    if (check.ok && coupon) {
      couponRecord = coupon;
      couponInfo = { code: coupon.code, valid: true, message: "Code applied 🎉" };
    } else {
      couponInfo = {
        code: input.couponCode.trim().toUpperCase(),
        valid: false,
        message: check.ok ? "That code can't be used right now." : check.message,
      };
    }
  }

  const totals = computeTotals({
    lines: purchasable.map((l) => ({ unitPriceCents: l.unitPriceCents, quantity: l.quantity })),
    coupon: couponRecord,
    delivery: input.delivery,
  });

  const est = commerceConfig.deliveryEstimates[input.delivery];
  const now = new Date();
  return {
    lines,
    removedVariantIds,
    totals,
    coupon: couponInfo,
    couponRecord,
    delivery: {
      method: input.delivery,
      label: est.label,
      earliest: addBusinessDays(now, est.minDays).toISOString(),
      latest: addBusinessDays(now, est.maxDays).toISOString(),
    },
    providers: configuredProviders(),
  };
}
