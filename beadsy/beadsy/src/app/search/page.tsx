import type { Metadata } from "next";
import Link from "next/link";
import { buildMetadata } from "@/lib/seo";
import { parseShopParams, type RawParams } from "@/lib/shop-params";
import { searchCatalog } from "@/lib/search";
import { listProducts } from "@/lib/catalog";
import { ShopView } from "@/components/shop/ShopView";
import { ProductGrid } from "@/components/product/ProductGrid";
import { StatePanel } from "@/components/ui/States";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildMetadata({ title: "Search", path: "/search", noIndex: true });

export default async function SearchPage({ searchParams }: { searchParams: Promise<RawParams> }) {
  const raw = await searchParams;
  const query = parseShopParams(raw);
  const term = query.q?.trim() ?? "";

  if (term.length < 2) {
    return (
      <StatePanel
        art="charm"
        title="What are you looking for?"
        message="Type at least two letters into the search bar — try “bracelet”, “pastel” or “gift”."
        actions={[{ label: "Browse the shop", href: "/shop" }]}
      />
    );
  }

  const exact = await listProducts({ ...query, pageSize: 1 });
  if (exact.total > 0) {
    return <ShopView query={query} rawParams={raw} basePath="/search" title={`Results for “${term}”`} />;
  }

  // No exact matches → typo-tolerant suggestions.
  const fuzzy = await searchCatalog(term, 8);
  if (fuzzy.products.length > 0) {
    return (
      <div className="container-x py-10 sm:py-14">
        <h1 className="text-4xl font-semibold">No exact matches for “{term}”</h1>
        <p className="mt-2 mb-8 text-plum-800">
          {fuzzy.didYouMean ? <>Did you mean <Link href={`/search?q=${encodeURIComponent(fuzzy.didYouMean.split(" ")[0] ?? fuzzy.didYouMean)}`} className="font-bold text-plum-700 underline">{fuzzy.didYouMean}</Link>? </> : null}
          Here are the closest things we found.
        </p>
        <ProductGrid products={fuzzy.products} columns="four" />
      </div>
    );
  }

  return (
    <StatePanel
      art="bracelet"
      tone="pink"
      title={`Nothing found for “${term}”`}
      message="We couldn't find a match. Check the spelling, try a more general word, or browse by category."
      actions={[
        { label: "Browse the shop", href: "/shop" },
        { label: "Bracelets", href: "/shop/bracelets", variant: "secondary" },
      ]}
    />
  );
}
