export type FriendDecision = "accept" | "decline";
export type FriendStatus = "none" | "outgoing" | "incoming" | "friends" | "declined";

export function friendDecision(value: unknown): FriendDecision | null {
  return value === "accept" || value === "decline" ? value : null;
}

export function offerState(
  mine: FriendDecision | null | undefined,
  theirs: FriendDecision | null | undefined,
  alreadyFriends: boolean,
): FriendStatus {
  if (alreadyFriends || (mine === "accept" && theirs === "accept")) return "friends";
  if (mine === "decline" || theirs === "decline") return "declined";
  if (mine === "accept") return "outgoing";
  if (theirs === "accept") return "incoming";
  return "none";
}
