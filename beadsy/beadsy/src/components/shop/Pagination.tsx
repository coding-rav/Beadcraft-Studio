import Link from "next/link";
import { withParams, type RawParams } from "@/lib/shop-params";
import { Icon } from "@/components/ui/Icon";

function pagesToShow(page: number, pages: number): (number | "gap")[] {
  const set = new Set([1, pages, page, page - 1, page + 1]);
  const nums = [...set].filter((n) => n >= 1 && n <= pages).sort((a, b) => a - b);
  const out: (number | "gap")[] = [];
  nums.forEach((n, i) => {
    if (i > 0 && n - nums[i - 1]! > 1) out.push("gap");
    out.push(n);
  });
  return out;
}

export function Pagination({ page, pages, basePath, params }: { page: number; pages: number; basePath: string; params: RawParams }) {
  if (pages <= 1) return null;
  const href = (p: number) => `${basePath}${withParams(params, { page: p === 1 ? undefined : String(p) })}`;
  return (
    <nav aria-label="Pagination" className="mt-10 flex flex-wrap items-center justify-center gap-2">
      {page > 1 ? (
        <Link href={href(page - 1)} rel="prev" className="btn btn-soft btn-sm" aria-label="Previous page">
          <Icon name="chevronLeft" size={16} /> Prev
        </Link>
      ) : null}
      {pagesToShow(page, pages).map((n, i) =>
        n === "gap" ? (
          <span key={`g${i}`} aria-hidden="true" className="px-1 text-muted">…</span>
        ) : (
          <Link
            key={n}
            href={href(n)}
            aria-label={`Page ${n}`}
            aria-current={n === page ? "page" : undefined}
            className={`grid size-10 place-items-center rounded-full text-sm font-bold transition ${n === page ? "bg-plum-700 text-white" : "bg-white text-plum-800 hover:bg-plum-100"}`}
          >
            {n}
          </Link>
        ),
      )}
      {page < pages ? (
        <Link href={href(page + 1)} rel="next" className="btn btn-soft btn-sm" aria-label="Next page">
          Next <Icon name="chevronRight" size={16} />
        </Link>
      ) : null}
    </nav>
  );
}
