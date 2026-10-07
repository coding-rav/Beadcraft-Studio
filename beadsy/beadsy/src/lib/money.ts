import { siteConfig } from "./config";

const fmtWhole = new Intl.NumberFormat(siteConfig.locale, {
  style: "currency",
  currency: siteConfig.currency,
  maximumFractionDigits: 0,
});
const fmtFraction = new Intl.NumberFormat(siteConfig.locale, {
  style: "currency",
  currency: siteConfig.currency,
  minimumFractionDigits: 2,
});

/** Format minor units (paise) as a currency string, e.g. 49900 -> ₹499 */
export function formatMoney(cents: number): string {
  return cents % 100 === 0 ? fmtWhole.format(cents / 100) : fmtFraction.format(cents / 100);
}

/** Whole-percent discount between a list price and a sale price. */
export function discountPercent(priceCents: number, salePriceCents: number | null | undefined): number {
  if (!salePriceCents || salePriceCents >= priceCents || priceCents <= 0) return 0;
  return Math.round(((priceCents - salePriceCents) / priceCents) * 100);
}

/** Convert a rupee string/number typed in the admin to paise. Returns NaN when invalid. */
export function toCents(value: string | number): number {
  const n = typeof value === "number" ? value : Number(String(value).replace(/,/g, "").trim());
  if (!Number.isFinite(n) || n < 0) return NaN;
  return Math.round(n * 100);
}
