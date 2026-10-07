import Link from "next/link";
import type { ReactNode } from "react";
import { BeadArt } from "@/components/art/BeadArt";
import type { ArtKind } from "@/lib/types";

const PALETTES: Record<string, string[]> = {
  plum: ["#9B79AE", "#F58FB0", "#F8D26B", "#98C99A"],
  pink: ["#F58FB0", "#F9B1C9", "#9B79AE", "#F8D26B"],
  mint: ["#98C99A", "#F8D26B", "#F58FB0", "#9B79AE"],
};

export interface StateAction {
  label: string;
  href?: string;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "pink";
}

/** Friendly full-width state (empty / not found / error / unauthorized). */
export function StatePanel({
  title,
  message,
  art = "charm",
  tone = "plum",
  actions = [],
  children,
  compact = false,
}: {
  title: string;
  message: string;
  art?: ArtKind;
  tone?: keyof typeof PALETTES;
  actions?: StateAction[];
  children?: ReactNode;
  compact?: boolean;
}) {
  return (
    <section className={`container-x flex flex-col items-center text-center ${compact ? "py-10" : "py-16 sm:py-24"}`} aria-labelledby="state-title">
      <div className="animate-float mb-6 size-40 overflow-hidden rounded-full border-4 border-white shadow-soft sm:size-48">
        <BeadArt kind={art} palette={PALETTES[tone]!} seed={title.length * 7} />
      </div>
      <h1 id="state-title" className="text-3xl font-semibold sm:text-4xl">
        {title}
      </h1>
      <p className="mt-3 max-w-md text-muted">{message}</p>
      {children}
      {actions.length > 0 && (
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          {actions.map((a) => {
            const cls = `btn ${a.variant === "secondary" ? "btn-secondary" : a.variant === "pink" ? "btn-pink" : "btn-primary"}`;
            return a.href ? (
              <Link key={a.label} href={a.href} className={cls}>
                {a.label}
              </Link>
            ) : (
              <button key={a.label} type="button" onClick={a.onClick} className={cls}>
                {a.label}
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4" aria-busy="true" aria-label="Loading products">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="card overflow-hidden">
          <div className="skeleton aspect-square rounded-none" />
          <div className="space-y-2 p-3 sm:p-4">
            <div className="skeleton h-4 w-3/4" />
            <div className="skeleton h-3 w-1/2" />
            <div className="skeleton h-5 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="container-x py-10" aria-busy="true" aria-label="Loading">
      <div className="skeleton mb-4 h-8 w-1/3" />
      <div className="skeleton mb-8 h-4 w-1/2" />
      <ProductGridSkeleton />
    </div>
  );
}
