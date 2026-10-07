import { apiHandler, json, readJson } from "@/lib/api";
import { getProductsByIds } from "@/lib/catalog";
import { wishlistLookupSchema } from "@/lib/validation";

/** Public: resolves product ids (wishlist / recently viewed) to product cards. */
export const POST = apiHandler(
  async (req) => {
    const { ids } = wishlistLookupSchema.parse(await readJson(req));
    return json({ products: await getProductsByIds(ids) });
  },
  { rateLimit: { name: "lookup", max: 120, windowMs: 60_000 } },
);
