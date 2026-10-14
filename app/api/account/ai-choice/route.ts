import { persist } from "@/lib/db";
import { applyAiChoice } from "@/lib/ai-consent";
import { currentUser, fail, json, publicUser, sameOrigin } from "@/lib/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!sameOrigin(request)) return fail("forbidden", 403);
  const user = await currentUser();
  if (!user) return fail("sessionExpired", 401);
  const body = await request.json().catch(() => null);
  if (!body || (body.choice !== "allow" && body.choice !== "decline")) return fail("invalidInput");
  user.privacy = applyAiChoice(user.privacy, body.choice);
  persist();
  return json({ user: publicUser(user) });
}
