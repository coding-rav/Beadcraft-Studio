import { db } from "@/lib/db";
import { apiHandler, json, readJson } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { couponInputSchema } from "@/lib/admin-validation";
import { couponData } from "@/lib/admin-coupons";

export const POST = apiHandler(async (req) => {
  await requireAdmin();
  const input = couponInputSchema.parse(await readJson(req));
  const coupon = await db.coupon.create({ data: couponData(input) });
  return json({ coupon }, { status: 201 });
});
