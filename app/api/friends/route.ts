import { getRequest, member, store, view } from "@/lib/db";
import { friendDecision, offerState } from "@/lib/friends";
import { historyVisible } from "@/lib/retention";
import {
  friendOffer,
  friendshipsFor,
  friendshipBetween,
  insertFriendOffer,
  insertFriendship,
} from "@/lib/persistence.mjs";
import { currentUser, fail, json, sameOrigin } from "@/lib/server";
export const runtime = "nodejs";

export async function GET() {
  const user = await currentUser();
  if (!user) return fail("sessionExpired", 401);
  const data = store();
  const friends = friendshipsFor(user.id).map((row: { id: string; userA: string; userB: string; createdAt: string }) => {
    const otherId = row.userA === user.id ? row.userB : row.userA;
    const person = data.users.find((item) => item.id === otherId);
    return {
      id: row.id,
      name: person?.name || "",
      role: person?.role || "resident",
      createdAt: row.createdAt,
    };
  });
  type PersonRow = {
    requestId: string;
    name: string;
    role: string;
    category: string;
    closedAt?: string;
    status: "incoming" | "outgoing" | "none";
  };
  const rank: Record<PersonRow["status"], number> = { incoming: 0, none: 1, outgoing: 2 };
  const people = new Map<string, PersonRow>();
  for (const request of data.requests) {
    if (!historyVisible(request) || request.closedReason !== "completed" || !request.volunteerId || !member(request, user))
      continue;
    const partnerId = user.id === request.residentId ? request.volunteerId : request.residentId;
    if (!partnerId || partnerId === user.id || friendshipBetween(user.id, partnerId)) continue;
    const status = offerState(
      friendDecision(friendOffer(request.id, user.id)),
      friendDecision(friendOffer(request.id, partnerId)),
      false,
    );
    if (status !== "incoming" && status !== "outgoing" && status !== "none") continue;
    const partner = data.users.find((item) => item.id === partnerId);
    const row = {
      requestId: request.id,
      name: partner?.name || "",
      role: partner?.role || (user.role === "resident" ? "volunteer" : "resident"),
      category: request.category,
      closedAt: request.closedAt,
      status,
    };
    const previous = people.get(partnerId);
    if (
      !previous ||
      rank[status] < rank[previous.status] ||
      (status === previous.status && String(request.closedAt || "") > String(previous.closedAt || ""))
    ) {
      people.set(partnerId, row);
    }
  }
  const listed = [...people.values()].sort((a, b) => rank[a.status] - rank[b.status]);
  const invites = listed.filter((row) => row.status !== "none");
  const suggestions = listed.filter((row) => row.status === "none");
  return json({ friends, invites, suggestions });
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return fail("forbidden", 403);
  const user = await currentUser();
  if (!user) return fail("sessionExpired", 401);
  const body = await request.json().catch(() => null);
  const decision = friendDecision(body?.decision);
  const found = body && getRequest(body.id);
  if (!found || !member(found, user)) return fail("notFound", 404);
  if (!decision) return fail("invalidInput");
  if (found.status !== "CLOSED" || found.closedReason !== "completed" || !found.volunteerId)
    return fail("friendUnavailable", 403);
  const partnerId = user.id === found.residentId ? found.volunteerId : found.residentId;
  if (!partnerId || partnerId === user.id) return fail("forbidden", 403);
  if (friendshipBetween(user.id, partnerId)) return json(view(found, user));
  const existing = friendOffer(found.id, user.id);
  if (existing) {
    if (existing !== decision) return fail("friendDecisionSent", 409);
    return json(view(found, user));
  }
  const createdAt = new Date().toISOString();
  insertFriendOffer({ requestId: found.id, userId: user.id, decision, createdAt });
  if (decision === "accept" && friendOffer(found.id, partnerId) === "accept") {
    insertFriendship({
      id: crypto.randomUUID(),
      userA: user.id,
      userB: partnerId,
      requestId: found.id,
      createdAt,
    });
  }
  return json(view(found, user));
}
