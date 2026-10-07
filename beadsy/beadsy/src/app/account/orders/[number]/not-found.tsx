import { StatePanel } from "@/components/ui/States";

export default function OrderNotFound() {
  return <StatePanel compact art="bracelet" tone="pink" title="Order not found" message="We couldn't find that order on your account." actions={[{ label: "See all orders", href: "/account/orders" }]} />;
}
