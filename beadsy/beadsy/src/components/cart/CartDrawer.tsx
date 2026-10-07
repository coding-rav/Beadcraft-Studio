"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { formatMoney } from "@/lib/money";
import { Icon } from "@/components/ui/Icon";
import { useStore } from "@/components/providers/StoreProvider";
import { CartLineRow } from "./CartLineRow";
import { useCartPricing } from "./useCartPricing";

export function CartDrawer() {
  const { cartOpen, setCartOpen, cart } = useStore();
  const pathname = usePathname();
  const panelRef = useRef<HTMLDivElement>(null);
  const { data, loading, error, retry, blocked, purchasable } = useCartPricing({ enabled: cartOpen });

  useEffect(() => setCartOpen(false), [pathname, setCartOpen]);

  useEffect(() => {
    if (!cartOpen) return;
    const prev = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setCartOpen(false);
      if (e.key === "Tab" && panelRef.current) {
        const f = panelRef.current.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),input,[tabindex]:not([tabindex="-1"])');
        if (!f.length) return;
        const first = f[0]!;
        const last = f[f.length - 1]!;
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
      prev?.focus?.();
    };
  }, [cartOpen, setCartOpen]);

  if (!cartOpen) return null;
  const close = () => setCartOpen(false);
  const empty = cart.length === 0;

  return (
    <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true" aria-label="Shopping cart">
      <button type="button" className="absolute inset-0 bg-plum-900/50 backdrop-blur-sm" aria-label="Close cart" tabIndex={-1} onClick={close} />
      <div ref={panelRef} tabIndex={-1} className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-cream-100 shadow-pop outline-none" style={{ animation: "fade-up .3s ease-out both" }}>
        <div className="flex items-center justify-between border-b border-plum-100 px-5 py-4">
          <h2 className="text-2xl font-semibold">Your bag {cart.length > 0 && <span className="text-base font-sans text-muted">({cart.reduce((s, l) => s + l.quantity, 0)})</span>}</h2>
          <button type="button" className="icon-btn" aria-label="Close cart" onClick={close}>
            <Icon name="close" size={22} />
          </button>
        </div>

        {empty ? (
          <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
            <div className="mb-4 grid size-20 place-items-center rounded-full bg-plum-100 text-plum-600">
              <Icon name="bag" size={34} />
            </div>
            <p className="font-display text-2xl font-semibold">Your bag is empty</p>
            <p className="mt-2 text-muted">Lots of tiny beads are waiting for a new home.</p>
            <Link href="/shop" onClick={close} className="btn btn-primary mt-6">
              Start shopping
            </Link>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-5">
              {loading && !data && (
                <div className="space-y-4 py-4" aria-busy="true" aria-label="Loading cart">
                  {[0, 1].map((i) => (
                    <div key={i} className="flex gap-3">
                      <div className="skeleton size-20" />
                      <div className="flex-1 space-y-2">
                        <div className="skeleton h-4 w-3/4" />
                        <div className="skeleton h-4 w-1/3" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {error && !data && (
                <div role="alert" className="my-6 rounded-2xl bg-coral-500/10 p-4 text-center">
                  <p className="font-semibold text-coral-700">We couldn't load your bag.</p>
                  <p className="mt-1 text-sm text-muted">{error}</p>
                  <button type="button" className="btn btn-soft btn-sm mt-3" onClick={() => void retry()}>
                    Try again
                  </button>
                </div>
              )}
              {data && (
                <ul className="divide-y divide-plum-100">
                  {data.lines.map((l) => (
                    <CartLineRow key={l.variantId} line={l} compact onNavigate={close} />
                  ))}
                </ul>
              )}
            </div>

            {data && (
              <div className="border-t border-plum-100 bg-white px-5 py-4">
                {data.totals.freeShippingRemainingCents > 0 ? (
                  <p className="mb-3 text-sm">
                    Add <strong>{formatMoney(data.totals.freeShippingRemainingCents)}</strong> more for <strong>free shipping</strong> 🚚
                  </p>
                ) : data.totals.subtotalCents > 0 ? (
                  <p className="mb-3 text-sm font-semibold text-mint-700">🎉 You've unlocked free shipping!</p>
                ) : null}
                <div className="flex items-baseline justify-between">
                  <span className="font-semibold">Subtotal</span>
                  <span className="text-xl font-bold">{formatMoney(data.totals.subtotalCents)}</span>
                </div>
                <p className="mt-0.5 text-xs text-muted">Shipping, discounts and tax are calculated at checkout.</p>
                <div className="mt-4 grid gap-2">
                  <Link
                    href="/checkout"
                    onClick={close}
                    aria-disabled={blocked || purchasable.length === 0}
                    className={`btn btn-primary btn-lg ${blocked || purchasable.length === 0 ? "pointer-events-none opacity-50" : ""}`}
                  >
                    Checkout
                  </Link>
                  <Link href="/cart" onClick={close} className="btn btn-soft">
                    View full cart
                  </Link>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
