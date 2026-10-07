"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useStore } from "@/components/providers/StoreProvider";
import { clearCheckoutPrefs } from "@/lib/checkout-state";

/** The order is confirmed paid by the server: now (and only now) it's safe to empty the bag. */
export function ClearCartOnPaid() {
  const { clearCart, ready } = useStore();
  useEffect(() => {
    if (!ready) return;
    clearCart();
    clearCheckoutPrefs();
  }, [ready, clearCart]);
  return null;
}

/** Re-renders the server page every few seconds while the webhook is still on its way. */
export function PendingPoller() {
  const router = useRouter();
  useEffect(() => {
    let n = 0;
    const id = window.setInterval(() => {
      n++;
      router.refresh();
      if (n >= 20) window.clearInterval(id);
    }, 3000);
    return () => window.clearInterval(id);
  }, [router]);
  return null;
}
