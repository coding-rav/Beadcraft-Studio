import { db } from "./db";
import { formatMoney } from "./money";
import type { CouponRule } from "./pricing";

export interface CouponRecord extends CouponRule {
  id: string;
  code: string;
  minOrderCents: number;
  startsAt: Date | null;
  expiresAt: Date | null;
  usageLimit: number | null;
  perUserLimit: number | null;
  isActive: boolean;
}

export type CouponCheck = { ok: true } | { ok: false; message: string };

/** Pure rule evaluation (unit-tested). Database counts are passed in. */
export function evaluateCoupon(
  c: CouponRecord,
  ctx: { subtotalCents: number; now: Date; totalRedemptions: number; customerRedemptions: number },
): CouponCheck {
  if (!c.isActive) return { ok: false, message: "This code is no longer active." };
  if (c.startsAt && ctx.now < c.startsAt) return { ok: false, message: "This code isn't active yet." };
  if (c.expiresAt && ctx.now > c.expiresAt) return { ok: false, message: "This code has expired." };
  if (c.minOrderCents > 0 && ctx.subtotalCents < c.minOrderCents) {
    return { ok: false, message: `Spend ${formatMoney(c.minOrderCents)} or more to use this code.` };
  }
  if (c.usageLimit != null && ctx.totalRedemptions >= c.usageLimit) {
    return { ok: false, message: "This code has reached its usage limit." };
  }
  if (c.perUserLimit != null && ctx.customerRedemptions >= c.perUserLimit) {
    return { ok: false, message: "You've already used this code the maximum number of times." };
  }
  return { ok: true };
}

export function normalizeCouponCode(code: string): string {
  return code.trim().toUpperCase().replace(/\s+/g, "");
}

export interface CouponLookup {
  coupon: CouponRecord | null;
  check: CouponCheck;
}

/** Looks a code up and evaluates it against the current subtotal and customer. */
export async function lookupCoupon(
  rawCode: string,
  subtotalCents: number,
  who: { userId?: string | null; email?: string | null },
): Promise<CouponLookup> {
  const code = normalizeCouponCode(rawCode);
  if (!code) return { coupon: null, check: { ok: false, message: "Enter a code." } };
  const row = await db.coupon.findUnique({ where: { code } });
  if (!row) return { coupon: null, check: { ok: false, message: "That code isn't valid." } };

  const [totalRedemptions, customerRedemptions] = await Promise.all([
    row.usageLimit != null ? db.couponRedemption.count({ where: { couponId: row.id } }) : Promise.resolve(0),
    row.perUserLimit != null && (who.userId || who.email)
      ? db.couponRedemption.count({
          where: {
            couponId: row.id,
            OR: [
              ...(who.userId ? [{ userId: who.userId }] : []),
              ...(who.email ? [{ email: who.email.toLowerCase() }] : []),
            ],
          },
        })
      : Promise.resolve(0),
  ]);

  const coupon: CouponRecord = {
    id: row.id,
    code: row.code,
    type: row.type,
    value: row.value,
    maxDiscountCents: row.maxDiscountCents,
    minOrderCents: row.minOrderCents,
    startsAt: row.startsAt,
    expiresAt: row.expiresAt,
    usageLimit: row.usageLimit,
    perUserLimit: row.perUserLimit,
    isActive: row.isActive,
  };
  return { coupon, check: evaluateCoupon(coupon, { subtotalCents, now: new Date(), totalRedemptions, customerRedemptions }) };
}
