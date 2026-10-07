import type { Prisma } from "@prisma/client";
import { db } from "./db";
import { commerceConfig } from "./config";
import type { ArtKind, ProductCardDTO, VisualDTO } from "./types";

export const DEFAULT_PALETTE = ["#F58FB0", "#F8D26B", "#9B79AE", "#98C99A", "#E8837F"];
const ART_KINDS: ArtKind[] = ["bracelet", "necklace", "keychain", "charm", "anklet", "giftset"];

export function asArtKind(v: string): ArtKind {
  return (ART_KINDS as string[]).includes(v) ? (v as ArtKind) : "bracelet";
}

export function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h) % 100000;
}

export const cardInclude = {
  category: { select: { slug: true, name: true } },
  images: { orderBy: { sortOrder: "asc" as const }, take: 4 },
  variants: {
    where: { isActive: true },
    orderBy: { sortOrder: "asc" as const },
    include: { inventory: true },
  },
} satisfies Prisma.ProductInclude;

export type ProductWithCard = Prisma.ProductGetPayload<{ include: typeof cardInclude }>;

export function toVisuals(p: {
  id: string;
  name: string;
  palette: string[];
  artKind: string;
  images: { url: string; alt: string }[];
}): VisualDTO[] {
  const kind = asArtKind(p.artKind);
  const palette = p.palette.length ? p.palette : DEFAULT_PALETTE;
  const seed = hashSeed(p.id);
  if (p.images.length > 0) {
    return p.images.map((i) => ({ url: i.url, alt: i.alt || p.name, palette, kind, seed }));
  }
  return [0, 1].map((n) => ({
    url: null,
    alt: `${p.name} — handmade bead design`,
    palette,
    kind,
    seed: seed + n * 13,
  }));
}

export function variantAvailable(v: { inventory: { quantity: number; reserved: number } | null }): number {
  return v.inventory ? Math.max(v.inventory.quantity - v.inventory.reserved, 0) : 0;
}

export function toCard(p: ProductWithCard): ProductCardDTO {
  const variants = p.variants.map((v) => ({
    id: v.id,
    name: v.name,
    color: v.color,
    priceCents: v.priceCents ?? p.currentPriceCents,
    available: variantAvailable(v),
  }));
  const totalAvailable = variants.reduce((s, v) => s + v.available, 0);
  const firstAvailable = variants.find((v) => v.available > 0) ?? variants[0] ?? null;
  const sale = p.salePriceCents != null && p.salePriceCents < p.priceCents ? p.salePriceCents : null;
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    shortDescription: p.shortDescription,
    categorySlug: p.category.slug,
    categoryName: p.category.name,
    priceCents: p.priceCents,
    salePriceCents: sale,
    rating: p.avgRating,
    reviewCount: p.reviewCount,
    inStock: totalAvailable > 0,
    lowStock: totalAvailable > 0 && totalAvailable <= commerceConfig.lowStockThreshold,
    isNew: Date.now() - p.createdAt.getTime() < 1000 * 60 * 60 * 24 * 30,
    defaultVariantId: firstAvailable?.id ?? null,
    variants,
    images: toVisuals(p),
  };
}

export type ShopSort = "featured" | "newest" | "price-asc" | "price-desc" | "best" | "rating";

export interface ShopQuery {
  category?: string;
  q?: string;
  min?: number;
  max?: number;
  colors?: string[];
  inStockOnly?: boolean;
  sort?: ShopSort;
  page?: number;
  pageSize?: number;
  featured?: boolean;
}

export const PAGE_SIZE = 12;

function buildWhere(q: ShopQuery): Prisma.ProductWhereInput {
  const and: Prisma.ProductWhereInput[] = [{ isActive: true }];
  if (q.category) and.push({ category: { slug: q.category } });
  if (q.featured) and.push({ isFeatured: true });
  if (q.min != null || q.max != null) {
    and.push({
      currentPriceCents: {
        ...(q.min != null ? { gte: q.min } : {}),
        ...(q.max != null ? { lte: q.max } : {}),
      },
    });
  }
  if (q.colors?.length) and.push({ colors: { hasSome: q.colors.map((c) => c.toLowerCase()) } });
  if (q.inStockOnly) and.push({ inStock: true });
  const term = q.q?.trim();
  if (term) {
    const words = term.split(/\s+/).filter(Boolean).slice(0, 5);
    for (const w of words) {
      and.push({
        OR: [
          { name: { contains: w, mode: "insensitive" } },
          { shortDescription: { contains: w, mode: "insensitive" } },
          { description: { contains: w, mode: "insensitive" } },
          { sku: { contains: w, mode: "insensitive" } },
          { tags: { has: w.toLowerCase() } },
          { colors: { has: w.toLowerCase() } },
          { category: { name: { contains: w, mode: "insensitive" } } },
        ],
      });
    }
  }
  return { AND: and };
}

