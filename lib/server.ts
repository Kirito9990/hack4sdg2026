import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { store } from "@/lib/db";
import { readPasswordSession } from "@/lib/persistence.mjs";
import type { User } from "@/lib/types";
export const COOKIE = "carecall_session";
const AUTH_WINDOW_MS = 15 * 60 * 1000;
const AUTH_LIMIT = 8;
// Counts stay in this process. A restart clears them. That is acceptable for one server process.
function authFailures() {
  const g = globalThis as typeof globalThis & {
    __carecallAuthFailures?: Map<string, number[]>;
  };
  return (g.__carecallAuthFailures ??= new Map());
}
export function authLimited(key: string) {
  const now = Date.now();
  const recent = (authFailures().get(key) || []).filter(
    (time) => now - time < AUTH_WINDOW_MS,
  );
  authFailures().set(key, recent);
  return recent.length >= AUTH_LIMIT;
}
export function authFailed(key: string) {
  const now = Date.now();
  const recent = (authFailures().get(key) || []).filter(
    (time) => now - time < AUTH_WINDOW_MS,
  );
  recent.push(now);
  authFailures().set(key, recent);
}
export function publicUser(user: User) {
  const safe = { ...user };
  delete safe.passwordHash;
  return safe;
}
export async function currentUser() {
  const token = (await cookies()).get(COOKIE)?.value;
  const data = store();
  const session = readPasswordSession(token);
  return session ? data.users.find((u) => u.id === session.userId) : undefined;
}
export function json(value: unknown, status = 200) {
  return NextResponse.json(value, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}
export function fail(error: string, status = 400) {
  return json({ error }, status);
}
export function publicOrigin() {
  return process.env.CARECALL_PUBLIC_ORIGIN || process.env.RENDER_EXTERNAL_URL;
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    const source = new URL(origin);
    const configured = publicOrigin();
    if (configured) {
      return source.origin === new URL(configured).origin;
    }
    // Next may normalize request.url to localhost when bound to a loopback IP.
    // Compare against the actual Host header; never trust an arbitrary forwarded host.
    return (
      source.host === request.headers.get("host") &&
      source.protocol === new URL(request.url).protocol
    );
  } catch {
    return false;
  }
}
export function validCoords(lat: unknown, lng: unknown): lat is number {
  return (
    typeof lat === "number" &&
    typeof lng === "number" &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180
  );
}
export function normalizePhone(value: string) {
  const cleaned = value.replace(/[\s().-]/g, "");
  return /^\d{8}$/.test(cleaned) ? "+852" + cleaned : cleaned;
}
export function validPhone(value: string) {
  return /^\+[1-9]\d{7,14}$/.test(value) && !/^\+8520{8}$/.test(value);
}
