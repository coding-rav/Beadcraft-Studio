import { apiHandler, json, readJson } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { productInputSchema } from "@/lib/admin-validation";
import { deleteProduct, updateProduct } from "@/lib/admin-products";

type Ctx = { params: Promise<{ id: string }> };

export const PUT = apiHandler(async (req, ctx: Ctx) => {
  await requireAdmin();
  const { id } = await ctx.params;
  const input = productInputSchema.parse(await readJson(req));
  await updateProduct(id, input);
  return json({ ok: true });
});

export const DELETE = apiHandler(async (_req, ctx: Ctx) => {
  await requireAdmin();
  const { id } = await ctx.params;
  await deleteProduct(id);
  return json({ ok: true });
});
