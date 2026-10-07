import { db } from "@/lib/db";
import { requirePageUser } from "@/lib/auth";
import { ProfileForm } from "@/components/account/ProfileForm";

export default async function ProfilePage() {
  const u = await requirePageUser("/account/profile");
  const user = await db.user.findUnique({ where: { id: u.id }, select: { name: true, email: true, phone: true, createdAt: true } });
  return (
    <div>
      <h2 className="mb-4 text-2xl font-semibold">Profile</h2>
      <ProfileForm name={user?.name ?? u.name} email={user?.email ?? u.email} phone={user?.phone ?? ""} />
    </div>
  );
}
