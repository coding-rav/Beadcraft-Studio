"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { commerceConfig } from "@/lib/config";
import type { CartLineInput, SessionUser } from "@/lib/types";

/* ------------------------------------------------------------------ helpers */
const CART_KEY = "beadsy.cart.v1";
const WISH_KEY = "beadsy.wishlist.v1";
const RECENT_KEY = "beadsy.recent.v1";

function readLS<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function writeLS(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable (private mode / quota) — state still works in memory */
  }
}

function sanitizeCart(raw: unknown): CartLineInput[] {
  if (!Array.isArray(raw)) return [];
  const out: CartLineInput[] = [];
  for (const r of raw) {
    if (r && typeof r === "object" && typeof (r as CartLineInput).variantId === "string") {
      const q = Math.floor(Number((r as CartLineInput).quantity));
      if (q >= 1) out.push({ variantId: (r as CartLineInput).variantId, quantity: Math.min(q, commerceConfig.maxQuantityPerLine) });
    }
  }
  return out.slice(0, commerceConfig.maxCartLines);
}

function mergeCarts(a: CartLineInput[], b: CartLineInput[]): CartLineInput[] {
  const map = new Map<string, number>();
  for (const l of [...a, ...b]) {
    map.set(l.variantId, Math.max(map.get(l.variantId) ?? 0, l.quantity)); // max, not sum: avoids doubling on every login
  }
  return [...map.entries()].map(([variantId, quantity]) => ({ variantId, quantity }));
}

/* ------------------------------------------------------------------ toast */
interface Toast {
  id: number;
  message: string;
  tone: "success" | "error" | "info";
}

/* ---------------------------------------------------------------- contexts */
interface StoreContextValue {
  ready: boolean;
  user: SessionUser | null;
  refreshUser: () => Promise<void>;

  cart: CartLineInput[];
  cartCount: number;
  addToCart: (variantId: string, quantity?: number) => void;
  setCartQuantity: (variantId: string, quantity: number) => void;
  removeFromCart: (variantId: string) => void;
  clearCart: () => void;
  cartOpen: boolean;
  setCartOpen: (open: boolean) => void;

  wishlist: string[];
  isWished: (productId: string) => boolean;
  toggleWishlist: (productId: string) => Promise<void>;

  toast: (message: string, tone?: Toast["tone"]) => void;
}

const StoreContext = createContext<StoreContextValue | null>(null);

export function useStore(): StoreContextValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside <StoreProvider>");
  return ctx;
}

export function pushRecentlyViewed(productId: string) {
  const ids = readLS<string[]>(RECENT_KEY, []).filter((id) => id !== productId);
  ids.unshift(productId);
  writeLS(RECENT_KEY, ids.slice(0, 12));
}
export function readRecentlyViewed(): string[] {
  return readLS<string[]>(RECENT_KEY, []);
}

