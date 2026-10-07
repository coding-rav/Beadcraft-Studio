import { revalidateTag } from "next/cache";
import { Prisma } from "@prisma/client";
import { db } from "./db";
import { HttpError } from "./api";
import { refreshProductStock } from "./inventory";
import { toCents } from "./money";
import { slugify } from "./utils";
import type { ProductInput } from "./admin-validation";

function baseData(input: ProductInput) {
  const priceCents = toCents(input.price);
  const sale = input.salePrice != null ? toCents(input.salePrice) : null;
  const onSale = sale != null && sale < priceCents;
  return {
    name: input.name,
    shortDescription: input.shortDescription,
    description: input.description,
    categoryId: input.categoryId,
    priceCents,
    salePriceCents: onSale ? sale : null,
    currentPriceCents: onSale ? sale! : priceCents,
    sku: input.sku,
    tags: input.tags,
    colors: input.colors,
    palette: input.palette,
    artKind: input.artKind,
    material: input.material || null,
    dimensions: input.dimensions || null,
    care: input.care || null,
    isActive: input.isActive,
    isFeatured: input.isFeatured,
  };
}

async function assertCategory(id: string) {
  const c = await db.category.findUnique({ where: { id }, select: { id: true } });
  if (!c) throw new HttpError(400, "Choose a valid category.", "BAD_CATEGORY");
}

export async function createProduct(input: ProductInput) {
  await assertCategory(input.categoryId);
  const slug = input.slug || slugify(input.name);
  if (!slug) throw new HttpError(400, "Could not build a URL slug from that name.");
  const product = await db.$transaction(async (tx) => {
    const p = await tx.product.create({
      data: {
        ...baseData(input),
        slug,
        images: { create: input.images.map((im, i) => ({ url: im.url, alt: im.alt || input.name, sortOrder: i })) },
        variants: {
          create: input.variants.map((v, i) => ({
            name: v.name,
            sku: v.sku,
            color: v.color || null,
            priceCents: v.priceOverride != null ? toCents(v.priceOverride) : null,
            isActive: v.isActive,
            sortOrder: i,
            inventory: { create: { quantity: v.quantity, lowStockThreshold: v.lowStockThreshold } },
          })),
        },
      },
    });
    await refreshProductStock(tx, [p.id]);
    return p;
  });
  revalidateTag("catalog");
  return product;
}

export async function updateProduct(id: string, input: ProductInput) {
  const existing = await db.product.findUnique({ where: { id }, include: { variants: { select: { id: true } } } });
  if (!existing) throw new HttpError(404, "Product not found");
  await assertCategory(input.categoryId);
  const keepIds = new Set(input.variants.map((v) => v.id).filter((x): x is string => Boolean(x)));
  const ownIds = new Set(existing.variants.map((v) => v.id));
  for (const vid of keepIds) if (!ownIds.has(vid)) throw new HttpError(400, "A variant does not belong to this product.");

  await db.$transaction(async (tx) => {
    await tx.product.update({ where: { id }, data: { ...baseData(input), ...(input.slug ? { slug: input.slug } : {}) } });

    await tx.productImage.deleteMany({ where: { productId: id } });
    if (input.images.length) {
      await tx.productImage.createMany({ data: input.images.map((im, i) => ({ productId: id, url: im.url, alt: im.alt || input.name, sortOrder: i })) });
    }

    const removed = existing.variants.map((v) => v.id).filter((vid) => !keepIds.has(vid));
    if (removed.length) await tx.productVariant.deleteMany({ where: { id: { in: removed } } });

    for (const [i, v] of input.variants.entries()) {
      const common = {
        name: v.name,
        sku: v.sku,
        color: v.color || null,
        priceCents: v.priceOverride != null ? toCents(v.priceOverride) : null,
        isActive: v.isActive,
        sortOrder: i,
      };
      if (v.id) {
        await tx.productVariant.update({ where: { id: v.id }, data: common });
        // `quantity` entered in the admin is the physical stock on hand; reserved units stay untouched.
        await tx.inventory.upsert({
          where: { variantId: v.id },
          create: { variantId: v.id, quantity: v.quantity, lowStockThreshold: v.lowStockThreshold },
          update: { quantity: v.quantity, lowStockThreshold: v.lowStockThreshold },
        });
      } else {
        await tx.productVariant.create({
          data: { ...common, productId: id, inventory: { create: { quantity: v.quantity, lowStockThreshold: v.lowStockThreshold } } },
        });
      }
    }
    await refreshProductStock(tx, [id]);
  });
  revalidateTag("catalog");
}

export async function deleteProduct(id: string) {
  try {
    await db.product.delete({ where: { id } });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") throw new HttpError(404, "Product not found");
    throw err;
  }
  revalidateTag("catalog");
}
