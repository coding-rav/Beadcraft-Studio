"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { BeadArt } from "@/components/art/BeadArt";
import { useStore } from "@/components/providers/StoreProvider";
import { slugify } from "@/lib/utils";
import { useAdminApi } from "./useAdminApi";

export interface ProductFormValues {
  id?: string;
  name: string;
  slug: string;
  shortDescription: string;
  description: string;
  categoryId: string;
  price: string;
  salePrice: string;
  sku: string;
  tags: string;
  colors: string;
  palette: string;
  artKind: "bracelet" | "necklace" | "keychain" | "charm" | "anklet" | "giftset";
  material: string;
  dimensions: string;
  care: string;
  isActive: boolean;
  isFeatured: boolean;
  images: { url: string; alt: string }[];
  variants: { id?: string; name: string; sku: string; color: string; priceOverride: string; quantity: string; lowStockThreshold: string; isActive: boolean }[];
}

export const EMPTY_PRODUCT: ProductFormValues = {
  name: "", slug: "", shortDescription: "", description: "", categoryId: "", price: "", salePrice: "", sku: "",
  tags: "", colors: "", palette: "#F58FB0, #F8D26B, #9B79AE, #98C99A", artKind: "bracelet", material: "", dimensions: "", care: "",
  isActive: true, isFeatured: false, images: [],
  variants: [{ name: "Standard", sku: "", color: "", priceOverride: "", quantity: "10", lowStockThreshold: "5", isActive: true }],
};

const list = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);
const num = (s: string) => (s.trim() === "" ? null : Number(s));

