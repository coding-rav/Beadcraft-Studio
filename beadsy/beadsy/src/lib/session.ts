/**
 * Edge-safe session token helpers (used by middleware and server code).
 * Sessions are signed JWTs (HS256) stored in an httpOnly cookie.
 */
import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "beadsy_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 14; // 14 days

export interface SessionPayload {
  sub: string;
  role: "CUSTOMER" | "ADMIN";
  name: string;
  email: string;
  /** fingerprint of the password hash — changing the password revokes old sessions */
  pv: string;
}

function secretKey(): Uint8Array {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 32) {
    throw new Error("AUTH_SECRET is missing or shorter than 32 characters. Generate one with: openssl rand -base64 48");
  }
  return new TextEncoder().encode(s);
}

export async function signSession(p: SessionPayload): Promise<string> {
  return new SignJWT({ role: p.role, name: p.name, email: p.email, pv: p.pv })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(p.sub)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(secretKey());
}

export async function verifySession(token: string | undefined | null): Promise<SessionPayload | null> {
  if (!token) return null;
  const key = secretKey(); // a missing secret is a deployment error: fail loudly
  try {
    const { payload } = await jwtVerify(token, key, { algorithms: ["HS256"] });
    if (!payload.sub || (payload.role !== "CUSTOMER" && payload.role !== "ADMIN")) return null;
    return {
      sub: payload.sub,
      role: payload.role,
      name: String(payload.name ?? ""),
      email: String(payload.email ?? ""),
      pv: String(payload.pv ?? ""),
    };
  } catch {
    return null;
  }
}
