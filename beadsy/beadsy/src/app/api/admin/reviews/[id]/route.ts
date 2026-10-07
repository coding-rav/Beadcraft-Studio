import { revalidateTag } from "next/cache";
import { db } from "@/lib/db";
import { apiHandler, HttpError, json, readJson } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { reviewModerationSchema } from "@/lib/admin-validation";
import { recalcProductRating } from "@/lib/catalog";

type Ctx = { params: Promise<{ id: string }> };

export const PUT = apiHandler(async (req, ctx: Ctx) => {
  await requireAdmin();
  const { id } = await ctx.params;
  const { status } = reviewModerationSchema.parse(await readJson(req));
  const review = await db.review.findUnique({ where: { id }, select: { productId: true } });
  if (!review) throw new HttpError(404, "Review not found");
  await db.review.update({ where: { id }, data: { status } });
  await recalcProductRating(review.productId);
  revalidateTag("catalog");
  return json({ ok: true });
});

export const DELETE = apiHandler(async (_req, ctx: Ctx) => {
  await requireAdmin();
  const { id } = await ctx.params;
  const review = await db.review.findUnique({ where: { id }, select: { productId: true } });
  if (!review) throw new HttpError(404, "Review not found");
  await db.review.delete({ where: { id } });
  await recalcProductRating(review.productId);
  revalidateTag("catalog");
  return json({ ok: true });
});
