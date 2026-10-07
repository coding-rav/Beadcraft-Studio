import Link from "next/link";
import { Suspense } from "react";
import { availableColors, listCategories, listProducts, type ShopQuery } from "@/lib/catalog";
import type { RawParams } from "@/lib/shop-params";
import { absoluteUrl, breadcrumbLd } from "@/lib/seo";
import { formatMoney } from "@/lib/money";
import { JsonLd } from "@/components/ui/JsonLd";
import { ProductGrid } from "@/components/product/ProductGrid";
import { StatePanel } from "@/components/ui/States";
import { Filters, SortSelect } from "./Filters";
import { Pagination } from "./Pagination";

export async function ShopView({
  query,
  rawParams,
  basePath,
  title,
  intro,
  categoryName,
}: {
  query: ShopQuery;
  rawParams: RawParams;
  basePath: string;
  title: string;
  intro?: string | null;
  categoryName?: string;
}) {
  const [result, categories, colors] = await Promise.all([listProducts(query), listCategories(), availableColors(query.category)]);
  const cats = categories.map((c) => ({ slug: c.slug, name: c.name, count: c._count.products }));
  const filtered = Boolean(query.q || query.min != null || query.max != null || query.colors?.length || query.inStockOnly);

  const crumbs = [{ name: "Home", path: "/" }, { name: "Shop", path: "/shop" }, ...(categoryName ? [{ name: categoryName, path: basePath }] : [])];

  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: title,
    itemListElement: result.items.map((p, i) => ({
      "@type": "ListItem",
      position: (result.page - 1) * result.pageSize + i + 1,
      url: absoluteUrl(`/product/${p.slug}`),
      name: p.name,
    })),
  };

  return (
    <div className="container-x py-8 sm:py-12">
      <JsonLd data={breadcrumbLd(crumbs)} />
      <JsonLd data={itemList} />

      <nav aria-label="Breadcrumb" className="mb-4 text-sm text-muted">
        <ol className="flex flex-wrap items-center gap-1.5">
          {crumbs.map((c, i) => (
            <li key={c.path} className="flex items-center gap-1.5">
              {i > 0 && <span aria-hidden="true">/</span>}
              {i === crumbs.length - 1 ? <span aria-current="page" className="font-semibold text-plum-800">{c.name}</span> : <Link href={c.path} className="hover:underline">{c.name}</Link>}
            </li>
          ))}
        </ol>
      </nav>

      <header className="mb-6 sm:mb-8">
        <h1 className="text-4xl font-semibold sm:text-5xl">{title}</h1>
        {intro && <p className="mt-2 max-w-2xl text-plum-800">{intro}</p>}
      </header>

      <div className="lg:grid lg:grid-cols-[250px_1fr] lg:gap-10">
        <Suspense fallback={<div className="hidden lg:block" />}>
          <Filters categories={cats} colors={colors} activeCategory={query.category} basePath={basePath} total={result.total} />
        </Suspense>

        <section aria-label="Products" className="min-w-0">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-semibold text-muted" role="status">
              {result.total} {result.total === 1 ? "product" : "products"}
              {query.min != null || query.max != null ? ` · ${query.min != null ? formatMoney(query.min) : "₹0"} – ${query.max != null ? formatMoney(query.max) : "any"}` : ""}
            </p>
            <Suspense fallback={null}>
              <SortSelect />
            </Suspense>
          </div>

          {result.items.length === 0 ? (
            <StatePanel
              compact
              art="charm"
              title={filtered ? "No beads match that" : "Nothing here yet"}
              message={filtered ? "Try removing a filter or searching for something a little broader." : "New pieces are being strung right now — check back very soon."}
              actions={filtered ? [{ label: "Clear filters", href: basePath }, { label: "Browse everything", href: "/shop", variant: "secondary" }] : [{ label: "Back to home", href: "/" }]}
            />
          ) : (
            <>
              <ProductGrid products={result.items} priorityCount={4} />
              <Pagination page={result.page} pages={result.pages} basePath={basePath} params={rawParams} />
            </>
          )}
        </section>
      </div>
    </div>
  );
}
