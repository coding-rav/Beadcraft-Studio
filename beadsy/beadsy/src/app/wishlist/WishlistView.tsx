"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useStore } from "@/components/providers/StoreProvider";
import { Icon } from "@/components/ui/Icon";
import { Price } from "@/components/ui/Price";
import { ProductVisual } from "@/components/ui/ProductVisual";
import { StatePanel, ProductGridSkeleton } from "@/components/ui/States";
import { formatMoney } from "@/lib/money";
import type { ProductCardDTO } from "@/lib/types";

export function WishlistView() {
  const { wishlist, ready, user, toggleWishlist, addToCart, toast, setCartOpen } = useStore();
  const [products, setProducts] = useState<ProductCardDTO[] | null>(null);
  const [error, setError] = useState(false);
  const [priceAtAdd, setPriceAtAdd] = useState<Record<string, number>>({});
  const key = wishlist.join(",");

  useEffect(() => {
    if (!ready) return;
    if (wishlist.length === 0) {
      setProducts([]);
      return;
    }
    const ctrl = new AbortController();
    setError(false);
    fetch("/api/products/lookup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: wishlist }), signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("lookup failed"))))
      .then((d: { products: ProductCardDTO[] }) => setProducts(d.products))
      .catch((e: Error) => {
        if (e.name !== "AbortError") setError(true);
      });
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, key]);

  useEffect(() => {
    if (!user) return;
    void fetch("/api/wishlist")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { items: { productId: string; priceAtAddCents: number }[] } | null) => {
        if (d) setPriceAtAdd(Object.fromEntries(d.items.map((i) => [i.productId, i.priceAtAddCents])));
      })
      .catch(() => {});
  }, [user, key]);

  if (!ready || (products === null && !error)) {
    return (
      <div className="container-x py-10">
        <h1 className="mb-6 text-4xl font-semibold">Your wishlist</h1>
        <ProductGridSkeleton count={4} />
      </div>
    );
  }

  if (error) {
    return <StatePanel art="charm" tone="pink" title="Couldn't load your wishlist" message="Please check your connection and try again." actions={[{ label: "Reload", onClick: () => window.location.reload() }]} />;
  }

  if (!products || products.length === 0) {
    return (
      <StatePanel
        art="charm"
        tone="pink"
        title="Nothing saved yet"
        message="Tap the heart on anything you love and it'll wait for you here."
        actions={[{ label: "Discover favourites", href: "/shop" }, { label: "Best sellers", href: "/shop?sort=best", variant: "secondary" }]}
      />
    );
  }

  const moveToCart = (p: ProductCardDTO) => {
    if (!p.inStock || !p.defaultVariantId) return;
    if (p.variants.length > 1) {
      toast("Pick your style on the product page", "info");
      return;
    }
    addToCart(p.defaultVariantId, 1);
    void toggleWishlist(p.id);
    toast(`Moved “${p.name}” to your bag`);
    setCartOpen(true);
  };

  return (
    <div className="container-x py-8 sm:py-12">
      <h1 className="mb-1 text-4xl font-semibold sm:text-5xl">Your wishlist</h1>
      <p className="mb-6 text-muted">{products.length} saved {products.length === 1 ? "piece" : "pieces"}{!user && <> · <Link href="/login?next=/wishlist" className="font-bold text-plum-700 underline">Sign in</Link> to keep them on every device</>}</p>

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((p) => {
          const current = p.salePriceCents ?? p.priceCents;
          const before = priceAtAdd[p.id];
          const delta = before != null ? current - before : 0;
          return (
            <li key={p.id} className="card flex gap-4 p-4">
              <Link href={`/product/${p.slug}`} className="relative size-28 shrink-0 overflow-hidden rounded-2xl sm:size-32">
                <ProductVisual visual={p.images[0]!} sizes="128px" />
              </Link>
              <div className="flex min-w-0 flex-1 flex-col">
                <Link href={`/product/${p.slug}`} className="line-clamp-2 font-bold hover:underline">{p.name}</Link>
                <div className="mt-1"><Price priceCents={p.priceCents} salePriceCents={p.salePriceCents} size="sm" /></div>
                {delta < 0 && <p className="mt-1 text-xs font-bold text-mint-700">Price dropped by {formatMoney(-delta)} since you saved it 🎉</p>}
                {delta > 0 && <p className="mt-1 text-xs font-bold text-sun-700">Price went up by {formatMoney(delta)}</p>}
                <p className={`mt-1 text-xs font-bold ${p.inStock ? (p.lowStock ? "text-sun-700" : "text-mint-700") : "text-coral-700"}`}>{p.inStock ? (p.lowStock ? "Few left" : "In stock") : "Sold out"}</p>
                <div className="mt-auto flex items-center gap-2 pt-3">
                  <button type="button" className="btn btn-primary btn-sm flex-1" disabled={!p.inStock} onClick={() => moveToCart(p)}>
                    <Icon name="bag" size={15} /> {p.variants.length > 1 ? "Choose style" : "Move to bag"}
                  </button>
                  <button type="button" className="icon-btn size-9 text-muted hover:text-coral-700" aria-label={`Remove ${p.name} from wishlist`} onClick={() => void toggleWishlist(p.id)}>
                    <Icon name="trash" size={17} />
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
