"use client";

import Link from "next/link";
import { useState } from "react";
import type { ProductCardDTO } from "@/lib/types";
import { Icon } from "@/components/ui/Icon";
import { Price } from "@/components/ui/Price";
import { ProductVisual } from "@/components/ui/ProductVisual";
import { Stars } from "@/components/ui/Stars";
import { useStore } from "@/components/providers/StoreProvider";
import { discountPercent } from "@/lib/money";
import { QuickView } from "./QuickView";
import { WishlistButton } from "./WishlistButton";

export function ProductCard({ product, priority = false, sizes }: { product: ProductCardDTO; priority?: boolean; sizes?: string }) {
  const { addToCart, toast, setCartOpen } = useStore();
  const [quick, setQuick] = useState(false);
  const p = product;
  const pct = discountPercent(p.priceCents, p.salePriceCents);
  const single = p.variants.length <= 1;
  const second = p.images[1] ?? null;

  const quickAdd = () => {
    if (!p.inStock || !p.defaultVariantId) return;
    if (!single) {
      setQuick(true); // let the customer choose a variant first
      return;
    }
    addToCart(p.defaultVariantId, 1);
    toast(`Added “${p.name}” to your bag`);
    setCartOpen(true);
  };

  return (
    <article className="group card relative flex flex-col overflow-hidden transition duration-300 hover:-translate-y-1 hover:shadow-pop">
      <div className="relative aspect-square overflow-hidden bg-plum-50">
        <Link href={`/product/${p.slug}`} className="absolute inset-0 block" aria-label={p.name} tabIndex={-1}>
          <div className={`absolute inset-0 transition duration-500 ${second ? "group-hover:opacity-0" : "group-hover:scale-105"}`}>
            <ProductVisual visual={p.images[0]!} priority={priority} sizes={sizes} />
          </div>
          {second && (
            <div className="absolute inset-0 opacity-0 transition duration-500 group-hover:opacity-100">
              <ProductVisual visual={second} sizes={sizes} />
            </div>
          )}
        </Link>

        <div className="pointer-events-none absolute top-2.5 left-2.5 flex flex-col items-start gap-1.5">
          {!p.inStock && <span className="badge bg-plum-800 text-white">Sold out</span>}
          {p.inStock && pct > 0 && <span className="badge bg-bubblegum-600 text-white">-{pct}%</span>}
          {p.inStock && p.isNew && pct === 0 && <span className="badge bg-mint-500 text-plum-900">New</span>}
          {p.lowStock && <span className="badge bg-sun-500 text-plum-900">Few left</span>}
        </div>

        <div className="absolute top-2 right-2 z-10">
          <WishlistButton productId={p.id} name={p.name} />
        </div>

        <div className="absolute inset-x-2.5 bottom-2.5 z-10 flex gap-2 transition duration-300 sm:translate-y-3 sm:opacity-0 sm:group-focus-within:translate-y-0 sm:group-focus-within:opacity-100 sm:group-hover:translate-y-0 sm:group-hover:opacity-100">
          <button type="button" onClick={quickAdd} disabled={!p.inStock} className="btn btn-primary btn-sm flex-1 shadow-pop">
            <Icon name="bag" size={15} /> {p.inStock ? (single ? "Quick add" : "Choose options") : "Sold out"}
          </button>
          <button type="button" onClick={() => setQuick(true)} className="grid size-9 shrink-0 place-items-center rounded-full bg-white text-plum-800 shadow-pop transition hover:bg-plum-100" aria-label={`Quick view ${p.name}`}>
            <Icon name="eye" size={17} />
          </button>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-1 p-3 sm:p-4">
        <p className="text-xs font-semibold tracking-wide text-plum-500 uppercase">{p.categoryName}</p>
        <h3 className="font-sans text-[15px] leading-snug font-semibold sm:text-base">
          <Link href={`/product/${p.slug}`} className="after:absolute after:inset-0 after:content-[''] hover:underline sm:after:hidden">
            {p.name}
          </Link>
        </h3>
        <div className="flex items-center gap-1.5 text-xs text-muted">
          {p.reviewCount > 0 ? (
            <>
              <Stars rating={p.rating} size={13} />
              <span>
                {p.rating.toFixed(1)} ({p.reviewCount})
              </span>
            </>
          ) : (
            <span>New — be the first to review</span>
          )}
        </div>
        <div className="mt-auto pt-1.5">
          <Price priceCents={p.priceCents} salePriceCents={p.salePriceCents} size="sm" />
        </div>
      </div>

      {quick && <QuickView product={p} onClose={() => setQuick(false)} />}
    </article>
  );
}
