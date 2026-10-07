import { describe, expect, it } from "vitest";
import { computeDiscount, computeTotals, type PricingConfig } from "@/lib/pricing";

const cfg: PricingConfig = {
  standardShippingCents: 4900,
  expressShippingCents: 9900,
  freeShippingOverCents: 49900,
  taxRateBps: 300,
  taxInclusive: true,
};

describe("computeDiscount", () => {
  it("returns 0 without a coupon or on an empty cart", () => {
    expect(computeDiscount(10000, null)).toBe(0);
    expect(computeDiscount(0, { type: "FIXED", value: 500 })).toBe(0);
  });
  it("floors percentage discounts and honours the cap", () => {
    expect(computeDiscount(9999, { type: "PERCENTAGE", value: 10 })).toBe(999);
    expect(computeDiscount(100000, { type: "PERCENTAGE", value: 50, maxDiscountCents: 20000 })).toBe(20000);
  });
  it("never discounts more than the subtotal", () => {
    expect(computeDiscount(3000, { type: "FIXED", value: 5000 })).toBe(3000);
    expect(computeDiscount(3000, { type: "PERCENTAGE", value: 500 })).toBe(3000);
  });
});

describe("computeTotals", () => {
  it("charges standard shipping under the free threshold", () => {
    const t = computeTotals({ lines: [{ unitPriceCents: 10000, quantity: 2 }], delivery: "STANDARD" }, cfg);
    expect(t.subtotalCents).toBe(20000);
    expect(t.shippingCents).toBe(4900);
    expect(t.totalCents).toBe(24900);
    expect(t.freeShippingRemainingCents).toBe(29900);
  });
  it("gives free standard shipping at the threshold", () => {
    const t = computeTotals({ lines: [{ unitPriceCents: 49900, quantity: 1 }], delivery: "STANDARD" }, cfg);
    expect(t.shippingCents).toBe(0);
    expect(t.freeShippingRemainingCents).toBe(0);
  });
  it("evaluates free shipping after the discount", () => {
    const t = computeTotals(
      { lines: [{ unitPriceCents: 50000, quantity: 1 }], coupon: { type: "PERCENTAGE", value: 10 }, delivery: "STANDARD" },
      cfg,
    );
    expect(t.discountCents).toBe(5000);
    expect(t.shippingCents).toBe(4900); // 45000 < 49900, so not free once the discount applies
  });
  it("always charges express shipping", () => {
    const t = computeTotals({ lines: [{ unitPriceCents: 90000, quantity: 1 }], delivery: "EXPRESS" }, cfg);
    expect(t.shippingCents).toBe(9900);
  });
  it("treats GST as inclusive (tax is part of the total)", () => {
    const t = computeTotals({ lines: [{ unitPriceCents: 10300, quantity: 1 }], delivery: "EXPRESS" }, cfg);
    expect(t.totalCents).toBe(10300 + 9900);
    expect(t.taxCents).toBe(Math.round(20200 - 20200 / 1.03));
  });
  it("adds tax on top when exclusive", () => {
    const t = computeTotals({ lines: [{ unitPriceCents: 10000, quantity: 1 }], delivery: "EXPRESS" }, { ...cfg, taxInclusive: false });
    expect(t.taxCents).toBe(Math.round(19900 * 0.03));
    expect(t.totalCents).toBe(19900 + t.taxCents);
  });
  it("returns zeros for an empty cart", () => {
    const t = computeTotals({ lines: [], delivery: "STANDARD" }, cfg);
    expect(t.totalCents).toBe(0);
    expect(t.shippingCents).toBe(0);
  });
});
