import type { Metadata } from "next";
import { requireAdminPage } from "@/lib/auth";
import { AdminNav } from "@/components/admin/AdminUI";

export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdminPage(); // re-checks the role against the database on every request
  return (
    <div className="container-x py-8 sm:py-12">
      <div className="mb-6">
        <p className="eyebrow mb-1">Beadsy admin</p>
        <h1 className="text-3xl font-semibold sm:text-4xl">Dashboard</h1>
      </div>
      <div className="grid gap-8 lg:grid-cols-[210px_1fr] lg:gap-10">
        <AdminNav />
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
