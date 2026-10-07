"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { formatMoney } from "@/lib/money";
import type { SearchResult } from "@/lib/search";
import { Icon } from "@/components/ui/Icon";
import { ProductVisual } from "@/components/ui/ProductVisual";

const RECENT_KEY = "beadsy.searches.v1";

function readRecent(): string[] {
  try {
    const v = JSON.parse(window.localStorage.getItem(RECENT_KEY) ?? "[]") as unknown;
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").slice(0, 6) : [];
  } catch {
    return [];
  }
}
function saveRecent(term: string) {
  try {
    const next = [term, ...readRecent().filter((t) => t.toLowerCase() !== term.toLowerCase())].slice(0, 6);
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

const POPULAR = ["bracelet", "pastel", "keychain", "gift set", "flower"];

export function SearchBox({ autoFocus = false, onNavigate }: { autoFocus?: boolean; onNavigate?: () => void }) {
  const router = useRouter();
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);
  const [active, setActive] = useState(-1);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setResult(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const ctrl = new AbortController();
    const t = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(term)}`, { signal: ctrl.signal });
        if (res.ok) setResult((await res.json()) as SearchResult);
      } catch {
        /* aborted or offline */
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    }, 220);
    return () => {
      window.clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const go = (term: string) => {
    const t = term.trim();
    if (!t) return;
    saveRecent(t);
    setOpen(false);
    onNavigate?.();
    router.push(`/search?q=${encodeURIComponent(t)}`);
  };

  const products = result?.products ?? [];
  const showResults = q.trim().length >= 2;

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setOpen(false);
      inputRef.current?.blur();
    } else if (e.key === "ArrowDown" && products.length) {
      e.preventDefault();
      setActive((a) => (a + 1) % products.length);
    } else if (e.key === "ArrowUp" && products.length) {
      e.preventDefault();
      setActive((a) => (a <= 0 ? products.length - 1 : a - 1));
    } else if (e.key === "Enter" && active >= 0 && products[active]) {
      e.preventDefault();
      saveRecent(q.trim());
      setOpen(false);
      onNavigate?.();
      router.push(`/product/${products[active]!.slug}`);
    }
  };

  return (
    <div ref={wrapRef} className="relative w-full">
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          go(q);
        }}
      >
        <label htmlFor={`${listId}-input`} className="sr-only">
          Search Beadsy
        </label>
        <div className="relative">
          <Icon name="search" size={18} className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-plum-500" />
          <input
            ref={inputRef}
            id={`${listId}-input`}
            type="search"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setOpen(true);
              setActive(-1);
            }}
            onFocus={() => {
              setRecent(readRecent());
              setOpen(true);
            }}
            onKeyDown={onKeyDown}
            placeholder="Search bracelets, charms, gifts…"
            autoComplete="off"
            role="combobox"
            aria-expanded={open}
            aria-controls={`${listId}-list`}
            aria-autocomplete="list"
            maxLength={60}
            className="input rounded-full !border-plum-200 !bg-white/90 pl-11"
          />
        </div>
      </form>

      {open && (
        <div
          id={`${listId}-list`}
          className="absolute inset-x-0 top-full z-50 mt-2 max-h-[70vh] overflow-y-auto rounded-2xl border border-plum-100 bg-white p-2 shadow-pop"
        >
          {!showResults && (
            <div className="p-2">
              {recent.length > 0 && (
                <>
                  <p className="eyebrow mb-2 px-1">Recent searches</p>
                  <ul className="mb-3 flex flex-wrap gap-2">
                    {recent.map((r) => (
                      <li key={r}>
                        <button type="button" className="chip" onClick={() => go(r)}>
                          <Icon name="refresh" size={13} /> {r}
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              )}
              <p className="eyebrow mb-2 px-1">Popular right now</p>
              <ul className="flex flex-wrap gap-2">
                {POPULAR.map((r) => (
                  <li key={r}>
                    <button type="button" className="chip" onClick={() => go(r)}>
                      {r}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {showResults && loading && !result && <p className="p-4 text-sm text-muted">Searching…</p>}

          {showResults && result && products.length === 0 && result.categories.length === 0 && (
            <div className="p-5 text-center">
              <p className="font-display text-lg font-semibold">No matches for “{q.trim()}”</p>
              <p className="mt-1 text-sm text-muted">Try a simpler word like “bracelet”, or browse everything.</p>
              <Link href="/shop" onClick={() => { setOpen(false); onNavigate?.(); }} className="btn btn-soft btn-sm mt-3">
                Browse the shop
              </Link>
            </div>
          )}

          {showResults && result?.fuzzy && result.didYouMean && (
            <p className="px-3 pt-2 pb-1 text-xs text-muted">
              Nothing exact — did you mean <strong className="text-plum-800">{result.didYouMean}</strong>?
            </p>
          )}

          {showResults && result && result.categories.length > 0 && (
            <ul className="mb-1">
              {result.categories.map((c) => (
                <li key={c.slug}>
                  <Link
                    href={`/shop/${c.slug}`}
                    onClick={() => { setOpen(false); onNavigate?.(); }}
                    className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-plum-800 hover:bg-plum-50"
                  >
                    <Icon name="tag" size={15} /> All {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          )}

          {showResults && products.length > 0 && (
            <ul role="listbox" aria-label="Product suggestions">
              {products.map((p, i) => (
                <li key={p.id} role="option" aria-selected={i === active}>
                  <Link
                    href={`/product/${p.slug}`}
                    onClick={() => { saveRecent(q.trim()); setOpen(false); onNavigate?.(); }}
                    className={`flex items-center gap-3 rounded-xl p-2 hover:bg-plum-50 ${i === active ? "bg-plum-50" : ""}`}
                  >
                    <span className="relative size-12 shrink-0 overflow-hidden rounded-lg">
                      <ProductVisual visual={p.images[0]!} sizes="48px" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{p.name}</span>
                      <span className="block text-xs text-muted">{p.categoryName}</span>
                    </span>
                    <span className="text-sm font-bold">{formatMoney(p.salePriceCents ?? p.priceCents)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          {showResults && q.trim().length >= 2 && (
            <button type="button" onClick={() => go(q)} className="mt-1 w-full rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-plum-700 hover:bg-plum-50">
              See all results for “{q.trim()}” →
            </button>
          )}
        </div>
      )}
    </div>
  );
}
