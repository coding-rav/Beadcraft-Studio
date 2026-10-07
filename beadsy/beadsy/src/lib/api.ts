import { NextResponse, type NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";
import { rateLimit } from "./rate-limit";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

const NO_STORE = { "Cache-Control": "private, no-store" };

export function json<T>(data: T, init?: { status?: number; headers?: Record<string, string> }): NextResponse {
  return NextResponse.json(data, {
    status: init?.status ?? 200,
    headers: { ...NO_STORE, ...(init?.headers ?? {}) },
  });
}

export function clientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

/** Reject cross-site browser requests to cookie-authenticated endpoints (CSRF defence in depth). */
export function assertSameOrigin(req: NextRequest): void {
  const origin = req.headers.get("origin");
  if (origin) {
    let host: string;
    try {
      host = new URL(origin).host;
    } catch {
      throw new HttpError(403, "Bad origin", "BAD_ORIGIN");
    }
    const expected = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
    if (expected && host !== expected) throw new HttpError(403, "Cross-site request blocked", "CROSS_SITE");
    return;
  }
  if (req.headers.get("sec-fetch-site") === "cross-site") {
    throw new HttpError(403, "Cross-site request blocked", "CROSS_SITE");
  }
}

interface HandlerOptions {
  /** Enforce same-origin on non-GET requests. Disable for webhooks. Default true. */
  sameOrigin?: boolean;
  rateLimit?: { name: string; max: number; windowMs: number };
}

/**
 * Wraps a route handler with: same-origin check, rate limiting, uniform error
 * responses (validation → 400, HttpError → its status, unique violation → 409,
 * anything else → generic 500 without leaking internals).
 */
export function apiHandler(
  fn: (req: NextRequest) => Promise<Response>,
  opts?: HandlerOptions,
): (req: NextRequest) => Promise<Response>;
export function apiHandler<Ctx>(
  fn: (req: NextRequest, ctx: Ctx) => Promise<Response>,
  opts?: HandlerOptions,
): (req: NextRequest, ctx: Ctx) => Promise<Response>;
export function apiHandler(
  fn: (req: NextRequest, ctx: never) => Promise<Response>,
  opts: HandlerOptions = {},
): (req: NextRequest, ctx: never) => Promise<Response> {
  return async (req: NextRequest, ctx: never): Promise<Response> => {
    try {
      if (opts.sameOrigin !== false && !["GET", "HEAD", "OPTIONS"].includes(req.method)) {
        assertSameOrigin(req);
      }
      if (opts.rateLimit) {
        const r = rateLimit(`${opts.rateLimit.name}:${clientIp(req)}`, opts.rateLimit.max, opts.rateLimit.windowMs);
        if (!r.ok) {
          return json(
            { error: "Too many requests. Please slow down and try again shortly." },
            { status: 429, headers: { "Retry-After": String(r.retryAfterSeconds) } },
          );
        }
      }
      return await fn(req, ctx);
    } catch (err) {
      return errorResponse(err);
    }
  };
}

export function errorResponse(err: unknown): NextResponse {
  if (err instanceof HttpError) {
    return json({ error: err.message, code: err.code, details: err.details }, { status: err.status });
  }
  if (err instanceof ZodError) {
    return json(
      {
        error: "Please check the highlighted fields.",
        code: "VALIDATION",
        issues: err.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
      },
      { status: 400 },
    );
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
    return json({ error: "That already exists.", code: "CONFLICT" }, { status: 409 });
  }
  // Log message only — never the full error object (may contain query params / secrets).
  console.error("[api] unhandled error:", err instanceof Error ? `${err.name}: ${err.message}` : "unknown");
  return json({ error: "Something went wrong. Please try again." }, { status: 500 });
}

export async function readJson(req: NextRequest): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    throw new HttpError(400, "Request body must be valid JSON", "BAD_JSON");
  }
}
