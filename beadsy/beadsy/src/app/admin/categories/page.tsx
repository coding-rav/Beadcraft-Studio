import { db } from "@/lib/db";
import { CategoryEditor } from "@/components/admin/AdminForms";
import { PageHead } from "@/components/admin/AdminUI";

export default async function AdminCategories() {
  const categories = await db.category.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], include: { _count: { select: { products: true } } } });
  return (
    <div className="space-y-6">
      <PageHead title="Categories" />
      <section className="card p-5" aria-labelledby="newcat"><h3 id="newcat" className="mb-3 font-sans text-lg font-bold">Add a category</h3>
        <CategoryEditor initial={{ name: "", slug: "", description: "", sortOrder: categories.length }} />
      </section>
      <ul className="space-y-3">
        {categories.map((c) => (
          <li key={c.id} className="card p-5">
            <p className="mb-2 text-xs font-semibold text-muted">{c._count.products} products · /shop/{c.slug}</p>
            <CategoryEditor initial={{ id: c.id, name: c.name, slug: c.slug, description: c.description ?? "", sortOrder: c.sortOrder }} />
          </li>
        ))}
      </ul>
    </div>
  );
}
