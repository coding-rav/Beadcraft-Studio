"use client";

import { useEffect, useState } from "react";
import type { ProductCardDTO } from "@/lib/types";
import { ProductGrid } from "./ProductGrid";
import { readRecentlyViewed } from "@/components/providers/StoreProvider";

export function RecentlyViewed({ excludeId }: { excludeId: string }) {
  const [products, setProducts] = useState<ProductCardDTO[]>([]);

  useEffect(() => {
    const ids = readRecentlyViewed().filter((id) => id !== excludeId).slice(0, 4);
    if (!ids.length) return;
    const ctrl = new AbortController();
    fetch("/api/products/lookup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids }), signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { products: ProductCardDTO[] } | null) => d && setProducts(d.products))
      .catch(() => {});
    return () => ctrl.abort();
  }, [excludeId]);

  if (!products.length) return null;
  return (
    <section aria-labelledby="recent-h" className="mt-16 sm:mt-24">
      <h2 id="recent-h" className="section-title mb-6">Recently viewed</h2>
      <ProductGrid products={products} columns="four" />
    </section>
  );
}
