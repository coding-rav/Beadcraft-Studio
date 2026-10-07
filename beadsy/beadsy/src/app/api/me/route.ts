import { apiHandler, json } from "@/lib/api";
import { getSession } from "@/lib/auth";

// Lightweight (no DB): used by the header/cart/wishlist providers to know who is signed in.
export const GET = apiHandler(async () => {
  const s = await getSession();
  return json({ user: s ? { id: s.sub, name: s.name, email: s.email, role: s.role } : null });
});
