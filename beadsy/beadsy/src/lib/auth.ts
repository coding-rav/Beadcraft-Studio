import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";
import { db } from "./db";
import { HttpError } from "./api";
import { sha256 } from "./ids";
import { SESSION_COOKIE, SESSION_MAX_AGE, signSession, verifySession, type SessionPayload } from "./session";
import type { SessionUser } from "./types";

const BCRYPT_COST = 12;

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_COST);
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

let dummyHash: Promise<string> | undefined;
/** Used to keep login timing similar whether or not the account exists. */
export function burnPasswordCheck(password: string): Promise<boolean> {
  dummyHash ??= bcrypt.hash("beadsy-timing-equaliser", BCRYPT_COST);
  return dummyHash.then((h) => bcrypt.compare(password, h));
}

export function passwordFingerprint(passwordHash: string): string {
  return sha256(passwordHash).slice(0, 12);
}

export async function startSession(user: {
  id: string;
  email: string;
  name: string;
  role: Role;
  passwordHash: string;
}): Promise<void> {
  const token = await signSession({
    sub: user.id,
    role: user.role,
    name: user.name,
    email: user.email,
    pv: passwordFingerprint(user.passwordHash),
  });
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export async function endSession(): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
}

/** Verifies the cookie signature only (no DB hit). */
export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  return verifySession(store.get(SESSION_COOKIE)?.value);
}

/** Verifies the cookie AND loads the user from the database (authoritative role, password-change revocation). */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const session = await getSession();
  if (!session) return null;
  const user = await db.user.findUnique({
    where: { id: session.sub },
    select: { id: true, name: true, email: true, role: true, passwordHash: true },
  });
  if (!user || passwordFingerprint(user.passwordHash) !== session.pv) return null;
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

/** For API routes / server actions: throws 401. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new HttpError(401, "Please sign in to continue.", "UNAUTHENTICATED");
  return user;
}

/** For API routes / server actions: throws 401/403. */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "ADMIN") throw new HttpError(403, "You do not have access to this.", "FORBIDDEN");
  return user;
}

/** For pages: redirects to the login page. */
export async function requirePageUser(nextPath: string): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  return user;
}

/** For admin pages: redirects non-admins away. */
export async function requireAdminPage(): Promise<SessionUser> {
  const user = await requirePageUser("/admin");
  if (user.role !== "ADMIN") redirect("/");
  return user;
}
