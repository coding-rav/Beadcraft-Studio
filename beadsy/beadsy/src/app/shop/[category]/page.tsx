import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { buildMetadata } from "@/lib/seo";
import { parseShopParams, type RawParams } from "@/lib/shop-params";
import { ShopView } from "@/components/shop/ShopView";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ category: string }>; searchParams: Promise<RawParams> };

async function getCategory(slug: string) {
  if (!/^[a-z0-9-]{1,60}$/.test(slug)) return null;
  return db.category.findUnique({ where: { slug } });
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { category } = await params;
  const cat = await getCategory(category);
  if (!cat) return { title: "Category not found", robots: { index: false } };
  const sp = await searchParams;
  return buildMetadata({
    title: `${cat.name} — handmade bead ${cat.name.toLowerCase()}`,
    description: cat.description ?? `Shop handmade ${cat.name.toLowerCase()} from Beadsy. Small beads, big vibes.`,
    path: `/shop/${cat.slug}`,
    noIndex: Object.keys(sp).some((k) => k !== "page"),
  });
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { category } = await params;
  const cat = await getCategory(category);
  if (!cat) notFound();
  const raw = await searchParams;
  const query = parseShopParams(raw, cat.slug);
  return <ShopView query={query} rawParams={raw} basePath={`/shop/${cat.slug}`} title={cat.name} intro={cat.description} categoryName={cat.name} />;
}
