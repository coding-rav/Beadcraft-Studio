"use client";

import { Icon } from "@/components/ui/Icon";
import { useStore } from "@/components/providers/StoreProvider";

export function WishlistButton({ productId, name, className = "", withLabel = false }: { productId: string; name: string; className?: string; withLabel?: boolean }) {
  const { isWished, toggleWishlist } = useStore();
  const on = isWished(productId);
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={on ? `Remove ${name} from wishlist` : `Add ${name} to wishlist`}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        void toggleWishlist(productId);
      }}
      className={`${withLabel ? "btn btn-soft" : "grid size-10 place-items-center rounded-full bg-white/90 shadow-soft backdrop-blur transition hover:scale-110"} ${on ? "text-bubblegum-600" : "text-plum-700"} ${className}`}
    >
      <Icon name="heart" size={20} filled={on} />
      {withLabel && <span>{on ? "Saved" : "Save"}</span>}
    </button>
  );
}
