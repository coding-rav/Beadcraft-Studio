import { z } from "zod";
import { db } from "@/lib/db";
import { apiHandler, json, readJson, HttpError } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { normalizeItems } from "@/lib/cart";
import { cartItemSchema } from "@/lib/validation";
import { commerceConfig } from "@/lib/config";

// Server-side copy of a signed-in customer's cart (guests keep theirs in localStorage).

export const GET = apiHandler(async () => {
  const user = await requireUser();
  const cart = await db.cart.findUnique({ where: { userId: user.id }, include: { items: true } });
  return json({ items: cart?.items.map((i) => ({ variantId: i.variantId, quantity: i.quantity })) ?? [] });
});

const putSchema = z.object({ items: z.array(cartItemSchema).max(commerceConfig.maxCartLines) });

export const PUT = apiHandler(
  async (req) => {
    const user = await requireUser();
    const { items: raw } = putSchema.parse(await readJson(req));
    const items = normalizeItems(raw);

    // Only keep variants that exist (stale ids from old sessions are dropped silently).
    const existing = await db.productVariant.findMany({
      where: { id: { in: items.map((i) => i.variantId) } },
      select: { id: true },
    });
    const ok = new Set(existing.map((v) => v.id));
    const clean = items.filter((i) => ok.has(i.variantId));
    if (clean.length > commerceConfig.maxCartLines) throw new HttpError(400, "Too many items in cart");

    await db.$transaction(async (tx) => {
      const cart = await tx.cart.upsert({ where: { userId: user.id }, create: { userId: user.id }, update: {} });
      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
      if (clean.length) {
        await tx.cartItem.createMany({ data: clean.map((i) => ({ cartId: cart.id, variantId: i.variantId, quantity: i.quantity })) });
      }
    });
    return json({ items: clean });
  },
  { rateLimit: { name: "cart-put", max: 120, windowMs: 60_000 } },
);
