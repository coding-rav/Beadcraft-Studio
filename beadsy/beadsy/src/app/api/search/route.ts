import { apiHandler, json } from "@/lib/api";
import { searchCatalog } from "@/lib/search";

export const GET = apiHandler(
  async (req) => {
    const q = req.nextUrl.searchParams.get("q") ?? "";
    const result = await searchCatalog(q, 6);
    return json(result, { headers: { "Cache-Control": "private, max-age=30" } });
  },
  { rateLimit: { name: "search", max: 90, windowMs: 60_000 } },
);
