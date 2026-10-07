import { commerceConfig } from "@/lib/config";
import { formatMoney } from "@/lib/money";

export function AnnouncementBar() {
  return (
    <div className="bg-plum-700 text-white">
      <p className="container-x py-2 text-center text-xs font-semibold tracking-wide sm:text-sm">
        <span aria-hidden="true">✨ </span>
        Free shipping on orders over {formatMoney(commerceConfig.freeShippingOverCents)} · Handmade with love in small batches
        <span aria-hidden="true"> ✨</span>
      </p>
    </div>
  );
}
