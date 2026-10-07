import { db } from "@/lib/db";
import { apiHandler, json, readJson } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { couponInputSchema } from "@/lib/admin-validation";
import { couponData } from "@/lib/admin-coupons";

type Ctx = { params: Promise<{ id: string }> };

export const PUT = apiHandler(async (req, ctx: Ctx) => {
  await requireAdmin();
  const { id } = await ctx.params;
  const input = couponInputSchema.parse(await readJson(req));
  const coupon = await db.coupon.update({ where: { id }, data: couponData(input) });
  return json({ coupon });
});

export const DELETE = apiHandler(async (_req, ctx: Ctx) => {
  await requireAdmin();
  const { id } = await ctx.params;
  await db.coupon.delete({ where: { id } });
  return json({ ok: true });
});
