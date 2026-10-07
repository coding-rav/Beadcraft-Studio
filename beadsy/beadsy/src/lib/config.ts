/**
 * Central store configuration. Change shipping, tax and currency here.
 * All money values are integer minor units (paise).
 */
export const siteConfig = {
  name: "Beadsy",
  tagline: "Small Beads. Big Vibes.",
  description:
    "Handpicked beads, beautiful designs, and little things made to brighten your day. Shop bracelets, necklaces, keychains, charms and gift sets from Beadsy.",
  url: (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, ""),
  currency: "INR",
  locale: "en-IN",
  contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL || "",
  instagramUrl: process.env.NEXT_PUBLIC_INSTAGRAM_URL || "",
} as const;

export const commerceConfig = {
  /** Flat shipping rates in paise */
  standardShippingCents: 4900,
  expressShippingCents: 9900,
  /** Standard shipping is free when the discounted subtotal reaches this amount */
  freeShippingOverCents: 49900,
  /** GST rate in basis points (300 = 3%). Set taxInclusive=false to add tax on top. */
  taxRateBps: 300,
  taxInclusive: true,
  /** Max units of one variant per order line */
  maxQuantityPerLine: 10,
  /** Max distinct lines in a cart */
  maxCartLines: 30,
  /** Minutes stock is held for an unpaid order */
  reservationMinutes: 35,
  lowStockThreshold: 5,
  deliveryEstimates: {
    STANDARD: { minDays: 4, maxDays: 7, label: "Standard delivery" },
    EXPRESS: { minDays: 2, maxDays: 3, label: "Express delivery" },
  },
} as const;

export type DeliveryMethodKey = "STANDARD" | "EXPRESS";

export const NAV_LINKS = [
  { href: "/shop", label: "Shop" },
  { href: "/shop/bracelets", label: "Bracelets" },
  { href: "/shop/necklaces", label: "Necklaces" },
  { href: "/shop/keychains", label: "Keychains" },
  { href: "/shop/gift-sets", label: "Gift sets" },
  { href: "/about", label: "Our story" },
] as const;
