"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useStore } from "@/components/providers/StoreProvider";
import type { CartValidationDTO } from "@/lib/types";

type Status = "idle" | "loading" | "ready" | "error";

/**
 * Prices the current cart on the server. The browser only sends variant ids and quantities;
 * every amount shown comes back from /api/cart/validate.
 */
export function useCartPricing(opts: { delivery?: "STANDARD" | "EXPRESS"; couponCode?: string; email?: string; enabled?: boolean } = {}) {
  const { cart, ready, setCartQuantity, removeFromCart } = useStore();
  const { delivery = "STANDARD", couponCode, email, enabled = true } = opts;
  const [data, setData] = useState<CartValidationDTO | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const seq = useRef(0);

  const key = JSON.stringify(cart);

  const run = useCallback(async () => {
    const id = ++seq.current;
    if (cart.length === 0) {
      setData(null);
      setStatus("ready");
      return;
    }
    setStatus((s) => (s === "ready" ? s : "loading"));
    try {
      const res = await fetch("/api/cart/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: cart, couponCode: couponCode || undefined, delivery, email: email || undefined }),
      });
      const body = (await res.json()) as CartValidationDTO & { error?: string };
      if (id !== seq.current) return;
      if (!res.ok) throw new Error(body.error ?? "Could not load your cart");
      setData(body);
      setError(null);
      setStatus("ready");
    } catch (e) {
      if (id !== seq.current) return;
      setError(e instanceof Error ? e.message : "Network error");
      setStatus("error");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, couponCode, delivery, email]);

  useEffect(() => {
    if (!ready || !enabled) return;
    const t = window.setTimeout(() => void run(), 120);
    return () => window.clearTimeout(t);
  }, [ready, enabled, run]);

  // Clean up lines the server says no longer exist, and clamp quantities to available stock.
  useEffect(() => {
    if (!data) return;
    data.removedVariantIds.forEach((id) => removeFromCart(id));
    data.lines.forEach((l) => {
      if (l.issue === "LIMITED" && l.quantity > 0 && l.quantity < l.requestedQuantity) setCartQuantity(l.variantId, l.quantity);
    });
  }, [data, removeFromCart, setCartQuantity]);

  const blocked = data?.lines.some((l) => l.issue === "OUT_OF_STOCK" || l.issue === "UNAVAILABLE") ?? false;
  const purchasable = data?.lines.filter((l) => l.quantity > 0) ?? [];

  return { data, status, error, retry: run, blocked, purchasable, loading: status === "loading" || !ready };
}
