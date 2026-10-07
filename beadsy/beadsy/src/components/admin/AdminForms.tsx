"use client";

import { useState } from "react";
import type { OrderStatus } from "@prisma/client";
import { useAdminApi } from "./useAdminApi";

/* ----------------------------------------------------------- categories */
export interface CategoryRow {
  id?: string;
  name: string;
  slug: string;
  description: string;
  sortOrder: number;
}

export function CategoryEditor({ initial, onDone }: { initial: CategoryRow; onDone?: () => void }) {
  const { call, busy, error } = useAdminApi();
  const [c, setC] = useState(initial);
  const isEdit = Boolean(initial.id);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = { name: c.name, slug: c.slug || undefined, description: c.description || null, sortOrder: Number(c.sortOrder) || 0 };
    const res = await call(isEdit ? `/api/admin/categories/${initial.id}` : "/api/admin/categories", isEdit ? "PUT" : "POST", body, "Category saved");
    if (res) {
      if (!isEdit) setC({ name: "", slug: "", description: "", sortOrder: 0 });
      onDone?.();
    }
  };
  const remove = async () => {
    if (window.confirm(`Delete “${c.name}”?`)) await call(`/api/admin/categories/${initial.id}`, "DELETE", undefined, "Category deleted");
  };
  const id = initial.id ?? "new";

  return (
    <form onSubmit={save} noValidate className="grid gap-3 sm:grid-cols-[1fr_1fr_2fr_80px_auto]">
      <div><label className="label" htmlFor={`cn-${id}`}>Name</label><input id={`cn-${id}`} className="input" value={c.name} onChange={(e) => setC({ ...c, name: e.target.value })} required /></div>
      <div><label className="label" htmlFor={`cs-${id}`}>Slug</label><input id={`cs-${id}`} className="input" value={c.slug} onChange={(e) => setC({ ...c, slug: e.target.value.toLowerCase() })} placeholder="auto" /></div>
      <div><label className="label" htmlFor={`cd-${id}`}>Description</label><input id={`cd-${id}`} className="input" value={c.description} onChange={(e) => setC({ ...c, description: e.target.value })} /></div>
      <div><label className="label" htmlFor={`co-${id}`}>Order</label><input id={`co-${id}`} inputMode="numeric" className="input" value={c.sortOrder} onChange={(e) => setC({ ...c, sortOrder: Number(e.target.value.replace(/\D/g, "")) })} /></div>
      <div className="flex items-end gap-2">
        <button className="btn btn-primary" disabled={busy}>{isEdit ? "Save" : "Add"}</button>
        {isEdit && <button type="button" className="btn btn-ghost text-coral-700" onClick={() => void remove()} disabled={busy}>Delete</button>}
      </div>
      {error && <p role="alert" className="field-error sm:col-span-5">{error}</p>}
    </form>
  );
}

/* ----------------------------------------------------------- inventory */
export function InventoryRow({ variantId, quantity, threshold, reserved }: { variantId: string; quantity: number; threshold: number; reserved: number }) {
  const { call, busy, error } = useAdminApi();
  const [q, setQ] = useState(String(quantity));
  const [t, setT] = useState(String(threshold));
  const dirty = q !== String(quantity) || t !== String(threshold);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="sr-only" htmlFor={`q-${variantId}`}>Stock on hand</label>
      <input id={`q-${variantId}`} inputMode="numeric" className="input min-h-9 w-20 py-1" value={q} onChange={(e) => setQ(e.target.value.replace(/\D/g, ""))} />
      <label className="sr-only" htmlFor={`t-${variantId}`}>Low stock threshold</label>
      <input id={`t-${variantId}`} inputMode="numeric" className="input min-h-9 w-16 py-1" value={t} onChange={(e) => setT(e.target.value.replace(/\D/g, ""))} />
      <button type="button" className="btn btn-soft btn-sm" disabled={!dirty || busy} onClick={() => void call(`/api/admin/inventory/${variantId}`, "PUT", { quantity: Number(q || 0), lowStockThreshold: Number(t || 0) }, "Stock updated")}>Save</button>
      {reserved > 0 && <span className="text-xs text-muted">{reserved} reserved</span>}
      {error && <span role="alert" className="field-error">{error}</span>}
    </div>
  );
}

