"use client";
import { useApp } from "./components/providers";
export default function ErrorPage({ reset }: { reset: () => void }) {
  const { t } = useApp();
  return (
    <main className="page max-w-xl">
      <h1>{t("unexpectedError")}</h1>
      <button className="button mt-6" onClick={reset}>
        {t("retry")}
      </button>
    </main>
  );
}
