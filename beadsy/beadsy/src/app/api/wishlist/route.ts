import { db } from "@/lib/db";
import { apiHandler, HttpError, json, readJson } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { wishlistToggleSchema } from "@/lib/validation";

export const GET = apiHandler(async () => {
  const user = await requireUser();
  const wl = await db.wishlist.findUnique({ where: { userId: user.id }, include: { items: { orderBy: { createdAt: "desc" } } } });
  return json({ items: wl?.items.map((i) => ({ productId: i.productId, priceAtAddCents: i.priceAtAddCents })) ?? [] });
});

export const POST = apiHandler(
  async (req) => {
    const user = await requireUser();
    const { productId } = wishlistToggleSchema.parse(await readJson(req));
    const product = await db.product.findFirst({ where: { id: productId, isActive: true }, select: { id: true, currentPriceCents: true } });
    if (!product) throw new HttpError(404, "Product not found");
    const wl = await db.wishlist.upsert({ where: { userId: user.id }, create: { userId: user.id }, update: {} });
    await db.wishlistItem.upsert({
      where: { wishlistId_productId: { wishlistId: wl.id, productId } },
      create: { wishlistId: wl.id, productId, priceAtAddCents: product.currentPriceCents },
      update: {},
    });
    return json({ ok: true, priceAtAddCents: product.currentPriceCents }, { status: 201 });
  },
  { rateLimit: { name: "wishlist", max: 90, windowMs: 60_000 } },
);

export const DELETE = apiHandler(
  async (req) => {
    const user = await requireUser();
    const { productId } = wishlistToggleSchema.parse(await readJson(req));
    const wl = await db.wishlist.findUnique({ where: { userId: user.id } });
    if (wl) await db.wishlistItem.deleteMany({ where: { wishlistId: wl.id, productId } });
    return json({ ok: true });
  },
  { rateLimit: { name: "wishlist", max: 90, windowMs: 60_000 } },
);
