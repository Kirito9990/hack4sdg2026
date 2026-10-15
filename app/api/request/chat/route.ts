import { chatOpen, chatReadable, getRequest, member, store, persist, redact } from "@/lib/db";
import { currentUser, fail, json, sameOrigin } from "@/lib/server";
import { chatImage } from "@/lib/chat-image";
import { attachTranslations } from "@/lib/chat-translate";
import { translateChatText } from "@/lib/openrouter";
export const runtime = "nodejs";
export async function GET(request: Request) {
  const user = await currentUser();
  if (!user) return fail("sessionExpired", 401);
  const found = getRequest(new URL(request.url).searchParams.get("id") || "");
  if (!found || !member(found, user)) return fail("notFound", 404);
  if (!chatReadable(found)) return fail("chatUnavailable", 403);
  const people = store().users.filter((u) => u.id === found.residentId || u.id === found.volunteerId);
  const messages = store()
    .messages.filter((m) => m.requestId === found.id)
    .map((m) =>
      found.status === "CLOSED"
        ? {
            id: m.id,
            requestId: m.requestId,
            senderId: m.senderId,
            createdAt: m.createdAt,
            text: redact(m.text, people),
            imageHidden: !!m.imageData,
          }
        : m,
    );
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
  if (Number(request.headers.get("content-length")) > 9 * 1024 * 1024)
    return fail("fileTooLarge", 413);
  const multipart = request.headers
    .get("content-type")
    ?.includes("multipart/form-data");
  const form = multipart ? await request.formData().catch(() => null) : null;
  const body = multipart
      ? form
        ? { id: form.get("id"), text: form.get("text") || "" }
        : null
      : await request.json().catch(() => null),
    found = body && getRequest(body.id);
  if (!found || !member(found, user)) return fail("notFound", 404);
  if (!chatOpen(found)) return fail("chatUnavailable", 403);
  if (
    typeof body.text !== "string" ||
    (!body.text.trim() && !(form?.get("image") instanceof File)) ||
    body.text.length > 1000
  )
    return fail("invalidMessage");
  const data = store();
  const file = form?.get("image");
  let imageData: string | undefined;
  if (file instanceof File) {
    if (
      data.messages.filter((m) => m.requestId === found.id && m.imageData)
        .length >= 20
    )
      return fail("imageLimit", 429);
    try {
      imageData = await chatImage(file);
    } catch (e) {
      return fail(
        (e as Error).message === "fileTooLarge"
          ? "fileTooLarge"
          : "invalidImage",
      );
    }
    // Recheck after asynchronous decoding in case the resident closed the request.
    if (!chatOpen(found)) return fail("chatUnavailable", 403);
    if (
      data.messages.filter((m) => m.requestId === found.id && m.imageData)
        .length >= 20
    )
      return fail("imageLimit", 429);
  }
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
    imageData,
    createdAt: new Date().toISOString(),
  };
  data.messages.push(message);
  persist();
  return json({ message }, 201);
}
