import { describe, expect, it } from "vitest";
import { evaluateCoupon, normalizeCouponCode, type CouponRecord } from "@/lib/coupons";

const base: CouponRecord = {
  id: "c1",
  code: "TEST",
  type: "PERCENTAGE",
  value: 10,
  maxDiscountCents: null,
  minOrderCents: 0,
  startsAt: null,
  expiresAt: null,
  usageLimit: null,
  perUserLimit: null,
  isActive: true,
};
const ctx = { subtotalCents: 50000, now: new Date("2026-06-01T00:00:00Z"), totalRedemptions: 0, customerRedemptions: 0 };

describe("evaluateCoupon", () => {
  it("accepts a valid coupon", () => expect(evaluateCoupon(base, ctx).ok).toBe(true));
  it("rejects inactive coupons", () => expect(evaluateCoupon({ ...base, isActive: false }, ctx).ok).toBe(false));
  it("rejects before start and after expiry", () => {
    expect(evaluateCoupon({ ...base, startsAt: new Date("2026-07-01") }, ctx).ok).toBe(false);
    expect(evaluateCoupon({ ...base, expiresAt: new Date("2026-05-01") }, ctx).ok).toBe(false);
  });
  it("enforces the minimum order", () => {
    expect(evaluateCoupon({ ...base, minOrderCents: 60000 }, ctx).ok).toBe(false);
    expect(evaluateCoupon({ ...base, minOrderCents: 50000 }, ctx).ok).toBe(true);
  });
  it("enforces total and per-customer limits", () => {
    expect(evaluateCoupon({ ...base, usageLimit: 5 }, { ...ctx, totalRedemptions: 5 }).ok).toBe(false);
    expect(evaluateCoupon({ ...base, usageLimit: 5 }, { ...ctx, totalRedemptions: 4 }).ok).toBe(true);
    expect(evaluateCoupon({ ...base, perUserLimit: 1 }, { ...ctx, customerRedemptions: 1 }).ok).toBe(false);
  });
});

describe("normalizeCouponCode", () => {
  it("uppercases and strips whitespace", () => expect(normalizeCouponCode("  welcome 10 ")).toBe("WELCOME10"));
});
