const URGENCY_RANK: Record<string, number> = {
  HIGH: 0,
  MEDIUM: 1,
  LOW: 2,
  NOT_ASSESSED: 3,
};

export type PriorityItem = {
  urgency: string;
  createdAt: string;
  distance: number;
  id?: string;
};

export function compareRequestPriority(a: PriorityItem, b: PriorityItem) {
  const urgency = (URGENCY_RANK[a.urgency] ?? 3) - (URGENCY_RANK[b.urgency] ?? 3);
  if (urgency) return urgency;
  const waited = waitedAt(a.createdAt) - waitedAt(b.createdAt);
  if (waited) return waited;
  if (a.distance !== b.distance) return a.distance - b.distance;
  return (a.id || "").localeCompare(b.id || "");
}

function waitedAt(createdAt: string) {
  const time = Date.parse(createdAt);
  return Number.isFinite(time) ? time : Number.POSITIVE_INFINITY;
}

/** The first poll records what is already nearby. Later polls return only new ids. */
export function unseenTasks<T extends { id: string }>(seen: ReadonlySet<string> | null, tasks: readonly T[]) {
  const next = new Set(seen ?? []);
  const fresh = seen ? tasks.filter((task) => !seen.has(task.id)) : [];
  for (const task of tasks) next.add(task.id);
  return { seen: next, fresh };
}

export function waitingParts(createdAt: string, now = Date.now()) {
  const started = Date.parse(createdAt);
  const elapsed = Number.isFinite(started) ? Math.max(0, now - started) : 0;
  const minutes = Math.floor(elapsed / 60000);
  if (minutes < 1) return { key: "waitingNow" as const, count: 0 };
  if (minutes < 60) return { key: "waitingMinutes" as const, count: minutes };
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return { key: "waitingHours" as const, count: hours };
  return { key: "waitingDays" as const, count: Math.floor(hours / 24) };
}
