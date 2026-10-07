import Link from "next/link";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { PageHead, Table } from "@/components/admin/AdminUI";
import { Pagination } from "@/components/shop/Pagination";

const PER = 20;

export default async function AdminProducts({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const sp = await searchParams;
  const q = sp.q?.trim().slice(0, 60);
  const page = Math.max(1, Math.min(Number(sp.page) || 1, 1000));
  const where = q ? { OR: [{ name: { contains: q, mode: "insensitive" as const } }, { sku: { contains: q, mode: "insensitive" as const } }] } : {};
  const [total, products] = await Promise.all([
    db.product.count({ where }),
    db.product.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PER, take: PER, include: { category: { select: { name: true } }, variants: { include: { inventory: true } } } }),
  ]);
  return (
    <div>
      <PageHead title="Products">
        <Link href="/admin/products/new" className="btn btn-primary">Add product</Link>
      </PageHead>
      <form className="mb-4 flex gap-2" role="search">
        <label htmlFor="q" className="sr-only">Search products</label>
        <input id="q" name="q" defaultValue={q} placeholder="Search by name or SKU" className="input max-w-sm rounded-full" />
        <button className="btn btn-soft">Search</button>
      </form>
      <Table head={["Product", "Category", "Price", "Stock", "Status", ""]} empty={products.length === 0 ? "No products found." : undefined}>
        {products.map((p) => {
          const stock = p.variants.reduce((s, v) => s + Math.max((v.inventory?.quantity ?? 0) - (v.inventory?.reserved ?? 0), 0), 0);
          return (
            <tr key={p.id}>
              <td><p className="font-bold">{p.name}</p><p className="text-xs text-muted">{p.sku}</p></td>
              <td>{p.category.name}</td>
              <td>{formatMoney(p.currentPriceCents)}{p.salePriceCents ? <span className="ml-1 text-xs text-bubblegum-700">sale</span> : null}</td>
              <td><span className={stock === 0 ? "font-bold text-coral-700" : ""}>{stock}</span></td>
              <td><span className={`badge ${p.isActive ? "bg-mint-100 text-mint-700" : "bg-plum-100 text-plum-700"}`}>{p.isActive ? "Active" : "Hidden"}</span></td>
              <td className="text-right"><Link href={`/admin/products/${p.id}`} className="font-bold text-plum-700 underline">Edit</Link></td>
            </tr>
          );
        })}
      </Table>
      <Pagination page={page} pages={Math.ceil(total / PER)} basePath="/admin/products" params={q ? { q } : {}} />
    </div>
  );
}
