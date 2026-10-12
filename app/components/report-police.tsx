"use client";
import { useApp } from "./providers";

export default function ReportPolice() {
  const { t } = useApp();
  const number = process.env.NEXT_PUBLIC_EMERGENCY_NUMBER || "999";
  return (
    <div className="report-police">
      <a className="button secondary w-full" href={"tel:" + number}>
        {t("reportPolice")}
      </a>
      <p className="text-sm text-muted">{t("reportPoliceHint")}</p>
    </div>
  );
}
