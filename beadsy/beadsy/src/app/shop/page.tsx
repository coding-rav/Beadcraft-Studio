import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { parseShopParams, type RawParams } from "@/lib/shop-params";
import { ShopView } from "@/components/shop/ShopView";

export const dynamic = "force-dynamic";

export async function generateMetadata({ searchParams }: { searchParams: Promise<RawParams> }): Promise<Metadata> {
  const sp = await searchParams;
  const filtered = Object.keys(sp).some((k) => k !== "page");
  return buildMetadata({
    title: "Shop handmade beaded bracelets, necklaces & gifts",
    description: "Browse every Beadsy design — pastel bracelets, charms, keychains, necklaces and gift sets, handmade in small batches.",
    path: "/shop",
    noIndex: filtered, // keep filtered/sorted variants out of the index; the canonical page is /shop
  });
}

export default async function ShopPage({ searchParams }: { searchParams: Promise<RawParams> }) {
  const raw = await searchParams;
  const query = parseShopParams(raw);
  return <ShopView query={query} rawParams={raw} basePath="/shop" title="Shop all" intro="Handpicked beads, beautiful designs, and little things made to brighten your day." />;
}
