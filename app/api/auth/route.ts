import { cookies } from "next/headers";
import { store } from "@/lib/db";
import {
  COOKIE,
  currentUser,
  fail,
  json,
  normalizePhone,
  publicOrigin,
  sameOrigin,
  validPhone,
} from "@/lib/server";
export const runtime = "nodejs";
export async function GET() {
  return json({ user: (await currentUser()) ?? null });
}
export async function POST(request: Request) {
  if (!sameOrigin(request)) return fail("forbidden", 403);
  const body = await request.json().catch(() => null);
  if (
    !body ||
    typeof body.name !== "string" ||
    body.name.trim().length < 2 ||
    body.name.length > 80
  )
    return fail("invalidName");
  const phone = normalizePhone(
    typeof body.phone === "string" ? body.phone : "",
  );
  if (!validPhone(phone)) return fail("invalidPhone");
  if (!["resident", "volunteer"].includes(body.role))
    return fail("invalidRole");
  const data = store();
  const user = {
    id: crypto.randomUUID(),
    name: body.name.trim(),
    phone,
    role: body.role,
    privacy: {
      allowCalls: body.allowCalls === true,
      allowChat: true,
      allowAI: false,
    },
    createdAt: new Date().toISOString(),
  };
  data.users.push(user);
  const session = {
    id: crypto.randomUUID(),
    userId: user.id,
    createdAt: new Date().toISOString(),
  };
  data.sessions.push(session);
  (await cookies()).set(COOKIE, session.id, {
    httpOnly: true,
    sameSite: "strict",
    secure: new URL(publicOrigin() || request.url).protocol === "https:",
    path: "/",
    maxAge: 604800,
  });
  return json({ user });
}
export async function DELETE(request: Request) {
  if (!sameOrigin(request)) return fail("forbidden", 403);
  const jar = await cookies(),
    token = jar.get(COOKIE)?.value,
    data = store();
  data.sessions = data.sessions.filter((s) => s.id !== token);
  jar.delete(COOKIE);
  return json({ ok: true });
}
