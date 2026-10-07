import { AddressManager } from "@/components/account/AddressManager";

export default function AddressesPage() {
  return (
    <div>
      <h2 className="mb-4 text-2xl font-semibold">Saved addresses</h2>
      <AddressManager />
    </div>
  );
}
