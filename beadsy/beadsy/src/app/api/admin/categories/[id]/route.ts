import { revalidateTag } from "next/cache";
import { db } from "@/lib/db";
import { apiHandler, HttpError, json, readJson } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { categoryInputSchema } from "@/lib/admin-validation";
import { slugify } from "@/lib/utils";

type Ctx = { params: Promise<{ id: string }> };

export const PUT = apiHandler(async (req, ctx: Ctx) => {
  await requireAdmin();
  const { id } = await ctx.params;
  const input = categoryInputSchema.parse(await readJson(req));
  const category = await db.category.update({
    where: { id },
    data: { name: input.name, slug: input.slug || slugify(input.name), description: input.description || null, sortOrder: input.sortOrder },
  });
  revalidateTag("catalog");
  return json({ category });
});

export const DELETE = apiHandler(async (_req, ctx: Ctx) => {
  await requireAdmin();
  const { id } = await ctx.params;
  const count = await db.product.count({ where: { categoryId: id } });
  if (count > 0) throw new HttpError(409, `This category still has ${count} product${count === 1 ? "" : "s"}. Move or delete them first.`, "CATEGORY_IN_USE");
  await db.category.delete({ where: { id } });
  revalidateTag("catalog");
  return json({ ok: true });
});
