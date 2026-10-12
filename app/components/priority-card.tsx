"use client";
import { useApp } from "./providers";
import type { UrgencyLevel, RequestCategory } from "@/lib/types";

export function RequestNeeds({
  requirements,
  tools,
  resources,
}: {
  requirements?: string[];
  tools?: string[];
  resources?: string[];
}) {
  const { t } = useApp();
  const groups = (
    [
      ["requirements", requirements],
      ["tools", tools],
      ["resources", resources],
    ] as const
  ).filter(([, items]) => items?.some((item) => item.trim()));
  if (!groups.length) return null;
  return (
    <div className="request-needs">
      {groups.map(([key, items]) => (
        <div key={key}>
          <p className="need-label">{t(key)}</p>
          <ul>
            {items!
              .filter((item) => item.trim())
              .map((item, index) => (
                <li key={key + index}>{item}</li>
              ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

export default function PriorityCard({
  urgency_level,
  category,
  source,
  summary,
  requirements,
  tools,
  resources,
  rank,
}: {
  urgency_level: UrgencyLevel;
  category: RequestCategory;
  source: string;
  summary?: string;
  requirements?: string[];
  tools?: string[];
  resources?: string[];
  rank?: number;
}) {
  const { t } = useApp();
  const assessed = source !== "fallback";
  return (
    <div
      className={
        "priority-card " +
        (assessed ? "priority-" + urgency_level.toLowerCase() : "priority-unassessed")
      }
    >
      <div className="flex items-center justify-between gap-3">
        <strong className="priority-title">
          {rank ? (
            <span className="priority-rank">
              <span className="sr-only">{t("priorityRank")} </span>
              {rank}
            </span>
          ) : null}
          {t(category)}
        </strong>
        <span className="priority-pill">
          {t(assessed ? urgency_level : "notAssessed")}
        </span>
      </div>
      {summary && (
        <p className="mt-2 break-words">
          {summary === "mediaRequest" ? t("mediaRequest") : summary}
        </p>
      )}
      <RequestNeeds
        requirements={requirements}
        tools={tools}
        resources={resources}
      />
      <p className="mt-1 text-xs">
        {t(source === "fallback" ? "assessmentPending" : "priorityLabel")}
      </p>
    </div>
  );
}
