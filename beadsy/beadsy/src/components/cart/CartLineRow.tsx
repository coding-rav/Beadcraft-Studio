"use client";

import Link from "next/link";
import { formatMoney } from "@/lib/money";
import type { CartLineDTO } from "@/lib/types";
import { Icon } from "@/components/ui/Icon";
import { ProductVisual } from "@/components/ui/ProductVisual";
import { useStore } from "@/components/providers/StoreProvider";

const ISSUE_TEXT: Record<string, string> = {
  OUT_OF_STOCK: "Sold out — remove it to continue",
  UNAVAILABLE: "No longer available — remove it to continue",
  NOT_FOUND: "This item is no longer sold",
};

export function CartLineRow({ line, compact = false, onNavigate }: { line: CartLineDTO; compact?: boolean; onNavigate?: () => void }) {
  const { setCartQuantity, removeFromCart, cart } = useStore();
  const qty = cart.find((c) => c.variantId === line.variantId)?.quantity ?? line.quantity;
  const dead = line.quantity === 0;
  const atMax = qty >= line.maxQuantity;
  const thumb = compact ? "size-20" : "size-24 sm:size-28";

  return (
    <li className="flex gap-3 py-4 sm:gap-4">
      <Link href={`/product/${line.slug}`} onClick={onNavigate} className={`relative ${thumb} shrink-0 overflow-hidden rounded-2xl border border-plum-100 ${dead ? "opacity-50 grayscale" : ""}`}>
        <ProductVisual visual={line.image} sizes="112px" />
      </Link>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <Link href={`/product/${line.slug}`} onClick={onNavigate} className="line-clamp-2 font-semibold text-plum-900 hover:underline">
              {line.name}
            </Link>
            {line.variantName && <p className="text-sm text-muted">{line.variantName}</p>}
          </div>
          <button type="button" className="icon-btn -mt-2 -mr-2 size-9 text-muted hover:text-coral-700" aria-label={`Remove ${line.name} from cart`} onClick={() => removeFromCart(line.variantId)}>
            <Icon name="trash" size={17} />
          </button>
        </div>

        {line.issue && ISSUE_TEXT[line.issue] && (
          <p role="alert" className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-coral-700">
            <Icon name="alert" size={15} /> {ISSUE_TEXT[line.issue]}
          </p>
        )}
        {line.issue === "LIMITED" && (
          <p role="status" className="mt-1 text-sm font-semibold text-sun-700">
            Only {line.maxQuantity} left — we've updated your quantity.
          </p>
        )}

        <div className="mt-auto flex items-end justify-between gap-2 pt-2">
          {!dead ? (
            <div className="inline-flex items-center rounded-full border-2 border-plum-200 bg-white" role="group" aria-label={`Quantity for ${line.name}`}>
              <button type="button" className="icon-btn size-9" aria-label="Decrease quantity" onClick={() => setCartQuantity(line.variantId, qty - 1)}>
                <Icon name="minus" size={15} />
              </button>
              <span className="min-w-7 text-center text-sm font-bold" aria-live="polite">
                {qty}
              </span>
              <button type="button" className="icon-btn size-9 disabled:opacity-40" aria-label="Increase quantity" disabled={atMax} onClick={() => setCartQuantity(line.variantId, qty + 1)}>
                <Icon name="plus" size={15} />
              </button>
            </div>
          ) : (
            <span />
          )}
          <div className="text-right">
            <p className="font-bold">{formatMoney(line.unitPriceCents * line.quantity)}</p>
            {line.compareAtCents && !dead && <p className="text-xs text-muted line-through">{formatMoney(line.compareAtCents * line.quantity)}</p>}
            {line.quantity > 1 && <p className="text-xs text-muted">{formatMoney(line.unitPriceCents)} each</p>}
          </div>
        </div>
        {!dead && atMax && line.maxQuantity < 10 && <p className="mt-1 text-xs font-medium text-sun-700">That's all we have in stock</p>}
      </div>
    </li>
  );
}
