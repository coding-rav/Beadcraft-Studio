import { unstable_cache } from "next/cache";
import { db } from "./db";
import { cardInclude, listCategories, toCard } from "./catalog";
import type { ProductCardDTO } from "./types";

async function loadHome() {
  const [featured, newest, best, categories, reviews, counts] = await Promise.all([
    db.product.findMany({ where: { isActive: true, isFeatured: true }, orderBy: [{ soldCount: "desc" }, { createdAt: "desc" }], take: 8, include: cardInclude }),
    db.product.findMany({ where: { isActive: true }, orderBy: { createdAt: "desc" }, take: 8, include: cardInclude }),
    db.product.findMany({ where: { isActive: true, soldCount: { gt: 0 } }, orderBy: [{ soldCount: "desc" }, { avgRating: "desc" }], take: 8, include: cardInclude }),
    listCategories(),
    db.review.findMany({
      where: { status: "APPROVED", rating: { gte: 4 } },
      orderBy: [{ helpfulCount: "desc" }, { createdAt: "desc" }],
      take: 6,
      include: { user: { select: { name: true } }, product: { select: { name: true, slug: true } } },
    }),
    db.product.count({ where: { isActive: true } }),
  ]);

  const cards = (rows: typeof featured): ProductCardDTO[] => rows.map(toCard);
  return {
    featured: cards(featured),
    newest: cards(newest),
    best: cards(best),
    categories: categories.map((c) => ({ slug: c.slug, name: c.name, description: c.description, count: c._count.products })),
    reviews: reviews.map((r) => ({
      id: r.id,
      rating: r.rating,
      title: r.title,
      body: r.body,
      verified: r.verifiedPurchase,
      author: r.user.name.split(" ")[0] ?? "Customer",
      productName: r.product.name,
      productSlug: r.product.slug,
    })),
    productCount: counts,
  };
}

export const getHomeData = unstable_cache(loadHome, ["home-data-v1"], { revalidate: 60, tags: ["catalog"] });
