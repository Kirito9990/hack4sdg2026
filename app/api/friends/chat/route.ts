import { redact, store } from "@/lib/db";
import {
  friendshipById,
  friendMessages,
  friendMessagesSince,
  insertFriendMessage,
} from "@/lib/persistence.mjs";
import { attachTranslations } from "@/lib/chat-translate";
import { translateChatText } from "@/lib/openrouter";
import { currentUser, fail, json, sameOrigin } from "@/lib/server";
export const runtime = "nodejs";

function thread(id: string, userId: string) {
  const row = friendshipById(id);
  if (!row || (row.userA !== userId && row.userB !== userId)) return null;
  const people = store().users.filter((person) => person.id === row.userA || person.id === row.userB);
  if (people.length !== 2 || people.some((person) => !person.privacy.allowChat)) return "closed" as const;
  return { row, people };
}

export async function GET(request: Request) {
  const user = await currentUser();
  if (!user) return fail("sessionExpired", 401);
  const found = thread(new URL(request.url).searchParams.get("id") || "", user.id);
  if (!found) return fail("notFound", 404);
  if (found === "closed") return fail("chatUnavailable", 403);
  const messages = friendMessages(found.row.id).map((message: { id: string; senderId: string; text: string; createdAt: string }) => ({
    ...message,
    text: redact(message.text, found.people),
  }));
  return json({
    messages: await attachTranslations(
      messages,
      user.id,
      new URL(request.url).searchParams.get("locale"),
      translateChatText,
    ),
  });
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return fail("forbidden", 403);
  const user = await currentUser();
  if (!user) return fail("sessionExpired", 401);
  const body = await request.json().catch(() => null);
  const found = body && thread(String(body.id || ""), user.id);
  if (!found) return fail("notFound", 404);
  if (found === "closed") return fail("chatUnavailable", 403);
  if (typeof body.text !== "string" || !body.text.trim() || body.text.length > 1000)
    return fail("invalidMessage");
  if (friendMessagesSince(user.id, new Date(Date.now() - 60000).toISOString()) >= 30)
    return fail("tooManyMessages", 429);
  const message = {
    id: crypto.randomUUID(),
    friendshipId: found.row.id,
    senderId: user.id,
    text: body.text.trim(),
    createdAt: new Date().toISOString(),
  };
  insertFriendMessage(message);
  return json({
    message: { id: message.id, senderId: message.senderId, text: redact(message.text, found.people), createdAt: message.createdAt },
  }, 201);
}