/* ---------------------------------------------------------------- provider */
export function StoreProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [cart, setCart] = useState<CartLineInput[]>([]);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastId = useRef(0);
  const hydrated = useRef(false);
  const syncedFor = useRef<string | null>(null);

  const toast = useCallback((message: string, tone: Toast["tone"] = "success") => {
    const id = ++toastId.current;
    setToasts((t) => [...t.slice(-2), { id, message, tone }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3800);
  }, []);

  /* ---- initial load: localStorage first (instant), then session ---- */
  useEffect(() => {
    setCart(sanitizeCart(readLS<unknown>(CART_KEY, [])));
    setWishlist(readLS<string[]>(WISH_KEY, []).filter((x) => typeof x === "string"));
    hydrated.current = true;
    void refreshUser().finally(() => setReady(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const res = await fetch("/api/me", { cache: "no-store" });
      const data = (await res.json()) as { user: SessionUser | null };
      setUser(data.user);
    } catch {
      setUser(null);
    }
  }, []);

  /* ---- when a user signs in, merge local ↔ server copies once ---- */
  useEffect(() => {
    if (!user || syncedFor.current === user.id) return;
    syncedFor.current = user.id;
    (async () => {
      try {
        const [cr, wr] = await Promise.all([fetch("/api/cart"), fetch("/api/wishlist")]);
        if (cr.ok) {
          const server = sanitizeCart(((await cr.json()) as { items: unknown }).items);
          setCart((local) => mergeCarts(server, local));
        }
        if (wr.ok) {
          const serverIds = ((await wr.json()) as { items: { productId: string }[] }).items.map((i) => i.productId);
          const local = readLS<string[]>(WISH_KEY, []);
          const missing = local.filter((id) => !serverIds.includes(id));
          await Promise.all(
            missing.map((productId) =>
              fetch("/api/wishlist", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productId }) }),
            ),
          );
          setWishlist([...new Set([...serverIds, ...local])]);
        }
      } catch {
        /* offline — keep local copies */
      }
    })();
  }, [user]);

  /* ---- persist cart (localStorage always; server copy debounced when signed in) ---- */
  useEffect(() => {
    if (!hydrated.current) return;
    writeLS(CART_KEY, cart);
    if (!user || syncedFor.current !== user.id) return;
    const t = window.setTimeout(() => {
      void fetch("/api/cart", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items: cart }) }).catch(() => {});
    }, 700);
    return () => window.clearTimeout(t);
  }, [cart, user]);

  useEffect(() => {
    if (hydrated.current) writeLS(WISH_KEY, wishlist);
  }, [wishlist]);

  /* ---- keep tabs in sync ---- */
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === CART_KEY) setCart(sanitizeCart(readLS<unknown>(CART_KEY, [])));
      if (e.key === WISH_KEY) setWishlist(readLS<string[]>(WISH_KEY, []));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  /* ---- cart actions ---- */
  const addToCart = useCallback((variantId: string, quantity = 1) => {
    setCart((c) => {
      const existing = c.find((l) => l.variantId === variantId);
      if (existing) {
        return c.map((l) =>
          l.variantId === variantId ? { ...l, quantity: Math.min(l.quantity + quantity, commerceConfig.maxQuantityPerLine) } : l,
        );
      }
      if (c.length >= commerceConfig.maxCartLines) return c;
      return [...c, { variantId, quantity: Math.min(quantity, commerceConfig.maxQuantityPerLine) }];
    });
  }, []);

  const setCartQuantity = useCallback((variantId: string, quantity: number) => {
    setCart((c) =>
      quantity <= 0
        ? c.filter((l) => l.variantId !== variantId)
        : c.map((l) => (l.variantId === variantId ? { ...l, quantity: Math.min(quantity, commerceConfig.maxQuantityPerLine) } : l)),
    );
  }, []);

  const removeFromCart = useCallback((variantId: string) => setCart((c) => c.filter((l) => l.variantId !== variantId)), []);
  const clearCart = useCallback(() => setCart([]), []);

  /* ---- wishlist ---- */
  const toggleWishlist = useCallback(
    async (productId: string) => {
      const has = wishlist.includes(productId);
      setWishlist((w) => (has ? w.filter((x) => x !== productId) : [...w, productId]));
      toast(has ? "Removed from wishlist" : "Saved to wishlist 💜", "info");
      if (!user) return;
      try {
        const res = await fetch("/api/wishlist", {
          method: has ? "DELETE" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productId }),
        });
        if (!res.ok) throw new Error("wishlist sync failed");
      } catch {
        setWishlist((w) => (has ? [...w, productId] : w.filter((x) => x !== productId))); // roll back
        toast("Couldn't update your wishlist. Please try again.", "error");
      }
    },
    [wishlist, user, toast],
  );

  const value = useMemo<StoreContextValue>(
    () => ({
      ready,
      user,
      refreshUser,
      cart,
      cartCount: cart.reduce((s, l) => s + l.quantity, 0),
      addToCart,
      setCartQuantity,
      removeFromCart,
      clearCart,
      cartOpen,
      setCartOpen,
      wishlist,
      isWished: (id: string) => wishlist.includes(id),
      toggleWishlist,
      toast,
    }),
    [ready, user, refreshUser, cart, addToCart, setCartQuantity, removeFromCart, clearCart, cartOpen, wishlist, toggleWishlist, toast],
  );

  return (
    <StoreContext.Provider value={value}>
      {children}
      <div aria-live="polite" role="status" className="pointer-events-none fixed inset-x-0 bottom-4 z-[90] flex flex-col items-center gap-2 px-4">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`animate-pop pointer-events-auto max-w-sm rounded-full px-5 py-3 text-sm font-semibold shadow-pop ${
              t.tone === "error" ? "bg-coral-700 text-white" : t.tone === "info" ? "bg-plum-800 text-white" : "bg-mint-700 text-white"
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </StoreContext.Provider>
  );
}
