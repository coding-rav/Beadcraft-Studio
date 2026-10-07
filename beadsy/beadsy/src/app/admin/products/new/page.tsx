import { db } from "@/lib/db";
import { PageHead } from "@/components/admin/AdminUI";
import { EMPTY_PRODUCT, ProductForm } from "@/components/admin/ProductForm";

export default async function NewProductPage() {
  const categories = await db.category.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, name: true } });
  return (
    <div>
      <PageHead title="New product" />
      {categories.length === 0 && <p className="mb-4 rounded-xl bg-sun-100 p-3 text-sm font-semibold">Create a category first (Admin → Categories).</p>}
      <ProductForm initial={EMPTY_PRODUCT} categories={categories} />
    </div>
  );
}
