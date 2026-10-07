import { StatePanel } from "@/components/ui/States";

export default function NotFound() {
  return (
    <StatePanel
      art="bracelet"
      title="We couldn't find that page"
      message="The link may be old, or the page may have moved. Let's get you back to the good stuff."
      actions={[
        { label: "Shop all beads", href: "/shop" },
        { label: "Go home", href: "/", variant: "secondary" },
      ]}
    />
  );
}
