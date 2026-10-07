"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { colorSwatch } from "@/lib/colors";
import { SORT_LABELS, withParams } from "@/lib/shop-params";
import type { ShopSort } from "@/lib/catalog";
import { Icon } from "@/components/ui/Icon";

interface Props {
  categories: { slug: string; name: string; count: number }[];
  colors: string[];
  activeCategory?: string;
  basePath: string;
  total: number;
}

const PRICE_PRESETS: { label: string; min?: string; max?: string }[] = [
  { label: "Under ₹200", max: "200" },
  { label: "₹200 – ₹400", min: "200", max: "400" },
  { label: "₹400 – ₹700", min: "400", max: "700" },
  { label: "₹700+", min: "700" },
];

export function SortSelect() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const current = (sp.get("sort") as ShopSort) || "featured";
  return (
    <div className="flex items-center gap-2">
      <label htmlFor="sort" className="text-sm font-semibold whitespace-nowrap text-plum-800">
        Sort by
      </label>
      <select
        id="sort"
        value={current}
        onChange={(e) => router.push(`${pathname}${withParams(sp, { sort: e.target.value === "featured" ? undefined : e.target.value })}`)}
        className="input min-h-10 w-auto rounded-full py-1.5 pr-8 text-sm"
      >
        {(Object.keys(SORT_LABELS) as ShopSort[]).map((k) => (
          <option key={k} value={k}>
            {SORT_LABELS[k]}
          </option>
        ))}
      </select>
    </div>
  );
}

