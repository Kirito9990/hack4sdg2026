import { chatOpen, getRequest, member, store } from "@/lib/db";
import { currentUser, fail, json, sameOrigin } from "@/lib/server";
export const runtime = "nodejs";
export async function GET(request: Request) {
  const user = await currentUser();
  if (!user) return fail("sessionExpired", 401);
  const found = getRequest(new URL(request.url).searchParams.get("id") || "");
  if (!found || !member(found, user)) return fail("notFound", 404);
  if (!chatOpen(found)) return fail("chatUnavailable", 403);
  return json({
    messages: store().messages.filter((m) => m.requestId === found.id),
  });
}
export async function POST(request: Request) {
  if (!sameOrigin(request)) return fail("forbidden", 403);
  const user = await currentUser();
  if (!user) return fail("sessionExpired", 401);
  const body = await request.json().catch(() => null),
    found = body && getRequest(body.id);
  if (!found || !member(found, user)) return fail("notFound", 404);
  if (!chatOpen(found)) return fail("chatUnavailable", 403);
  if (
    typeof body.text !== "string" ||
    !body.text.trim() ||
    body.text.length > 1000
  )
    return fail("invalidMessage");
  const data = store();
  if (
    data.messages.filter(
      (m) =>
        m.senderId === user.id && Date.parse(m.createdAt) > Date.now() - 60000,
    ).length >= 30
  )
    return fail("tooManyMessages", 429);
  const message = {
    id: crypto.randomUUID(),
    requestId: found.id,
    senderId: user.id,
    text: body.text.trim(),
    createdAt: new Date().toISOString(),
  };
  data.messages.push(message);
  return json({ message }, 201);
}
