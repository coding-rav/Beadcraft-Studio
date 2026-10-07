"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { ProductCardDTO } from "@/lib/types";
import { Icon } from "@/components/ui/Icon";
import { Price } from "@/components/ui/Price";
import { ProductVisual } from "@/components/ui/ProductVisual";
import { Stars } from "@/components/ui/Stars";
import { useStore } from "@/components/providers/StoreProvider";
import { WishlistButton } from "./WishlistButton";

export function QuickView({ product: p, onClose }: { product: ProductCardDTO; onClose: () => void }) {
  const { addToCart, toast, setCartOpen } = useStore();
  const ref = useRef<HTMLDialogElement>(null);
  const firstAvailable = p.variants.find((v) => v.available > 0)?.id ?? p.variants[0]?.id ?? null;
  const [variantId, setVariantId] = useState<string | null>(firstAvailable);
  const variant = p.variants.find((v) => v.id === variantId);

  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const add = () => {
    if (!variantId || !variant || variant.available <= 0) return;
    addToCart(variantId, 1);
    toast(`Added “${p.name}” to your bag`);
    onClose();
    setCartOpen(true);
  };

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      aria-label={`Quick view: ${p.name}`}
      className="m-auto w-[min(92vw,820px)] overflow-hidden rounded-3xl border-0 bg-cream-100 p-0 shadow-pop"
    >
      <div className="grid max-h-[88vh] overflow-y-auto sm:grid-cols-2">
        <div className="relative aspect-square bg-plum-50 sm:aspect-auto sm:min-h-[420px]">
          <ProductVisual visual={p.images[0]!} sizes="(max-width: 640px) 92vw, 410px" />
        </div>
        <div className="flex flex-col gap-3 p-6">
          <div className="flex items-start justify-between gap-2">
            <p className="eyebrow">{p.categoryName}</p>
            <button type="button" className="icon-btn -mt-2 -mr-2" aria-label="Close quick view" onClick={() => ref.current?.close()}>
              <Icon name="close" size={22} />
            </button>
          </div>
          <h2 className="text-2xl font-semibold">{p.name}</h2>
          {p.reviewCount > 0 && (
            <div className="flex items-center gap-2 text-sm text-muted">
              <Stars rating={p.rating} />
              {p.rating.toFixed(1)} · {p.reviewCount} reviews
            </div>
          )}
          <Price priceCents={variant?.priceCents ?? p.priceCents} salePriceCents={variant && variant.priceCents < p.priceCents ? undefined : p.salePriceCents} size="lg" />
          <p className="text-sm text-plum-800">{p.shortDescription}</p>

          {p.variants.length > 1 && (
            <fieldset>
              <legend className="label">Choose a style</legend>
              <div className="flex flex-wrap gap-2">
                {p.variants.map((v) => (
                  <button key={v.id} type="button" className="chip disabled:line-through disabled:opacity-50" aria-pressed={variantId === v.id} disabled={v.available <= 0} onClick={() => setVariantId(v.id)}>
                    {v.name}
                  </button>
                ))}
              </div>
            </fieldset>
          )}

          <div className="mt-auto flex flex-col gap-2 pt-2">
            <div className="flex gap-2">
              <button type="button" onClick={add} disabled={!variant || variant.available <= 0} className="btn btn-primary btn-lg flex-1">
                {variant && variant.available > 0 ? "Add to bag" : "Sold out"}
              </button>
              <WishlistButton productId={p.id} name={p.name} className="!size-12 border-2 border-plum-200" />
            </div>
            <Link href={`/product/${p.slug}`} className="text-center text-sm font-semibold text-plum-700 underline underline-offset-4">
              View full details
            </Link>
          </div>
        </div>
      </div>
    </dialog>
  );
}
