import type { OrderStatus } from "@prisma/client";

const TONES: Record<OrderStatus, string> = {
  PENDING: "bg-sun-100 text-sun-700",
  PAID: "bg-mint-100 text-mint-700",
  PROCESSING: "bg-plum-100 text-plum-800",
  SHIPPED: "bg-plum-200 text-plum-900",
  DELIVERED: "bg-mint-300 text-mint-700",
  CANCELLED: "bg-coral-500/15 text-coral-700",
  REFUNDED: "bg-bubblegum-100 text-bubblegum-700",
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  return <span className={`badge ${TONES[status]}`}>{status.charAt(0) + status.slice(1).toLowerCase()}</span>;
}

const TRACK: OrderStatus[] = ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"];

export function OrderTracker({ status }: { status: OrderStatus }) {
  if (status === "CANCELLED" || status === "REFUNDED" || status === "PENDING") return null;
  const idx = TRACK.indexOf(status);
  return (
    <ol className="grid grid-cols-4 gap-2 text-center text-xs font-bold" aria-label="Order progress">
      {TRACK.map((s, i) => (
        <li key={s} aria-current={i === idx ? "step" : undefined}>
          <span className={`mx-auto mb-1.5 grid size-8 place-items-center rounded-full ${i <= idx ? "bg-plum-700 text-white" : "bg-plum-100 text-plum-500"}`}>{i < idx ? "✓" : i + 1}</span>
          <span className={i <= idx ? "text-plum-900" : "text-muted"}>{s === "PAID" ? "Confirmed" : s.charAt(0) + s.slice(1).toLowerCase()}</span>
        </li>
      ))}
    </ol>
  );
}
