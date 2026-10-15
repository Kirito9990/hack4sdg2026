import {historyVisible} from "@/lib/retention";
import { getRequest, member, store, view } from "@/lib/db";
import { translateRequestContent } from "@/lib/chat-translate";
import { translateChatText } from "@/lib/openrouter";
import { currentUser, fail, json } from "@/lib/server";
export const runtime = "nodejs";
export async function GET(request: Request) {
  const user = await currentUser();
  if (!user) return fail("sessionExpired", 401);
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  const locale = url.searchParams.get("locale");
  if (!id) {
    const requests = store()
      .requests.filter((r) => member(r, user) && historyVisible(r))
      .map((r) => view(r, user))
      .reverse();
    return json({
      requests: await Promise.all(
        requests.map((item) => translateRequestContent(item, locale, translateChatText)),
      ),
    });
  }
  const found = getRequest(id);
  if (!found || !member(found, user) || !historyVisible(found)) return fail("notFound", 404);
  return json(await translateRequestContent(view(found, user), locale, translateChatText));
}
