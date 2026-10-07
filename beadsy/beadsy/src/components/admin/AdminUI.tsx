"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Icon, type IconName } from "@/components/ui/Icon";

const ITEMS: { href: string; label: string; icon: IconName }[] = [
  { href: "/admin", label: "Overview", icon: "home" },
  { href: "/admin/products", label: "Products", icon: "tag" },
  { href: "/admin/categories", label: "Categories", icon: "box" },
  { href: "/admin/orders", label: "Orders", icon: "package" },
  { href: "/admin/customers", label: "Customers", icon: "users" },
  { href: "/admin/inventory", label: "Inventory", icon: "box" },
  { href: "/admin/coupons", label: "Coupons", icon: "gift" },
  { href: "/admin/reviews", label: "Reviews", icon: "message" },
  { href: "/admin/payments", label: "Payments", icon: "card" },
  { href: "/admin/analytics", label: "Analytics", icon: "chart" },
  { href: "/admin/settings", label: "Settings", icon: "settings" },
];

export function AdminNav() {
  const pathname = usePathname();
  const active = (h: string) => (h === "/admin" ? pathname === "/admin" : pathname.startsWith(h));
  return (
    <nav aria-label="Admin" className="lg:sticky lg:top-28 lg:self-start">
      <ul className="flex gap-2 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0">
        {ITEMS.map((i) => (
          <li key={i.href} className="shrink-0">
            <Link href={i.href} aria-current={active(i.href) ? "page" : undefined} className={`flex items-center gap-2.5 rounded-full px-4 py-2.5 text-sm font-bold whitespace-nowrap transition lg:rounded-2xl ${active(i.href) ? "bg-plum-700 text-white" : "bg-white text-plum-800 hover:bg-plum-100"}`}>
              <Icon name={i.icon} size={18} /> {i.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function PageHead({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-3xl font-semibold">{title}</h2>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

export function Stat({ label, value, hint, tone }: { label: string; value: string | number; hint?: string; tone?: "warn" }) {
  return (
    <div className={`card p-5 ${tone === "warn" ? "!bg-sun-100" : ""}`}>
      <p className="text-sm font-semibold text-muted">{label}</p>
      <p className="mt-1 font-display text-3xl font-semibold">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
    </div>
  );
}

export function Table({ head, children, empty }: { head: string[]; children: ReactNode; empty?: string }) {
  return (
    <div className="card overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="border-b border-plum-100 bg-plum-50 text-xs tracking-wide text-plum-700 uppercase">
          <tr>{head.map((h) => <th key={h} scope="col" className="px-4 py-3 font-bold">{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-plum-100 [&_td]:px-4 [&_td]:py-3">{children}</tbody>
      </table>
      {empty && <p className="p-8 text-center text-muted">{empty}</p>}
    </div>
  );
}

/** Simple accessible bar chart for revenue (values in paise). */
export function BarChart({ data, label }: { data: { label: string; value: number }[]; label: string }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <figure>
      <figcaption className="sr-only">{label}</figcaption>
      <div className="flex h-44 items-end gap-1.5" role="img" aria-label={`${label}: ${data.map((d) => `${d.label} ${(d.value / 100).toFixed(0)} rupees`).join(", ")}`}>
        {data.map((d) => (
          <div key={d.label} className="group relative flex h-full flex-1 flex-col justify-end">
            <div className="min-h-[3px] rounded-t-md bg-plum-500 transition group-hover:bg-bubblegum-600" style={{ height: `${Math.max((d.value / max) * 100, d.value > 0 ? 3 : 1)}%` }} />
            <span className="pointer-events-none absolute -top-7 left-1/2 hidden -translate-x-1/2 rounded bg-plum-900 px-2 py-1 text-[11px] whitespace-nowrap text-white group-hover:block">
              {d.label}: ₹{Math.round(d.value / 100).toLocaleString("en-IN")}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-[11px] text-muted" aria-hidden="true">
        <span>{data[0]?.label}</span>
        <span>{data[data.length - 1]?.label}</span>
      </div>
    </figure>
  );
}
