import {historyVisible} from "@/lib/retention";
import { getRequest, member, store, view } from "@/lib/db";
import { currentUser, fail, json } from "@/lib/server";
export const runtime = "nodejs";
export async function GET(request: Request) {
  const user = await currentUser();
  if (!user) return fail("sessionExpired", 401);
  const id = new URL(request.url).searchParams.get("id");
  if (!id)
    return json({
      requests: store()
        .requests.filter((r) => member(r, user) && historyVisible(r))
        .map((r) => view(r, user))
        .reverse(),
    });
  const found = getRequest(id);
  if (!found || !member(found, user) || !historyVisible(found)) return fail("notFound", 404);
  return json(view(found, user));
}
