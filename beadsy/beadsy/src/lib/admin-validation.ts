import { z } from "zod";

const rupees = z.number().finite().min(0).max(10_000_000);
const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Use a hex colour like #F58FB0");

export const variantInputSchema = z.object({
  id: z.string().min(1).max(40).optional(),
  name: z.string().trim().min(1).max(60),
  sku: z.string().trim().min(2).max(40).regex(/^[A-Za-z0-9._-]+$/, "SKU may only contain letters, numbers, . _ -"),
  color: z.string().trim().max(30).optional().nullable(),
  priceOverride: rupees.optional().nullable(),
  quantity: z.number().int().min(0).max(1_000_000),
  lowStockThreshold: z.number().int().min(0).max(100_000).default(5),
  isActive: z.boolean().default(true),
});

export const productInputSchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    slug: z.string().trim().max(100).regex(/^[a-z0-9-]*$/, "Slug may only contain lowercase letters, numbers and dashes").optional(),
    shortDescription: z.string().trim().min(5).max(220),
    description: z.string().trim().min(10).max(5000),
    categoryId: z.string().min(1).max(40),
    price: rupees.refine((n) => n > 0, "Price must be above 0"),
    salePrice: rupees.optional().nullable(),
    sku: z.string().trim().min(2).max(40).regex(/^[A-Za-z0-9._-]+$/, "SKU may only contain letters, numbers, . _ -"),
    tags: z.array(z.string().trim().toLowerCase().min(1).max(30)).max(20).default([]),
    colors: z.array(z.string().trim().toLowerCase().min(1).max(20)).max(10).default([]),
    palette: z.array(hex).max(8).default([]),
    artKind: z.enum(["bracelet", "necklace", "keychain", "charm", "anklet", "giftset"]).default("bracelet"),
    material: z.string().trim().max(200).optional().nullable(),
    dimensions: z.string().trim().max(200).optional().nullable(),
    care: z.string().trim().max(500).optional().nullable(),
    isActive: z.boolean().default(true),
    isFeatured: z.boolean().default(false),
    images: z
      .array(
        z.object({
          url: z.string().trim().max(500).refine((u) => /^https:\/\//i.test(u) || u.startsWith("/"), "Image URLs must start with https:// or /"),
          alt: z.string().trim().max(160).default(""),
        }),
      )
      .max(10)
      .default([]),
    variants: z.array(variantInputSchema).min(1, "Add at least one variant").max(30),
  })
  .superRefine((p, ctx) => {
    if (p.salePrice != null && p.salePrice >= p.price) ctx.addIssue({ code: "custom", path: ["salePrice"], message: "Sale price must be lower than the price" });
    const skus = new Set<string>();
    p.variants.forEach((v, i) => {
      const k = v.sku.toLowerCase();
      if (skus.has(k)) ctx.addIssue({ code: "custom", path: ["variants", i, "sku"], message: "Duplicate SKU" });
      skus.add(k);
    });
  });
export type ProductInput = z.infer<typeof productInputSchema>;

export const categoryInputSchema = z.object({
  name: z.string().trim().min(2).max(60),
  slug: z.string().trim().max(60).regex(/^[a-z0-9-]*$/).optional(),
  description: z.string().trim().max(300).optional().nullable(),
  sortOrder: z.number().int().min(0).max(1000).default(0),
});

export const couponInputSchema = z
  .object({
    code: z.string().trim().min(3).max(30).regex(/^[A-Za-z0-9_-]+$/, "Letters, numbers, - and _ only"),
    description: z.string().trim().max(200).optional().nullable(),
    type: z.enum(["PERCENTAGE", "FIXED"]),
    value: z.number().min(0.01).max(10_000_000),
    maxDiscount: rupees.optional().nullable(),
    minOrder: rupees.default(0),
    startsAt: z.string().datetime().optional().nullable(),
    expiresAt: z.string().datetime().optional().nullable(),
    usageLimit: z.number().int().min(1).max(1_000_000).optional().nullable(),
    perUserLimit: z.number().int().min(1).max(1000).optional().nullable(),
    isActive: z.boolean().default(true),
  })
  .superRefine((c, ctx) => {
    if (c.type === "PERCENTAGE" && (c.value > 100 || !Number.isInteger(c.value))) ctx.addIssue({ code: "custom", path: ["value"], message: "Percentage must be a whole number between 1 and 100" });
    if (c.startsAt && c.expiresAt && new Date(c.expiresAt) <= new Date(c.startsAt)) ctx.addIssue({ code: "custom", path: ["expiresAt"], message: "Expiry must be after the start" });
  });

export const orderUpdateSchema = z.object({
  status: z.enum(["PENDING", "PAID", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED"]).optional(),
  trackingNumber: z.string().trim().max(80).optional().nullable(),
  internalNote: z.string().trim().max(1000).optional().nullable(),
  restock: z.boolean().optional(),
});

export const inventoryUpdateSchema = z.object({
  quantity: z.number().int().min(0).max(1_000_000),
  lowStockThreshold: z.number().int().min(0).max(100_000),
});

export const reviewModerationSchema = z.object({ status: z.enum(["PENDING", "APPROVED", "REJECTED"]) });
