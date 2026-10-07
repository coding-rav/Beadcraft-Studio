import { revalidateTag } from "next/cache";
import { db } from "@/lib/db";
import { apiHandler, HttpError, json, readJson } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { inventoryUpdateSchema } from "@/lib/admin-validation";
import { refreshProductStock } from "@/lib/inventory";

type Ctx = { params: Promise<{ variantId: string }> };

export const PUT = apiHandler(async (req, ctx: Ctx) => {
  await requireAdmin();
  const { variantId } = await ctx.params;
  const input = inventoryUpdateSchema.parse(await readJson(req));
  const variant = await db.productVariant.findUnique({ where: { id: variantId }, select: { productId: true } });
  if (!variant) throw new HttpError(404, "Variant not found");
  await db.$transaction(async (tx) => {
    await tx.inventory.upsert({
      where: { variantId },
      create: { variantId, quantity: input.quantity, lowStockThreshold: input.lowStockThreshold },
      update: { quantity: input.quantity, lowStockThreshold: input.lowStockThreshold },
    });
    await refreshProductStock(tx, [variant.productId]);
  });
  revalidateTag("catalog");
  return json({ ok: true });
});
