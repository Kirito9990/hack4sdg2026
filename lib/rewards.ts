import type { HelpRequest, User, UrgencyLevel } from "./types";

export type RewardQuote = { points: number; urgency: UrgencyLevel; version: 1 };
export type RewardEvent = { requestId: string; volunteerId: string; points: number; urgency: string; ruleVersion: number; earnedAt: string };
export type BadgeUnlock = { code: string; unlockedAt: string };
export type Award = { code: string; kind: "helps" | "points" | "streak" | "monthly"; target: number; progress: number; earnedAt?: string; month?: string; metric?: string };
export const HELP_MILESTONES = [1, 10, 25, 50, 100, 200, 300];
export const POINT_MILESTONES = [100, 500, 1000];
export const STREAK_MILESTONES = [3, 7, 30];
export const MONTHLY_GOALS = { helps: 5, days: 4, points: 50 };

export function quoteReward(request: Pick<HelpRequest, "dispatch_action" | "urgency_level">, resident?: User, volunteer?: User): RewardQuote {
  const eligible = request.dispatch_action === "NEIGHBORHOOD_VOLUNTEER" && resident && volunteer && resident.id !== volunteer.id && resident.phone !== volunteer.phone;
  return { points: eligible ? request.urgency_level === "HIGH" ? 15 : request.urgency_level === "MEDIUM" ? 10 : 5 : 0, urgency: request.urgency_level, version: 1 };
}

export function completionReward(request: HelpRequest, resident?: User, volunteer?: User): RewardEvent | undefined {
  const quote = request.rewardQuote;
  if (!volunteer || request.status !== "ACCEPTED" || !quote || quote.version !== 1 || ![5, 10, 15].includes(quote.points) || !quoteReward(request, resident, volunteer).points || volunteer.id !== request.volunteerId) return;
  return { requestId: request.id, volunteerId: volunteer.id, points: quote.points, urgency: quote.urgency, ruleVersion: quote.version, earnedAt: new Date().toISOString() };
}

export function localDay(date: string | number): string {
  const parts = new Intl.DateTimeFormat("en", { timeZone: "Asia/Hong_Kong", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(date));
  return ["year", "month", "day"].map(key => parts.find(p => p.type === key)!.value).join("-");
}
const dayNumber = (day: string) => Date.parse(day + "T00:00:00Z") / 86400000;
function sortedEvents(events: RewardEvent[], now: number) {
  return [...events].filter(e => Date.parse(e.earnedAt) <= now).sort((a, b) => a.earnedAt.localeCompare(b.earnedAt) || a.requestId.localeCompare(b.requestId));
}

// Derive first crossing times; the database keeps these unlocks permanently.
export function earnedBadges(events: RewardEvent[], now = Date.now()): BadgeUnlock[] {
  const result = new Map<string, string>();
  const months = new Map<string, { helps: number; points: number; days: Set<string> }>();
  let helps = 0, points = 0, streak = 0, lastDay = "";
  const unlock = (code: string, time: string) => { if (!result.has(code)) result.set(code, time); };
  for (const event of sortedEvents(events, now)) {
    const day = localDay(event.earnedAt), month = day.slice(0, 7);
    helps++; points += event.points;
    if (day !== lastDay) { streak = lastDay && dayNumber(day) - dayNumber(lastDay) === 1 ? streak + 1 : 1; lastDay = day; }
    for (const target of HELP_MILESTONES) if (helps >= target) unlock("helps:" + target, event.earnedAt);
    for (const target of POINT_MILESTONES) if (points >= target) unlock("points:" + target, event.earnedAt);
    for (const target of STREAK_MILESTONES) if (streak >= target) unlock("streak:" + target, event.earnedAt);
    const stats = months.get(month) || { helps: 0, points: 0, days: new Set<string>() };
    stats.helps++; stats.points += event.points; stats.days.add(day); months.set(month, stats);
    for (const [metric, target] of Object.entries(MONTHLY_GOALS)) {
      const value = metric === "days" ? stats.days.size : metric === "helps" ? stats.helps : stats.points;
      if (value >= target) unlock(`monthly:${month}:${metric}`, event.earnedAt);
    }
  }
  return [...result].map(([code, unlockedAt]) => ({ code, unlockedAt }));
}

export function rewardSummary(events: RewardEvent[], unlocks: BadgeUnlock[], now = Date.now()) {
  const ordered = sortedEvents(events, now), today = localDay(now), month = today.slice(0, 7);
  const days = [...new Set(ordered.map(e => localDay(e.earnedAt)))];
  let streak = 0, longest = 0, previous = "";
  for (const day of days) { streak = previous && dayNumber(day) - dayNumber(previous) === 1 ? streak + 1 : 1; longest = Math.max(longest, streak); previous = day; }
  const currentStreak = previous && dayNumber(today) - dayNumber(previous) <= 1 ? streak : 0;
  const points = ordered.reduce((sum, e) => sum + e.points, 0), helps = ordered.length;
  const thisMonth = ordered.filter(e => localDay(e.earnedAt).startsWith(month));
  const monthly = { helps: thisMonth.length, days: new Set(thisMonth.map(e => localDay(e.earnedAt))).size, points: thisMonth.reduce((sum, e) => sum + e.points, 0) };
  const unlocked = new Map(unlocks.map(b => [b.code, b.unlockedAt]));
  const badges: Award[] = [
    ...HELP_MILESTONES.map(target => ({ code: "helps:" + target, kind: "helps" as const, target, progress: helps })),
    ...POINT_MILESTONES.map(target => ({ code: "points:" + target, kind: "points" as const, target, progress: points })),
    ...STREAK_MILESTONES.map(target => ({ code: "streak:" + target, kind: "streak" as const, target, progress: currentStreak })),
  ].map(b => ({ ...b, earnedAt: unlocked.get(b.code) }));
  const challenges: Award[] = Object.entries(MONTHLY_GOALS).map(([metric, target]) => ({ code: `monthly:${month}:${metric}`, kind: "monthly", month, metric, target, progress: monthly[metric as keyof typeof monthly], earnedAt: unlocked.get(`monthly:${month}:${metric}`) }));
  const pastMonthly: Award[] = unlocks.filter(b => b.code.startsWith("monthly:") && b.code.split(":")[1] < month).map(b => {
    const [, earnedMonth, metric] = b.code.split(":");
    const target = MONTHLY_GOALS[metric as keyof typeof MONTHLY_GOALS];
    return { code: b.code, kind: "monthly" as const, month: earnedMonth, metric, target, progress: target, earnedAt: b.unlockedAt };
  }).sort((a, b) => b.earnedAt!.localeCompare(a.earnedAt!));
  return { points, helps, currentStreak, longestStreak: longest, month, monthly, badges, challenges, pastMonthly, recent: ordered.slice(-10).reverse(), nextMilestone: HELP_MILESTONES.find(n => n > helps) ?? null };
}
export type RewardSummary = ReturnType<typeof rewardSummary>;
