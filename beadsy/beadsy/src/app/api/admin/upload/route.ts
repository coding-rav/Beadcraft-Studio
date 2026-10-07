import { put } from "@vercel/blob";
import { apiHandler, HttpError, json } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { randomCode } from "@/lib/ids";

const ALLOWED = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/avif", "avif"],
]);
const MAX_BYTES = 4 * 1024 * 1024; // stays under the serverless request body limit

export const POST = apiHandler(
  async (req) => {
    await requireAdmin();
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      throw new HttpError(503, "Image uploads aren't configured. Add BLOB_READ_WRITE_TOKEN (Vercel Blob) or paste an image URL instead.", "UPLOAD_NOT_CONFIGURED");
    }
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) throw new HttpError(400, "No file received.");
    const ext = ALLOWED.get(file.type);
    if (!ext) throw new HttpError(400, "Only JPG, PNG, WebP or AVIF images are allowed.");
    if (file.size > MAX_BYTES) throw new HttpError(400, "Images must be 4 MB or smaller.");
    const blob = await put(`products/${Date.now()}-${randomCode(6).toLowerCase()}.${ext}`, file, { access: "public", contentType: file.type });
    return json({ url: blob.url }, { status: 201 });
  },
  { rateLimit: { name: "admin-upload", max: 60, windowMs: 10 * 60_000 } },
);
