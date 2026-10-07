"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CartLineRow } from "@/components/cart/CartLineRow";
import { CouponBox } from "@/components/cart/CouponBox";
import { OrderSummary } from "@/components/cart/OrderSummary";
import { useCartPricing } from "@/components/cart/useCartPricing";
import { useStore } from "@/components/providers/StoreProvider";
import { StatePanel } from "@/components/ui/States";
import { commerceConfig } from "@/lib/config";
import { formatMoney } from "@/lib/money";
import { readCheckoutPrefs, writeCheckoutPrefs } from "@/lib/checkout-state";

export function CartView() {
  const { cart, ready, clearCart } = useStore();
  const [coupon, setCoupon] = useState("");
  const [delivery, setDelivery] = useState<"STANDARD" | "EXPRESS">("STANDARD");
  const [loadedPrefs, setLoadedPrefs] = useState(false);

  useEffect(() => {
    const p = readCheckoutPrefs();
    if (p.couponCode) setCoupon(p.couponCode);
    if (p.delivery) setDelivery(p.delivery);
    setLoadedPrefs(true);
  }, []);

  const { data, loading, error, retry, blocked, purchasable } = useCartPricing({ couponCode: coupon, delivery, enabled: loadedPrefs });

  useEffect(() => {
    if (loadedPrefs) writeCheckoutPrefs({ couponCode: data?.coupon?.valid ? coupon : undefined, delivery });
  }, [loadedPrefs, coupon, delivery, data?.coupon?.valid]);

  if (ready && cart.length === 0) {
    return (
      <StatePanel
        art="bracelet"
        title="Your bag is empty"
        message="Looks like you haven't picked any beads yet. Let's fix that."
        actions={[{ label: "Start shopping", href: "/shop" }, { label: "See best sellers", href: "/shop?sort=best", variant: "secondary" }]}
      />
    );
  }

  const canCheckout = Boolean(data) && !blocked && purchasable.length > 0;

  return (
    <div className="container-x py-8 sm:py-12">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-4xl font-semibold sm:text-5xl">Your bag</h1>
        <button type="button" className="text-sm font-semibold text-muted underline hover:text-coral-700" onClick={clearCart}>
          Clear bag
        </button>
      </div>

      {error && !data && (
        <div role="alert" className="card mb-6 bg-coral-500/10 p-6 text-center">
          <p className="font-bold text-coral-700">We couldn't load your bag</p>
          <p className="mt-1 text-sm text-muted">{error}. Check your connection and try again.</p>
          <button type="button" className="btn btn-primary btn-sm mt-3" onClick={() => void retry()}>
            Retry
          </button>
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-[1fr_380px] lg:gap-12">
        <section aria-label="Items in your bag" className="card px-4 sm:px-6">
          {loading && !data ? (
            <div className="space-y-5 py-6" aria-busy="true" aria-label="Loading your bag">
              {Array.from({ length: Math.min(cart.length, 3) || 2 }, (_, i) => (
                <div key={i} className="flex gap-4">
                  <div className="skeleton size-24" />
                  <div className="flex-1 space-y-2">
                    <div className="skeleton h-4 w-2/3" />
                    <div className="skeleton h-4 w-1/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : data ? (
            <ul className="divide-y divide-plum-100">
              {data.lines.map((l) => (
                <CartLineRow key={l.variantId} line={l} />
              ))}
            </ul>
          ) : null}
        </section>

        <aside aria-label="Order summary" className="lg:sticky lg:top-28 lg:self-start">
          <div className="card space-y-5 p-5 sm:p-6">
            <h2 className="text-2xl font-semibold">Summary</h2>

            <CouponBox applied={coupon} result={data?.coupon ?? null} onApply={setCoupon} />

            <fieldset>
              <legend className="label">Delivery</legend>
              <div className="grid gap-2">
                {(["STANDARD", "EXPRESS"] as const).map((m) => {
                  const est = commerceConfig.deliveryEstimates[m];
                  const cost = m === "STANDARD" ? commerceConfig.standardShippingCents : commerceConfig.expressShippingCents;
                  return (
                    <label key={m} className={`flex cursor-pointer items-center gap-3 rounded-2xl border-2 p-3 text-sm transition ${delivery === m ? "border-plum-700 bg-plum-50" : "border-plum-100 hover:border-plum-300"}`}>
                      <input type="radio" name="delivery" checked={delivery === m} onChange={() => setDelivery(m)} className="size-4 accent-plum-700" />
                      <span className="flex-1">
                        <span className="block font-bold">{est.label}</span>
                        <span className="text-muted">{est.minDays}–{est.maxDays} working days</span>
                      </span>
                      <span className="font-bold">{m === "STANDARD" && data && data.totals.shippingCents === 0 && delivery === "STANDARD" ? "Free" : formatMoney(cost)}</span>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            {data ? <OrderSummary data={data} /> : <div className="skeleton h-40" />}

            {data && data.totals.freeShippingRemainingCents > 0 && (
              <p className="text-sm">
                Add <strong>{formatMoney(data.totals.freeShippingRemainingCents)}</strong> more for free standard shipping.
              </p>
            )}

            {blocked && (
              <p role="alert" className="rounded-xl bg-coral-500/10 p-3 text-sm font-semibold text-coral-700">
                Remove the unavailable items above to continue.
              </p>
            )}

            <Link href="/checkout" aria-disabled={!canCheckout} className={`btn btn-primary btn-lg w-full ${canCheckout ? "" : "pointer-events-none opacity-50"}`}>
              Checkout securely
            </Link>
            <Link href="/shop" className="block text-center text-sm font-semibold text-plum-700 underline underline-offset-4">
              Continue shopping
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