export function ProductForm({ initial, categories }: { initial: ProductFormValues; categories: { id: string; name: string }[] }) {
  const router = useRouter();
  const { toast } = useStore();
  const { call, busy, error, fieldErrors } = useAdminApi();
  const [v, setV] = useState<ProductFormValues>(initial);
  const [uploading, setUploading] = useState(false);
  const [newUrl, setNewUrl] = useState("");
  const isEdit = Boolean(initial.id);
  const set = <K extends keyof ProductFormValues>(k: K, val: ProductFormValues[K]) => setV((p) => ({ ...p, [k]: val }));
  const err = (k: string) => fieldErrors[k];

  const payload = () => ({
    name: v.name,
    slug: v.slug || undefined,
    shortDescription: v.shortDescription,
    description: v.description,
    categoryId: v.categoryId,
    price: Number(v.price),
    salePrice: num(v.salePrice),
    sku: v.sku,
    tags: list(v.tags),
    colors: list(v.colors),
    palette: list(v.palette),
    artKind: v.artKind,
    material: v.material || null,
    dimensions: v.dimensions || null,
    care: v.care || null,
    isActive: v.isActive,
    isFeatured: v.isFeatured,
    images: v.images.filter((i) => i.url.trim()),
    variants: v.variants.map((x) => ({
      id: x.id,
      name: x.name,
      sku: x.sku,
      color: x.color || null,
      priceOverride: num(x.priceOverride),
      quantity: Number(x.quantity || 0),
      lowStockThreshold: Number(x.lowStockThreshold || 0),
      isActive: x.isActive,
    })),
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await call<{ id?: string }>(isEdit ? `/api/admin/products/${initial.id}` : "/api/admin/products", isEdit ? "PUT" : "POST", payload(), isEdit ? "Product saved" : "Product created");
    if (res && !isEdit) router.push("/admin/products");
  };

  const remove = async () => {
    if (!window.confirm("Delete this product permanently? Past orders keep their details.")) return;
    const res = await call(`/api/admin/products/${initial.id}`, "DELETE", undefined, "Product deleted");
    if (res) router.push("/admin/products");
  };

  const upload = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error ?? "Upload failed");
      setV((p) => ({ ...p, images: [...p.images, { url: data.url!, alt: p.name }] }));
    } catch (e) {
      toast(e instanceof Error ? e.message : "Upload failed", "error");
    } finally {
      setUploading(false);
    }
  };

  const field = (id: string, label: string, el: React.ReactNode, hint?: string) => (
    <div>
      <label htmlFor={id} className="label">{label}</label>
      {el}
      {err(id) && <p className="field-error" role="alert">{err(id)}</p>}
      {hint && <p className="hint">{hint}</p>}
    </div>
  );

  return (
    <form onSubmit={submit} className="space-y-6" noValidate>
      <section className="card grid gap-4 p-5 sm:grid-cols-2 sm:p-6" aria-labelledby="pf-basic">
        <h3 id="pf-basic" className="font-sans text-lg font-bold sm:col-span-2">Basics</h3>
        <div className="sm:col-span-2">{field("name", "Name", <input id="name" className="input" value={v.name} maxLength={120} onChange={(e) => { set("name", e.target.value); if (!isEdit && !v.slug) { /* slug auto-fills on blur */ } }} onBlur={() => !v.slug && !isEdit && set("slug", slugify(v.name))} required />)}</div>
        {field("slug", "URL slug", <input id="slug" className="input" value={v.slug} onChange={(e) => set("slug", e.target.value.toLowerCase())} placeholder="colorful-bead-bracelet" />, "Lowercase letters, numbers and dashes. Becomes /product/your-slug")}
        {field("sku", "SKU", <input id="sku" className="input" value={v.sku} onChange={(e) => set("sku", e.target.value)} required />)}
        <div className="sm:col-span-2">{field("shortDescription", "Short description", <input id="shortDescription" className="input" value={v.shortDescription} maxLength={220} onChange={(e) => set("shortDescription", e.target.value)} required />)}</div>
        <div className="sm:col-span-2">{field("description", "Full description", <textarea id="description" rows={6} className="input" value={v.description} onChange={(e) => set("description", e.target.value)} required />, "Separate paragraphs with a blank line.")}</div>
        {field("categoryId", "Category", (
          <select id="categoryId" className="input" value={v.categoryId} onChange={(e) => set("categoryId", e.target.value)} required>
            <option value="">Select…</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        ))}
        <div className="flex flex-col justify-end gap-2">
          <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm font-semibold"><input type="checkbox" className="size-5 accent-plum-700" checked={v.isActive} onChange={(e) => set("isActive", e.target.checked)} /> Visible in the shop</label>
          <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm font-semibold"><input type="checkbox" className="size-5 accent-plum-700" checked={v.isFeatured} onChange={(e) => set("isFeatured", e.target.checked)} /> Featured on the home page</label>
        </div>
      </section>

      <section className="card grid gap-4 p-5 sm:grid-cols-2 sm:p-6" aria-labelledby="pf-price">
        <h3 id="pf-price" className="font-sans text-lg font-bold sm:col-span-2">Pricing (₹, tax inclusive)</h3>
        {field("price", "Price", <input id="price" inputMode="decimal" className="input" value={v.price} onChange={(e) => set("price", e.target.value)} required />)}
        {field("salePrice", "Sale price (optional)", <input id="salePrice" inputMode="decimal" className="input" value={v.salePrice} onChange={(e) => set("salePrice", e.target.value)} />, "Must be lower than the price.")}
      </section>

      <section className="card space-y-4 p-5 sm:p-6" aria-labelledby="pf-var">
        <div className="flex items-center justify-between">
          <h3 id="pf-var" className="font-sans text-lg font-bold">Variants & stock</h3>
          <button type="button" className="btn btn-soft btn-sm" onClick={() => set("variants", [...v.variants, { name: "", sku: "", color: "", priceOverride: "", quantity: "0", lowStockThreshold: "5", isActive: true }])}>Add variant</button>
        </div>
        {err("variants") && <p className="field-error" role="alert">{err("variants")}</p>}
        <ul className="space-y-4">
          {v.variants.map((x, i) => {
            const upd = (patch: Partial<typeof x>) => set("variants", v.variants.map((y, j) => (j === i ? { ...y, ...patch } : y)));
            return (
              <li key={x.id ?? i} className="grid gap-3 rounded-2xl bg-plum-50 p-4 sm:grid-cols-6">
                <div className="sm:col-span-2"><label className="label" htmlFor={`vn${i}`}>Name</label><input id={`vn${i}`} className="input" value={x.name} onChange={(e) => upd({ name: e.target.value })} /></div>
                <div className="sm:col-span-2"><label className="label" htmlFor={`vs${i}`}>SKU</label><input id={`vs${i}`} className="input" value={x.sku} onChange={(e) => upd({ sku: e.target.value })} />{err(`variants.${i}.sku`) && <p className="field-error">{err(`variants.${i}.sku`)}</p>}</div>
                <div><label className="label" htmlFor={`vc${i}`}>Colour</label><input id={`vc${i}`} className="input" value={x.color} onChange={(e) => upd({ color: e.target.value })} /></div>
                <div><label className="label" htmlFor={`vp${i}`}>Price ₹ (opt.)</label><input id={`vp${i}`} inputMode="decimal" className="input" value={x.priceOverride} onChange={(e) => upd({ priceOverride: e.target.value })} /></div>
                <div><label className="label" htmlFor={`vq${i}`}>Stock</label><input id={`vq${i}`} inputMode="numeric" className="input" value={x.quantity} onChange={(e) => upd({ quantity: e.target.value.replace(/\D/g, "") })} /></div>
                <div><label className="label" htmlFor={`vt${i}`}>Low-stock at</label><input id={`vt${i}`} inputMode="numeric" className="input" value={x.lowStockThreshold} onChange={(e) => upd({ lowStockThreshold: e.target.value.replace(/\D/g, "") })} /></div>
                <label className="flex min-h-11 items-center gap-2 self-end text-sm font-semibold"><input type="checkbox" className="size-5 accent-plum-700" checked={x.isActive} onChange={(e) => upd({ isActive: e.target.checked })} /> Active</label>
                <div className="self-end text-right">
                  {v.variants.length > 1 && <button type="button" className="text-sm font-bold text-coral-700 underline" onClick={() => set("variants", v.variants.filter((_, j) => j !== i))}>Remove</button>}
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="card space-y-4 p-5 sm:p-6" aria-labelledby="pf-img">
        <h3 id="pf-img" className="font-sans text-lg font-bold">Images</h3>
        <p className="text-sm text-muted">Without photos, Beadsy draws bead artwork from the palette below. The first image is the main one.</p>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {v.images.map((im, i) => (
            <li key={`${im.url}-${i}`} className="space-y-2 rounded-2xl bg-plum-50 p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={im.url} alt={im.alt || "Product image"} className="aspect-square w-full rounded-xl object-cover" />
              <input className="input min-h-9 py-1 text-xs" aria-label="Alt text" placeholder="Alt text" value={im.alt} onChange={(e) => set("images", v.images.map((y, j) => (j === i ? { ...y, alt: e.target.value } : y)))} />
              <div className="flex justify-between text-xs font-bold">
                <button type="button" disabled={i === 0} className="text-plum-700 underline disabled:opacity-30" onClick={() => { const a = [...v.images]; [a[i - 1], a[i]] = [a[i]!, a[i - 1]!]; set("images", a); }}>← Move</button>
                <button type="button" className="text-coral-700 underline" onClick={() => set("images", v.images.filter((_, j) => j !== i))}>Remove</button>
              </div>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor="upload" className="label">Upload (JPG, PNG, WebP · max 4 MB)</label>
            <input id="upload" type="file" accept="image/jpeg,image/png,image/webp,image/avif" disabled={uploading} onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f); e.target.value = ""; }} className="text-sm" />
          </div>
          <div className="min-w-[240px] flex-1">
            <label htmlFor="imgurl" className="label">…or paste an image URL</label>
            <div className="flex gap-2">
              <input id="imgurl" className="input" value={newUrl} placeholder="https://…" onChange={(e) => setNewUrl(e.target.value)} />
              <button type="button" className="btn btn-soft" onClick={() => { if (newUrl.trim()) { set("images", [...v.images, { url: newUrl.trim(), alt: v.name }]); setNewUrl(""); } }}>Add</button>
            </div>
          </div>
        </div>
        {err("images") && <p className="field-error" role="alert">{err("images")}</p>}
      </section>

      <section className="card grid gap-4 p-5 sm:grid-cols-2 sm:p-6" aria-labelledby="pf-more">
        <h3 id="pf-more" className="font-sans text-lg font-bold sm:col-span-2">Details & search</h3>
        {field("material", "Materials", <input id="material" className="input" value={v.material} onChange={(e) => set("material", e.target.value)} />)}
        {field("dimensions", "Dimensions", <input id="dimensions" className="input" value={v.dimensions} onChange={(e) => set("dimensions", e.target.value)} placeholder="Fits wrists 14–18 cm" />)}
        <div className="sm:col-span-2">{field("care", "Care instructions", <textarea id="care" rows={2} className="input" value={v.care} onChange={(e) => set("care", e.target.value)} />)}</div>
        {field("tags", "Tags (comma separated)", <input id="tags" className="input" value={v.tags} onChange={(e) => set("tags", e.target.value)} placeholder="pastel, gift, flower" />)}
        {field("colors", "Colours (comma separated)", <input id="colors" className="input" value={v.colors} onChange={(e) => set("colors", e.target.value)} placeholder="pink, yellow, mint" />, "Used by the colour filter. Try: pink, rose, coral, yellow, gold, green, mint, blue, purple, lavender, white, black, multicolor, pastel.")}
        {field("palette", "Artwork palette (hex, comma separated)", <input id="palette" className="input" value={v.palette} onChange={(e) => set("palette", e.target.value)} />, "Used for the generated bead picture when there is no photo.")}
        {field("artKind", "Artwork style", (
          <select id="artKind" className="input" value={v.artKind} onChange={(e) => set("artKind", e.target.value as ProductFormValues["artKind"])}>
            {["bracelet", "necklace", "keychain", "charm", "anklet", "giftset"].map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
        ))}
        <div className="aspect-square max-w-[160px] overflow-hidden rounded-2xl border border-plum-100">
          <BeadArt kind={v.artKind} palette={list(v.palette).filter((c) => /^#[0-9a-fA-F]{6}$/.test(c))} seed={11} />
        </div>
      </section>

      {error && <p role="alert" className="rounded-xl bg-coral-500/10 p-3 text-sm font-semibold text-coral-700">{error}</p>}
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className="btn btn-primary btn-lg" disabled={busy || uploading}>{busy ? "Saving…" : isEdit ? "Save changes" : "Create product"}</button>
        <button type="button" className="btn btn-ghost" onClick={() => router.push("/admin/products")}>Cancel</button>
        {isEdit && <button type="button" className="btn btn-danger ml-auto" onClick={() => void remove()} disabled={busy}>Delete product</button>}
      </div>
    </form>
  );
}
