import { cookies } from "next/headers";
import { store, persist } from "@/lib/db";
import { hashPassword, passwordAccepted, validPassword } from "@/lib/passwords";
import {
  COOKIE,
  authFailed,
  authLimited,
  currentUser,
  fail,
  json,
  normalizePhone,
  publicOrigin,
  publicUser,
  sameOrigin,
  validPhone,
} from "@/lib/server";
export const runtime = "nodejs";
export async function GET() {
  const user = await currentUser();
  return json({ user: user ? publicUser(user) : null });
}
export async function POST(request: Request) {
  if (!sameOrigin(request)) return fail("forbidden", 403);
  const body = await request.json().catch(() => null);
  if (!body) return fail("invalidInput");
  const mode = body.mode === "create" ? "create" : "login";
  if (
    mode === "create" &&
    (typeof body.name !== "string" ||
      body.name.trim().length < 2 ||
      body.name.length > 80)
  )
    return fail("invalidName");
  const phone = normalizePhone(
    typeof body.phone === "string" ? body.phone : "",
  );
  if (!validPhone(phone)) return fail("invalidPhone");
  if (!["resident", "volunteer"].includes(body.role))
    return fail("invalidRole");
  if (mode === "create" && body.privacyAccepted !== true)
    return fail("privacyRequired");
  if (!validPassword(body.password)) return fail("invalidPassword");
  const attemptKey = phone + ":" + body.role;
  if (authLimited(attemptKey)) return fail("tooManyAttempts", 429);
  const data = store();
  let user = data.users
    .filter((item) => item.phone === phone && item.role === body.role)
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))[0];
  if (mode === "create") {
    if (user) return fail("accountExists");
    user = {
      id: crypto.randomUUID(),
      name: body.name.trim(),
      phone,
      role: body.role,
      privacy: {
        allowCalls: body.allowCalls === true,
        allowChat: true,
        allowAI: true,
        showName: false,
        shareAddress: false,
        shareLocation: false,
        allowLocation: body.allowLocation === true,
      },
      passwordHash: await hashPassword(body.password),
      privacyAcceptedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    data.users.push(user);
  } else if (!(await passwordAccepted(user, body.password))) {
    authFailed(attemptKey);
    return fail("invalidCredentials");
  }
  const session = {
    id: crypto.randomUUID(),
    userId: user.id,
    createdAt: new Date().toISOString(),
    passwordAuth: true,
  };
  data.sessions.push(session);
  persist();
  (await cookies()).set(COOKIE, session.id, {
    httpOnly: true,
    sameSite: "strict",
    secure: new URL(publicOrigin() || request.url).protocol === "https:",
    path: "/",
    maxAge: 30 * 86400,
  });
  return json({ user: publicUser(user) });
}
export async function DELETE(request: Request) {
  if (!sameOrigin(request)) return fail("forbidden", 403);
  const jar = await cookies(),
    token = jar.get(COOKIE)?.value,
    data = store();
  data.sessions = data.sessions.filter((s) => s.id !== token);
  persist();
  jar.delete(COOKIE);
  return json({ ok: true });
}
