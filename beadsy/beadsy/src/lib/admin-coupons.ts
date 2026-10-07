import { toCents } from "./money";
import type { z } from "zod";
import type { couponInputSchema } from "./admin-validation";

type CouponInput = z.infer<typeof couponInputSchema>;

/** Converts admin form values (rupees) to stored values (paise) and normalises the code. */
export function couponData(input: CouponInput) {
  return {
    code: input.code.trim().toUpperCase(),
    description: input.description || null,
    type: input.type,
    value: input.type === "PERCENTAGE" ? Math.round(input.value) : toCents(input.value),
    maxDiscountCents: input.maxDiscount != null ? toCents(input.maxDiscount) : null,
    minOrderCents: toCents(input.minOrder),
    startsAt: input.startsAt ? new Date(input.startsAt) : null,
    expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
    usageLimit: input.usageLimit ?? null,
    perUserLimit: input.perUserLimit ?? null,
    isActive: input.isActive,
  };
}