/* -------------------------------------------------------------- coupons */
export interface CouponFormValues {
  id?: string;
  code: string;
  description: string;
  type: "PERCENTAGE" | "FIXED";
  value: string;
  maxDiscount: string;
  minOrder: string;
  startsAt: string;
  expiresAt: string;
  usageLimit: string;
  perUserLimit: string;
  isActive: boolean;
}
export const EMPTY_COUPON: CouponFormValues = { code: "", description: "", type: "PERCENTAGE", value: "10", maxDiscount: "", minOrder: "0", startsAt: "", expiresAt: "", usageLimit: "", perUserLimit: "1", isActive: true };

const num = (s: string) => (s.trim() === "" ? null : Number(s));
const iso = (s: string) => (s ? new Date(s).toISOString() : null);

export function CouponEditor({ initial, onDone }: { initial: CouponFormValues; onDone?: () => void }) {
  const { call, busy, error, fieldErrors } = useAdminApi();
  const [c, setC] = useState(initial);
  const isEdit = Boolean(initial.id);
  const id = initial.id ?? "new";
  const set = <K extends keyof CouponFormValues>(k: K, v: CouponFormValues[K]) => setC((p) => ({ ...p, [k]: v }));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = {
      code: c.code, description: c.description || null, type: c.type, value: Number(c.value),
      maxDiscount: num(c.maxDiscount), minOrder: Number(c.minOrder || 0),
      startsAt: iso(c.startsAt), expiresAt: iso(c.expiresAt),
      usageLimit: num(c.usageLimit), perUserLimit: num(c.perUserLimit), isActive: c.isActive,
    };
    const res = await call(isEdit ? `/api/admin/coupons/${initial.id}` : "/api/admin/coupons", isEdit ? "PUT" : "POST", body, "Coupon saved");
    if (res) {
      if (!isEdit) setC(EMPTY_COUPON);
      onDone?.();
    }
  };
  const remove = async () => {
    if (window.confirm(`Delete coupon ${c.code}?`)) await call(`/api/admin/coupons/${initial.id}`, "DELETE", undefined, "Coupon deleted");
  };
  const f = (k: string, label: string, el: React.ReactNode, hint?: string) => (
    <div><label className="label" htmlFor={`${k}-${id}`}>{label}</label>{el}{fieldErrors[k] && <p className="field-error" role="alert">{fieldErrors[k]}</p>}{hint && <p className="hint">{hint}</p>}</div>
  );
  const inp = (k: keyof CouponFormValues, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <input id={`${k}-${id}`} className="input" value={String(c[k])} onChange={(e) => set(k, e.target.value as never)} {...props} />
  );

  return (
    <form onSubmit={save} noValidate className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {f("code", "Code", inp("code", { onChange: (e) => set("code", e.target.value.toUpperCase()), maxLength: 30 }))}
      {f("type", "Type", (
        <select id={`type-${id}`} className="input" value={c.type} onChange={(e) => set("type", e.target.value as "PERCENTAGE" | "FIXED")}>
          <option value="PERCENTAGE">Percentage off</option><option value="FIXED">Fixed amount off (₹)</option>
        </select>
      ))}
      {f("value", c.type === "PERCENTAGE" ? "Percent (1–100)" : "Amount (₹)", inp("value", { inputMode: "decimal" }))}
      {f("maxDiscount", "Max discount ₹ (opt.)", inp("maxDiscount", { inputMode: "decimal" }))}
      {f("minOrder", "Minimum order ₹", inp("minOrder", { inputMode: "decimal" }))}
      {f("usageLimit", "Total uses (opt.)", inp("usageLimit", { inputMode: "numeric" }))}
      {f("perUserLimit", "Uses per customer", inp("perUserLimit", { inputMode: "numeric" }))}
      {f("description", "Note", inp("description"))}
      {f("startsAt", "Starts (opt.)", inp("startsAt", { type: "datetime-local" }))}
      {f("expiresAt", "Expires (opt.)", inp("expiresAt", { type: "datetime-local" }))}
      <label className="flex min-h-11 cursor-pointer items-center gap-2 self-end text-sm font-semibold"><input type="checkbox" className="size-5 accent-plum-700" checked={c.isActive} onChange={(e) => set("isActive", e.target.checked)} /> Active</label>
      <div className="flex items-end gap-2">
        <button className="btn btn-primary" disabled={busy}>{isEdit ? "Save" : "Create coupon"}</button>
        {isEdit && <button type="button" className="btn btn-ghost text-coral-700" onClick={() => void remove()} disabled={busy}>Delete</button>}
      </div>
      {error && <p role="alert" className="field-error sm:col-span-full">{error}</p>}
    </form>
  );
}

