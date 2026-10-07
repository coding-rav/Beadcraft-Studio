import { db } from "./db";
import { getProductsByIds, listProducts } from "./catalog";
import { fuzzyMatch } from "./fuzzy";
import type { ProductCardDTO } from "./types";

export interface SearchResult {
  products: ProductCardDTO[];
  categories: { slug: string; name: string }[];
  /** true when no exact matches were found and typo-tolerant matches are shown instead */
  fuzzy: boolean;
  didYouMean: string | null;
}

export async function searchCatalog(raw: string, limit = 6): Promise<SearchResult> {
  const term = raw.trim().slice(0, 60);
  if (term.length < 2) return { products: [], categories: [], fuzzy: false, didYouMean: null };

  const [page, categories] = await Promise.all([
    listProducts({ q: term, pageSize: limit, sort: "best" }),
    db.category.findMany({
      where: { name: { contains: term, mode: "insensitive" } },
      take: 3,
      select: { slug: true, name: true },
    }),
  ]);
  if (page.items.length > 0) return { products: page.items, categories, fuzzy: false, didYouMean: null };

  // Typo-friendly fallback: edit-distance match against product names and tags.
  const pool = await db.product.findMany({
    where: { isActive: true },
    select: { id: true, name: true, tags: true },
    take: 400,
  });
  const hits = fuzzyMatch(term, pool, (p) => `${p.name} ${p.tags.join(" ")}`, limit);
  const products = await getProductsByIds(hits.map((h) => h.id));
  return { products, categories, fuzzy: products.length > 0, didYouMean: hits[0]?.name ?? null };
}
