import { StatePanel } from "@/components/ui/States";

export default function ProductNotFound() {
  return (
    <StatePanel
      art="bracelet"
      tone="pink"
      title="That piece has rolled away"
      message="We couldn't find that product. It may have sold out for good or the link might be a little off."
      actions={[
        { label: "Shop all beads", href: "/shop" },
        { label: "Search", href: "/search", variant: "secondary" },
      ]}
    />
  );
}
