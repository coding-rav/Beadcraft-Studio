"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { commerceConfig } from "@/lib/config";
import { formatMoney } from "@/lib/money";
import { addBusinessDays, formatDate } from "@/lib/utils";
import { Icon } from "@/components/ui/Icon";
import { Price } from "@/components/ui/Price";
import { useStore, pushRecentlyViewed } from "@/components/providers/StoreProvider";
import { WishlistButton } from "./WishlistButton";

interface Variant {
  id: string;
  name: string;
  color: string | null;
  priceCents: number;
  available: number;
}

export function PurchasePanel({
  productId,
  name,
  priceCents,
  salePriceCents,
  variants,
}: {
  productId: string;
  name: string;
  priceCents: number;
  salePriceCents: number | null;
  variants: Variant[];
}) {
  const router = useRouter();
  const { addToCart, setCartOpen, toast, cart } = useStore();
  const firstAvailable = variants.find((v) => v.available > 0) ?? variants[0];
  const [variantId, setVariantId] = useState(firstAvailable?.id ?? "");
  const [qty, setQty] = useState(1);
  const variant = variants.find((v) => v.id === variantId);

  useEffect(() => pushRecentlyViewed(productId), [productId]);

  const inCart = cart.find((c) => c.variantId === variantId)?.quantity ?? 0;
  const available = variant?.available ?? 0;
  const maxAddable = Math.max(Math.min(available, commerceConfig.maxQuantityPerLine) - inCart, 0);
  const soldOut = available <= 0;
  const low = !soldOut && available <= commerceConfig.lowStockThreshold;
  const hasVariantPrice = variant && variants.length > 1 && variant.priceCents !== (salePriceCents ?? priceCents);

  useEffect(() => {
    setQty((q) => Math.max(1, Math.min(q, Math.max(maxAddable, 1))));
  }, [maxAddable, variantId]);

  const est = commerceConfig.deliveryEstimates.STANDARD;
  const eta = `${formatDate(addBusinessDays(new Date(), est.minDays), { day: "numeric", month: "short" })} – ${formatDate(addBusinessDays(new Date(), est.maxDays), { day: "numeric", month: "short" })}`;

  const add = (goCheckout: boolean) => {
    if (!variant || soldOut) return;
    if (maxAddable <= 0) {
      toast(`You already have all ${available} in your bag.`, "info");
      if (goCheckout) router.push("/checkout");
      else setCartOpen(true);
      return;
    }
    addToCart(variant.id, qty);
    if (goCheckout) {
      router.push("/checkout");
    } else {
      toast(`Added ${qty} × “${name}” to your bag`);
      setCartOpen(true);
    }
  };

  return (
    <div className="space-y-5">
      <div aria-live="polite">
        {hasVariantPrice ? (
          <Price priceCents={variant.priceCents} size="lg" />
        ) : (
          <Price priceCents={priceCents} salePriceCents={salePriceCents} size="lg" />
        )}
        <p className="mt-1 text-xs text-muted">Inclusive of all taxes. Shipping calculated at checkout.</p>
      </div>

      {variants.length > 1 && (
        <fieldset>
          <legend className="label">
            Style: <span className="font-normal text-plum-700">{variant?.name}</span>
          </legend>
          <div className="flex flex-wrap gap-2">
            {variants.map((v) => (
              <button
                key={v.id}
                type="button"
                aria-pressed={variantId === v.id}
                disabled={v.available <= 0}
                onClick={() => setVariantId(v.id)}
                className="chip disabled:cursor-not-allowed disabled:line-through disabled:opacity-50"
              >
                {v.name}
                {v.available <= 0 && <span className="sr-only"> (sold out)</span>}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      <p role="status" className={`inline-flex items-center gap-2 text-sm font-bold ${soldOut ? "text-coral-700" : low ? "text-sun-700" : "text-mint-700"}`}>
        <span className={`size-2.5 rounded-full ${soldOut ? "bg-coral-500" : low ? "bg-sun-500" : "bg-mint-500"}`} aria-hidden="true" />
        {soldOut ? "Sold out" : low ? `Only ${available} left — order soon` : "In stock — ready to ship"}
      </p>

      {!soldOut && (
        <div>
          <p className="label" id="qty-label">Quantity</p>
          <div className="inline-flex items-center rounded-full border-2 border-plum-200 bg-white" role="group" aria-labelledby="qty-label">
            <button type="button" className="icon-btn" aria-label="Decrease quantity" disabled={qty <= 1} onClick={() => setQty((q) => Math.max(1, q - 1))}>
              <Icon name="minus" size={18} />
            </button>
            <output className="min-w-10 text-center text-base font-bold" aria-live="polite">{qty}</output>
            <button type="button" className="icon-btn" aria-label="Increase quantity" disabled={qty >= maxAddable} onClick={() => setQty((q) => Math.min(maxAddable, q + 1))}>
              <Icon name="plus" size={18} />
            </button>
          </div>
          {inCart > 0 && <p className="hint">{inCart} already in your bag</p>}
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <button type="button" onClick={() => add(false)} disabled={soldOut} className="btn btn-primary btn-lg flex-1">
          <Icon name="bag" size={19} /> {soldOut ? "Sold out" : "Add to bag"}
        </button>
        <button type="button" onClick={() => add(true)} disabled={soldOut} className="btn btn-pink btn-lg flex-1">
          Buy now
        </button>
        <WishlistButton productId={productId} name={name} className="!size-12 shrink-0 self-center border-2 border-plum-200 sm:self-auto" />
      </div>

      <ul className="grid gap-3 rounded-2xl bg-white p-4 text-sm">
        <li className="flex items-start gap-3">
          <Icon name="truck" size={20} className="mt-0.5 shrink-0 text-plum-600" />
          <span>
            <strong>Arrives {eta}</strong>
            <span className="block text-muted">Free standard shipping over {formatMoney(commerceConfig.freeShippingOverCents)}</span>
          </span>
        </li>
        <li className="flex items-start gap-3">
          <Icon name="refresh" size={20} className="mt-0.5 shrink-0 text-plum-600" />
          <span>
            <strong>7-day easy returns</strong>
            <span className="block text-muted">Unworn pieces in original packaging</span>
          </span>
        </li>
        <li className="flex items-start gap-3">
          <Icon name="gift" size={20} className="mt-0.5 shrink-0 text-plum-600" />
          <span>
            <strong>Gift-ready packaging</strong>
            <span className="block text-muted">Every order arrives in a cute little pouch</span>
          </span>
        </li>
      </ul>
    </div>
  );
}