/* --------------------------------------------------------------- orders */
const NEXT: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ["CANCELLED"],
  PAID: ["PROCESSING", "SHIPPED", "CANCELLED", "REFUNDED"],
  PROCESSING: ["SHIPPED", "CANCELLED", "REFUNDED"],
  SHIPPED: ["DELIVERED", "REFUNDED"],
  DELIVERED: ["REFUNDED"],
  CANCELLED: [],
  REFUNDED: [],
};

export function OrderEditor({ id, status, trackingNumber, internalNote }: { id: string; status: OrderStatus; trackingNumber: string; internalNote: string }) {
  const { call, busy, error } = useAdminApi();
  const [next, setNext] = useState<OrderStatus | "">("");
  const [tracking, setTracking] = useState(trackingNumber);
  const [note, setNote] = useState(internalNote);
  const [restock, setRestock] = useState(false);
  const options = NEXT[status];

  return (
    <div className="card space-y-4 p-5">
      <h3 className="font-sans text-lg font-bold">Manage order</h3>
      {options.length > 0 ? (
        <div>
          <label htmlFor="ns" className="label">Change status</label>
          <select id="ns" className="input" value={next} onChange={(e) => setNext(e.target.value as OrderStatus)}>
            <option value="">Keep as {status.toLowerCase()}</option>
            {options.map((o) => <option key={o} value={o}>{o.charAt(0) + o.slice(1).toLowerCase()}</option>)}
          </select>
          {(next === "CANCELLED" || next === "REFUNDED") && status !== "PENDING" && (
            <label className="mt-2 flex items-center gap-2 text-sm font-semibold"><input type="checkbox" className="size-5 accent-plum-700" checked={restock} onChange={(e) => setRestock(e.target.checked)} /> Return items to stock</label>
          )}
          {next === "REFUNDED" && <p className="hint">This updates the order only. Issue the actual refund in your Stripe / Razorpay dashboard.</p>}
        </div>
      ) : <p className="text-sm text-muted">This order is {status.toLowerCase()} and can't be changed further.</p>}
      <div><label htmlFor="trk" className="label">Tracking number</label><input id="trk" className="input" value={tracking} onChange={(e) => setTracking(e.target.value)} maxLength={80} /></div>
      <div><label htmlFor="inote" className="label">Internal note</label><textarea id="inote" rows={3} className="input" value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} /></div>
      {error && <p role="alert" className="field-error">{error}</p>}
      <button className="btn btn-primary" disabled={busy} onClick={() => void call(`/api/admin/orders/${id}`, "PATCH", { status: next || undefined, trackingNumber: tracking || null, internalNote: note || null, restock }, "Order updated").then(() => setNext(""))}>
        {busy ? "Saving…" : "Save changes"}
      </button>
    </div>
  );
}

/* -------------------------------------------------------------- reviews */
export function ReviewActions({ id, status }: { id: string; status: "PENDING" | "APPROVED" | "REJECTED" }) {
  const { call, busy, error } = useAdminApi();
  return (
    <div className="flex flex-wrap items-center gap-2">
      {status !== "APPROVED" && <button type="button" className="btn btn-soft btn-sm" disabled={busy} onClick={() => void call(`/api/admin/reviews/${id}`, "PUT", { status: "APPROVED" }, "Review approved")}>Approve</button>}
      {status !== "REJECTED" && <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => void call(`/api/admin/reviews/${id}`, "PUT", { status: "REJECTED" }, "Review rejected")}>Reject</button>}
      <button type="button" className="btn btn-ghost btn-sm text-coral-700" disabled={busy} onClick={() => { if (window.confirm("Delete this review permanently?")) void call(`/api/admin/reviews/${id}`, "DELETE", undefined, "Review deleted"); }}>Delete</button>
      {error && <span role="alert" className="field-error">{error}</span>}
    </div>
  );
}
