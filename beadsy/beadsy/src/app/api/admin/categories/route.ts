import { revalidateTag } from "next/cache";
import { db } from "@/lib/db";
import { apiHandler, json, readJson } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { categoryInputSchema } from "@/lib/admin-validation";
import { slugify } from "@/lib/utils";

export const POST = apiHandler(async (req) => {
  await requireAdmin();
  const input = categoryInputSchema.parse(await readJson(req));
  const category = await db.category.create({
    data: { name: input.name, slug: input.slug || slugify(input.name), description: input.description || null, sortOrder: input.sortOrder },
  });
  revalidateTag("catalog");
  return json({ category }, { status: 201 });
});