function FilterBody({ categories, colors, activeCategory, basePath, onDone }: Props & { onDone?: () => void }) {
  const router = useRouter();
  const sp = useSearchParams();
  const q = sp.get("q") ?? "";
  const selectedColors = (sp.get("colors") ?? "").split(",").filter(Boolean);
  const [min, setMin] = useState(sp.get("min") ?? "");
  const [max, setMax] = useState(sp.get("max") ?? "");

  useEffect(() => {
    setMin(sp.get("min") ?? "");
    setMax(sp.get("max") ?? "");
  }, [sp]);

  const go = (o: Record<string, string | undefined>) => {
    router.push(`${basePath}${withParams(sp, o)}`);
  };
  const toggleColor = (c: string) => {
    const next = selectedColors.includes(c) ? selectedColors.filter((x) => x !== c) : [...selectedColors, c];
    go({ colors: next.length ? next.join(",") : undefined });
  };
  const hasFilters = Boolean(sp.get("min") || sp.get("max") || sp.get("colors") || sp.get("stock"));

  return (
    <div className="space-y-7">
      <section aria-labelledby="f-cat">
        <h3 id="f-cat" className="mb-3 font-sans text-sm font-bold tracking-widest text-plum-600 uppercase">Category</h3>
        <ul className="space-y-1">
          <li>
            <Link href={`/shop${withParams(sp, { page: undefined })}`} onClick={onDone} aria-current={!activeCategory ? "page" : undefined} className={`flex justify-between rounded-xl px-3 py-2 text-sm font-semibold hover:bg-plum-100 ${!activeCategory ? "bg-plum-100 text-plum-800" : ""}`}>
              All products
            </Link>
          </li>
          {categories.map((c) => (
            <li key={c.slug}>
              <Link href={`/shop/${c.slug}${withParams(sp, { page: undefined })}`} onClick={onDone} aria-current={activeCategory === c.slug ? "page" : undefined} className={`flex justify-between rounded-xl px-3 py-2 text-sm font-semibold hover:bg-plum-100 ${activeCategory === c.slug ? "bg-plum-100 text-plum-800" : ""}`}>
                <span>{c.name}</span>
                <span className="text-muted">{c.count}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="f-price">
        <h3 id="f-price" className="mb-3 font-sans text-sm font-bold tracking-widest text-plum-600 uppercase">Price</h3>
        <div className="mb-3 flex flex-wrap gap-2">
          {PRICE_PRESETS.map((p) => {
            const on = (sp.get("min") ?? "") === (p.min ?? "") && (sp.get("max") ?? "") === (p.max ?? "");
            return (
              <button key={p.label} type="button" className="chip" aria-pressed={on} onClick={() => go(on ? { min: undefined, max: undefined } : { min: p.min, max: p.max })}>
                {p.label}
              </button>
            );
          })}
        </div>
        <form
          className="flex items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            go({ min: min || undefined, max: max || undefined });
          }}
        >
          <div className="flex-1">
            <label htmlFor="price-min" className="hint !mt-0 mb-1 block">Min ₹</label>
            <input id="price-min" inputMode="numeric" pattern="[0-9]*" value={min} onChange={(e) => setMin(e.target.value.replace(/\D/g, ""))} className="input min-h-10 py-1.5 text-sm" placeholder="0" />
          </div>
          <div className="flex-1">
            <label htmlFor="price-max" className="hint !mt-0 mb-1 block">Max ₹</label>
            <input id="price-max" inputMode="numeric" pattern="[0-9]*" value={max} onChange={(e) => setMax(e.target.value.replace(/\D/g, ""))} className="input min-h-10 py-1.5 text-sm" placeholder="Any" />
          </div>
          <button type="submit" className="btn btn-soft btn-sm min-h-10">Go</button>
        </form>
      </section>

      {colors.length > 0 && (
        <section aria-labelledby="f-color">
          <h3 id="f-color" className="mb-3 font-sans text-sm font-bold tracking-widest text-plum-600 uppercase">Colour</h3>
          <div className="flex flex-wrap gap-2.5">
            {colors.map((c) => {
              const on = selectedColors.includes(c);
              return (
                <button
                  key={c}
                  type="button"
                  aria-pressed={on}
                  aria-label={c}
                  title={c}
                  onClick={() => toggleColor(c)}
                  className={`relative size-9 rounded-full border-2 transition hover:scale-110 ${on ? "border-plum-800 ring-2 ring-plum-300 ring-offset-2" : "border-plum-200"}`}
                  style={{ background: colorSwatch(c) }}
                >
                  {on && <Icon name="check" size={16} className={`absolute inset-0 m-auto ${["white", "yellow", "pastel", "mint"].includes(c) ? "text-plum-900" : "text-white"}`} />}
                </button>
              );
            })}
          </div>
        </section>
      )}

      <section aria-labelledby="f-avail">
        <h3 id="f-avail" className="mb-3 font-sans text-sm font-bold tracking-widest text-plum-600 uppercase">Availability</h3>
        <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm font-semibold">
          <input type="checkbox" className="size-5 accent-plum-700" checked={sp.get("stock") === "1"} onChange={(e) => go({ stock: e.target.checked ? "1" : undefined })} />
          In stock only
        </label>
      </section>

      {hasFilters && (
        <button type="button" className="btn btn-secondary btn-sm w-full" onClick={() => { go({ min: undefined, max: undefined, colors: undefined, stock: undefined }); }}>
          Clear all filters
        </button>
      )}
      {q && <p className="hint">Searching for “{q}”</p>}
    </div>
  );
}

export function Filters(props: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <>
      <aside className="hidden lg:block" aria-label="Filters">
        <div className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto pr-3">
          <FilterBody {...props} />
        </div>
      </aside>

      <button type="button" className="btn btn-soft lg:hidden" onClick={() => setOpen(true)} aria-haspopup="dialog">
        <Icon name="filter" size={18} /> Filters
      </button>

      <dialog
        ref={ref}
        onClose={() => setOpen(false)}
        onClick={(e) => {
          if (e.target === ref.current) setOpen(false);
        }}
        aria-label="Filters"
        className="m-0 mt-auto h-auto max-h-[88vh] w-full max-w-none overflow-hidden rounded-t-3xl border-0 bg-cream-100 p-0 shadow-pop"
      >
        <div className="flex max-h-[88vh] flex-col">
          <div className="flex items-center justify-between border-b border-plum-100 px-5 py-4">
            <h2 className="text-2xl font-semibold">Filters</h2>
            <button type="button" className="icon-btn" aria-label="Close filters" onClick={() => setOpen(false)}>
              <Icon name="close" size={22} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-5">
            <FilterBody {...props} onDone={() => setOpen(false)} />
          </div>
          <div className="border-t border-plum-100 bg-white p-4">
            <button type="button" className="btn btn-primary btn-lg w-full" onClick={() => setOpen(false)}>
              Show {props.total} {props.total === 1 ? "result" : "results"}
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
