export type ArtKind = "bracelet" | "necklace" | "keychain" | "charm" | "anklet" | "giftset";

/** One product picture: either a real photo URL or generated bead artwork. */
export interface VisualDTO {
  url: string | null;
  alt: string;
  palette: string[];
  kind: ArtKind;
  seed: number;
}

export interface VariantDTO {
  id: string;
  name: string;
  color: string | null;
  priceCents: number;
  available: number;
}

export interface ProductCardDTO {
  id: string;
  slug: string;
  name: string;
  shortDescription: string;
  categorySlug: string;
  categoryName: string;
  priceCents: number;
  salePriceCents: number | null;
  rating: number;
  reviewCount: number;
  inStock: boolean;
  lowStock: boolean;
  isNew: boolean;
  defaultVariantId: string | null;
  variants: VariantDTO[];
  images: VisualDTO[];
}

export interface CartLineInput {
  variantId: string;
  quantity: number;
}

export type CartIssue = "NOT_FOUND" | "UNAVAILABLE" | "OUT_OF_STOCK" | "LIMITED";

export interface CartLineDTO {
  variantId: string;
  productId: string;
  slug: string;
  name: string;
  variantName: string | null;
  sku: string;
  unitPriceCents: number;
  compareAtCents: number | null;
  /** quantity the customer asked for */
  requestedQuantity: number;
  /** quantity that can actually be bought (0 when unavailable) */
  quantity: number;
  maxQuantity: number;
  issue: CartIssue | null;
  image: VisualDTO;
}

export interface TotalsDTO {
  subtotalCents: number;
  discountCents: number;
  shippingCents: number;
  taxCents: number;
  totalCents: number;
  freeShippingRemainingCents: number;
}

export interface CartValidationDTO {
  lines: CartLineDTO[];
  removedVariantIds: string[];
  totals: TotalsDTO;
  coupon: { code: string; valid: boolean; message: string } | null;
  delivery: { method: "STANDARD" | "EXPRESS"; label: string; earliest: string; latest: string };
  providers: { stripe: boolean; razorpay: boolean };
}

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: "CUSTOMER" | "ADMIN";
}
