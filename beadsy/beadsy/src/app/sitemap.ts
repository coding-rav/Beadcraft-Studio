import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { siteConfig } from "@/lib/config";

export const dynamic = "force-dynamic";

const STATIC: { path: string; priority: number; changeFrequency: "daily" | "weekly" | "monthly" | "yearly" }[] = [
  { path: "/", priority: 1, changeFrequency: "daily" },
  { path: "/shop", priority: 0.9, changeFrequency: "daily" },
  { path: "/about", priority: 0.5, changeFrequency: "monthly" },
  { path: "/contact", priority: 0.4, changeFrequency: "yearly" },
  { path: "/shipping-returns", priority: 0.4, changeFrequency: "yearly" },
  { path: "/privacy", priority: 0.2, changeFrequency: "yearly" },
  { path: "/terms", priority: 0.2, changeFrequency: "yearly" },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const entries: MetadataRoute.Sitemap = STATIC.map((s) => ({ url: `${siteConfig.url}${s.path}`, lastModified: now, changeFrequency: s.changeFrequency, priority: s.priority }));
  try {
    const [categories, products] = await Promise.all([
      db.category.findMany({ select: { slug: true, updatedAt: true } }),
      db.product.findMany({ where: { isActive: true }, select: { slug: true, updatedAt: true }, take: 5000 }),
    ]);
    for (const c of categories) entries.push({ url: `${siteConfig.url}/shop/${c.slug}`, lastModified: c.updatedAt, changeFrequency: "weekly", priority: 0.8 });
    for (const p of products) entries.push({ url: `${siteConfig.url}/product/${p.slug}`, lastModified: p.updatedAt, changeFrequency: "weekly", priority: 0.7 });
  } catch (err) {
    console.error("[sitemap] database unavailable, serving static routes only:", err instanceof Error ? err.message : "unknown");
  }
  return entries;
}
