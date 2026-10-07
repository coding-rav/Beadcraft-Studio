import { apiHandler, json, readJson } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { productInputSchema } from "@/lib/admin-validation";
import { createProduct } from "@/lib/admin-products";

export const POST = apiHandler(async (req) => {
  await requireAdmin();
  const input = productInputSchema.parse(await readJson(req));
  const p = await createProduct(input);
  return json({ id: p.id, slug: p.slug }, { status: 201 });
});
