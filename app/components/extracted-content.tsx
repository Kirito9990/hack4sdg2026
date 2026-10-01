"use client";
import { useApp } from "./providers";
import type { RequestView } from "@/lib/types";

export default function ExtractedContent({ request: r }: { request: RequestView }) {
  const { t } = useApp();
  const hasContent = !!r.speechTranscript;
  const audioUnavailable = r.audioStatus === "unavailable";
  if (!hasContent && !audioUnavailable) return null;
  return <section className="space-y-2 text-sm" aria-label={t("extractedContent")}>
    {audioUnavailable && <p className="text-muted">{t("audioUnavailable")}</p>}
    {hasContent && <details>
      <summary className="cursor-pointer font-semibold">{t("extractedContent")}</summary>
      <p className="my-2 text-muted">{t("extractionReviewHint")}</p>
      <p className="whitespace-pre-wrap break-words">{r.speechTranscript}</p>
    </details>}
  </section>;
}
