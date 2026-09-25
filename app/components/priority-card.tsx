"use client";
import { useApp } from "./providers";
import type { UrgencyLevel, RequestCategory } from "@/lib/types";
export default function PriorityCard({
  urgency_level,
  category,
  source,
  summary,
}: {
  urgency_level: UrgencyLevel;
  category: RequestCategory;
  source: string;
  summary?: string;
}) {
  const { t } = useApp();
  return (
    <div className={"priority-card priority-" + urgency_level.toLowerCase()}>
      <div className="flex items-center justify-between gap-3">
        <strong>{t(category)}</strong>
        <span className="priority-pill">{t(urgency_level)}</span>
      </div>
      {summary && (
        <p className="mt-2 line-clamp-2 break-words">
          {summary === "mediaRequest" ? t("mediaRequest") : summary}
        </p>
      )}
      <p className="mt-1 text-xs">
        {t(source === "fallback" ? "assessmentPending" : "priorityLabel")}
      </p>
    </div>
  );
}
