import type { ProductCardDTO } from "@/lib/types";
import { ProductCard } from "./ProductCard";

export function ProductGrid({ products, columns = "default", priorityCount = 0 }: { products: ProductCardDTO[]; columns?: "default" | "four"; priorityCount?: number }) {
  return (
    <ul
      className={`grid grid-cols-2 gap-3 sm:gap-5 ${columns === "four" ? "lg:grid-cols-4" : "lg:grid-cols-3 xl:grid-cols-4"}`}
    >
      {products.map((p, i) => (
        <li key={p.id} className="flex">
          <div className="flex w-full">
            <ProductCard product={p} priority={i < priorityCount} />
          </div>
        </li>
      ))}
    </ul>
  );
}
