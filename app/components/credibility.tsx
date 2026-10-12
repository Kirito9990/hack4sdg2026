"use client";
import { useState } from "react";
import { post, useApp } from "./providers";
import type { RequestView } from "@/lib/types";

export function CredibilityFlag({
  credibility,
  compact = false,
}: {
  credibility?: { average: number; count: number; flagged: boolean };
  compact?: boolean;
}) {
  const { t } = useApp();
  if (!credibility?.flagged) return null;
  return (
    <p className="credibility-flag" role="status">
      <strong>{t("lowCredibility")}</strong>
      {compact ? null : (
        <span>
          {credibility.average}/5 · {credibility.count}
        </span>
      )}
    </p>
  );
}

export function CredibilitySummary({
  credibility,
}: {
  credibility?: { average: number; count: number; flagged: boolean };
}) {
  const { t } = useApp();
  if (!credibility?.count) return null;
  return (
    <div className="credibility-summary">
      <CredibilityFlag credibility={credibility} />
      <p>
        {t("credibilityLabel")} {credibility.average}/5 · {credibility.count}
      </p>
      {credibility.flagged ? (
        <p className="text-sm text-muted">{t("lowCredibilityDetail")}</p>
      ) : null}
    </div>
  );
}

export function RatePartner({ request }: { request: RequestView }) {
  const { t, user } = useApp();
  const [choice, setChoice] = useState(request.myRating || 0),
    [sent, setSent] = useState(request.myRating || 0),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  if (request.closedReason !== "completed" || !request.volunteerId) return null;
  if (sent)
    return (
      <p className="credibility-summary" role="status">
        {t("youRated")} {sent}/5
      </p>
    );
  return (
    <form
      className="credibility-rate"
      onSubmit={async (event) => {
        event.preventDefault();
        if (!choice) return;
        setBusy(true);
        setError("");
        try {
          await post("/api/request/rating", { id: request.id, score: choice });
          setSent(choice);
        } catch (e) {
          setError((e as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <p>{t(user?.role === "resident" ? "rateVolunteer" : "rateResident")}</p>
      <div className="rating-choices" role="radiogroup" aria-label={t("credibilityLabel")}>
        {[1, 2, 3, 4, 5].map((score) => (
          <button
            key={score}
            type="button"
            role="radio"
            aria-checked={choice === score}
            onClick={() => setChoice(score)}
          >
            {score}
          </button>
        ))}
      </div>
      <button className="button w-full" disabled={busy || !choice}>
        {t(busy ? "saving" : "sendRating")}
      </button>
      {error ? (
        <p className="error text-sm" role="alert">
          {t(error)}
        </p>
      ) : null}
    </form>
  );
}
