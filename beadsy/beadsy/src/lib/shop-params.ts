import type { ShopQuery, ShopSort } from "./catalog";

export type RawParams = Record<string, string | string[] | undefined>;

const SORTS: ShopSort[] = ["featured", "newest", "price-asc", "price-desc", "best", "rating"];

export const SORT_LABELS: Record<ShopSort, string> = {
  featured: "Featured",
  newest: "Newest",
  "price-asc": "Price: low to high",
  "price-desc": "Price: high to low",
  best: "Best selling",
  rating: "Top rated",
};

function one(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

function rupees(v: string | undefined): number | undefined {
  if (!v) return undefined;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 && n < 10_000_000 ? Math.round(n * 100) : undefined;
}

/** Parses and sanitises user-controlled query params. Anything invalid is ignored. */
export function parseShopParams(raw: RawParams, category?: string): ShopQuery {
  const sort = one(raw.sort);
  const page = Number(one(raw.page));
  const colors = (one(raw.colors) ?? "")
    .split(",")
    .map((c) => c.trim().toLowerCase())
    .filter((c) => /^[a-z]{2,20}$/.test(c))
    .slice(0, 6);
  return {
    category,
    q: one(raw.q)?.slice(0, 60),
    min: rupees(one(raw.min)),
    max: rupees(one(raw.max)),
    colors: colors.length ? colors : undefined,
    inStockOnly: one(raw.stock) === "1",
    sort: SORTS.includes(sort as ShopSort) ? (sort as ShopSort) : undefined,
    page: Number.isInteger(page) && page > 0 && page < 1000 ? page : 1,
  };
}

/** Builds a query string from the current params, applying overrides (undefined/empty removes a key). */
export function withParams(current: URLSearchParams | RawParams, overrides: Record<string, string | undefined>): string {
  const sp = new URLSearchParams();
  if (current instanceof URLSearchParams) current.forEach((v, k) => sp.set(k, v));
  else for (const [k, v] of Object.entries(current)) if (typeof one(v) === "string") sp.set(k, one(v)!);
  for (const [k, v] of Object.entries(overrides)) {
    if (v === undefined || v === "") sp.delete(k);
    else sp.set(k, v);
  }
  if (!("page" in overrides)) sp.delete("page");
  const s = sp.toString();
  return s ? `?${s}` : "";
}
