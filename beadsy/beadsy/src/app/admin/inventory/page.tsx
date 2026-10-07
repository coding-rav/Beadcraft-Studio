import { db } from "@/lib/db";
import { InventoryRow } from "@/components/admin/AdminForms";
import { PageHead, Table } from "@/components/admin/AdminUI";
import { Pagination } from "@/components/shop/Pagination";

const PER = 30;

export default async function AdminInventory({ searchParams }: { searchParams: Promise<{ low?: string; q?: string; page?: string }> }) {
  const sp = await searchParams;
  const q = sp.q?.trim().slice(0, 60);
  const page = Math.max(1, Math.min(Number(sp.page) || 1, 1000));
  const where = q ? { OR: [{ sku: { contains: q, mode: "insensitive" as const } }, { product: { name: { contains: q, mode: "insensitive" as const } } }] } : {};
  const [total, variants] = await Promise.all([
    db.productVariant.count({ where }),
    db.productVariant.findMany({ where, orderBy: [{ product: { name: "asc" } }, { sortOrder: "asc" }], skip: (page - 1) * PER, take: PER, include: { inventory: true, product: { select: { name: true } } } }),
  ]);
  const rows = sp.low === "1" ? variants.filter((v) => (v.inventory?.quantity ?? 0) - (v.inventory?.reserved ?? 0) <= (v.inventory?.lowStockThreshold ?? 5)) : variants;
  return (
    <div>
      <PageHead title="Inventory">
        <a href={sp.low === "1" ? "/admin/inventory" : "/admin/inventory?low=1"} className="chip" aria-pressed={sp.low === "1"}>Low stock only</a>
      </PageHead>
      <form className="mb-4 flex gap-2" role="search"><label htmlFor="iq" className="sr-only">Search inventory</label><input id="iq" name="q" defaultValue={q} placeholder="Product or SKU" className="input max-w-sm rounded-full" /><button className="btn btn-soft">Search</button></form>
      <Table head={["Product", "Variant", "SKU", "Available", "On hand · alert at", "Sold"]} empty={rows.length === 0 ? "Nothing to show." : undefined}>
        {rows.map((v) => {
          const inv = v.inventory;
          const available = (inv?.quantity ?? 0) - (inv?.reserved ?? 0);
          return (
            <tr key={v.id}>
              <td className="font-bold">{v.product.name}</td><td>{v.name}</td><td className="text-muted">{v.sku}</td>
              <td><span className={`badge ${available <= 0 ? "bg-coral-500/15 text-coral-700" : available <= (inv?.lowStockThreshold ?? 5) ? "bg-sun-100 text-sun-700" : "bg-mint-100 text-mint-700"}`}>{available}</span></td>
              <td><InventoryRow variantId={v.id} quantity={inv?.quantity ?? 0} threshold={inv?.lowStockThreshold ?? 5} reserved={inv?.reserved ?? 0} /></td>
              <td>{inv?.sold ?? 0}</td>
            </tr>
          );
        })}
      </Table>
      <Pagination page={page} pages={Math.ceil(total / PER)} basePath="/admin/inventory" params={{ ...(q ? { q } : {}), ...(sp.low === "1" ? { low: "1" } : {}) }} />
    </div>
  );
}
