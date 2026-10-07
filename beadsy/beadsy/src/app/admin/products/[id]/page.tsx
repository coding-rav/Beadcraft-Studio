import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { PageHead } from "@/components/admin/AdminUI";
import { ProductForm, type ProductFormValues } from "@/components/admin/ProductForm";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [p, categories] = await Promise.all([
    db.product.findUnique({ where: { id }, include: { images: { orderBy: { sortOrder: "asc" } }, variants: { orderBy: { sortOrder: "asc" }, include: { inventory: true } } } }),
    db.category.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, name: true } }),
  ]);
  if (!p) notFound();
  const initial: ProductFormValues = {
    id: p.id,
    name: p.name,
    slug: p.slug,
    shortDescription: p.shortDescription,
    description: p.description,
    categoryId: p.categoryId,
    price: String(p.priceCents / 100),
    salePrice: p.salePriceCents != null ? String(p.salePriceCents / 100) : "",
    sku: p.sku,
    tags: p.tags.join(", "),
    colors: p.colors.join(", "),
    palette: p.palette.join(", "),
    artKind: p.artKind as ProductFormValues["artKind"],
    material: p.material ?? "",
    dimensions: p.dimensions ?? "",
    care: p.care ?? "",
    isActive: p.isActive,
    isFeatured: p.isFeatured,
    images: p.images.map((i) => ({ url: i.url, alt: i.alt })),
    variants: p.variants.map((v) => ({
      id: v.id,
      name: v.name,
      sku: v.sku,
      color: v.color ?? "",
      priceOverride: v.priceCents != null ? String(v.priceCents / 100) : "",
      quantity: String(v.inventory?.quantity ?? 0),
      lowStockThreshold: String(v.inventory?.lowStockThreshold ?? 5),
      isActive: v.isActive,
    })),
  };
  return (
    <div>
      <PageHead title={`Edit: ${p.name}`} />
      <ProductForm initial={initial} categories={categories} />
    </div>
  );
}