function buildOrder(sort: ShopSort | undefined): Prisma.ProductOrderByWithRelationInput[] {
  switch (sort) {
    case "newest":
      return [{ createdAt: "desc" }];
    case "price-asc":
      return [{ currentPriceCents: "asc" }, { id: "asc" }];
    case "price-desc":
      return [{ currentPriceCents: "desc" }, { id: "asc" }];
    case "best":
      return [{ soldCount: "desc" }, { id: "asc" }];
    case "rating":
      return [{ avgRating: "desc" }, { reviewCount: "desc" }, { id: "asc" }];
    default:
      return [{ isFeatured: "desc" }, { soldCount: "desc" }, { createdAt: "desc" }];
  }
}

export interface ProductPage {
  items: ProductCardDTO[];
  total: number;
  page: number;
  pages: number;
  pageSize: number;
}

export async function listProducts(q: ShopQuery): Promise<ProductPage> {
  const pageSize = q.pageSize ?? PAGE_SIZE;
  const page = Math.max(1, Math.floor(q.page ?? 1));
  const where = buildWhere(q);
  const [total, rows] = await Promise.all([
    db.product.count({ where }),
    db.product.findMany({
      where,
      orderBy: buildOrder(q.sort),
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: cardInclude,
    }),
  ]);
  return { items: rows.map(toCard), total, page, pages: Math.max(1, Math.ceil(total / pageSize)), pageSize };
}

export async function getProductsByIds(ids: string[]): Promise<ProductCardDTO[]> {
  if (!ids.length) return [];
  const rows = await db.product.findMany({
    where: { id: { in: ids.slice(0, 100) }, isActive: true },
    include: cardInclude,
  });
  const order = new Map(ids.map((id, i) => [id, i]));
  return rows.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0)).map(toCard);
}

export async function listCategories() {
  return db.category.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: { _count: { select: { products: { where: { isActive: true } } } } },
  });
}

export async function availableColors(category?: string): Promise<string[]> {
  const rows = await db.product.findMany({
    where: { isActive: true, ...(category ? { category: { slug: category } } : {}) },
    select: { colors: true },
    take: 500,
  });
  return [...new Set(rows.flatMap((r) => r.colors))].sort();
}

export const detailInclude = {
  category: { select: { id: true, slug: true, name: true } },
  images: { orderBy: { sortOrder: "asc" as const } },
  variants: {
    where: { isActive: true },
    orderBy: { sortOrder: "asc" as const },
    include: { inventory: true },
  },
} satisfies Prisma.ProductInclude;

export async function getProductBySlug(slug: string) {
  const p = await db.product.findFirst({ where: { slug, isActive: true }, include: detailInclude });
  if (!p) return null;
  const card = toCard({ ...p, images: p.images.slice(0, 4) });
  // full gallery (card keeps only 4)
  const visuals = toVisuals({ ...p });
  return {
    card: { ...card, images: visuals },
    description: p.description,
    material: p.material,
    dimensions: p.dimensions,
    care: p.care,
    tags: p.tags,
    colors: p.colors,
    sku: p.sku,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    variants: p.variants.map((v) => ({
      id: v.id,
      name: v.name,
      color: v.color,
      sku: v.sku,
      priceCents: v.priceCents ?? p.currentPriceCents,
      available: variantAvailable(v),
    })),
  };
}

export async function getRelatedProducts(productId: string, categoryId: string, take = 4): Promise<ProductCardDTO[]> {
  const rows = await db.product.findMany({
    where: { isActive: true, categoryId, id: { not: productId } },
    orderBy: [{ soldCount: "desc" }, { createdAt: "desc" }],
    take,
    include: cardInclude,
  });
  if (rows.length >= take) return rows.map(toCard);
  const more = await db.product.findMany({
    where: { isActive: true, id: { notIn: [productId, ...rows.map((r) => r.id)] } },
    orderBy: [{ soldCount: "desc" }],
    take: take - rows.length,
    include: cardInclude,
  });
  return [...rows, ...more].map(toCard);
}

export async function getReviewSummary(productId: string) {
  const grouped = await db.review.groupBy({
    by: ["rating"],
    where: { productId, status: "APPROVED" },
    _count: { rating: true },
  });
  const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const g of grouped) distribution[g.rating] = g._count.rating;
  return distribution;
}

/** Recomputes avgRating/reviewCount from approved reviews. */
export async function recalcProductRating(productId: string): Promise<void> {
  const agg = await db.review.aggregate({
    where: { productId, status: "APPROVED" },
    _avg: { rating: true },
    _count: { rating: true },
  });
  await db.product.update({
    where: { id: productId },
    data: { avgRating: Math.round((agg._avg.rating ?? 0) * 10) / 10, reviewCount: agg._count.rating },
  });
}
