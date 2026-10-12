import { getRequest, member, view } from "@/lib/db";
import { insertRating, ratingFrom } from "@/lib/persistence.mjs";
import { ratingScore } from "@/lib/ratings";
import { currentUser, fail, json, sameOrigin } from "@/lib/server";
export const runtime = "nodejs";
export async function POST(request: Request) {
  if (!sameOrigin(request)) return fail("forbidden", 403);
  const user = await currentUser();
  if (!user) return fail("sessionExpired", 401);
  const body = await request.json().catch(() => null);
  const score = ratingScore(body?.score);
  const found = body && getRequest(body.id);
  if (!found || !member(found, user)) return fail("notFound", 404);
  if (!score) return fail("invalidInput");
  if (
    found.status !== "CLOSED" ||
    found.closedReason !== "completed" ||
    !found.volunteerId
  )
    return fail("ratingUnavailable", 403);
  const subjectId =
    user.id === found.residentId ? found.volunteerId : found.residentId;
  if (subjectId === user.id) return fail("forbidden", 403);
  const existing = ratingFrom(found.id, user.id);
  if (typeof existing === "number") {
    if (existing !== score) return fail("ratingAlreadySent", 409);
    return json(view(found, user));
  }
  insertRating({
    requestId: found.id,
    raterId: user.id,
    subjectId,
    score,
    createdAt: new Date().toISOString(),
  });
  return json(view(found, user));
}
