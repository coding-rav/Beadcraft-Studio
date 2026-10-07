import { apiHandler, json } from "@/lib/api";
import { endSession } from "@/lib/auth";

export const POST = apiHandler(async () => {
  await endSession();
  return json({ ok: true });
});
