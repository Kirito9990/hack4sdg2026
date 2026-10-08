"use client";
import Link from "next/link";
import { useApp } from "@/app/components/providers";
import { useRoleProfile } from "@/lib/profile";
import Impact from "@/app/components/impact";
export default function ImpactPage() {
  const { t } = useApp(), { ready, profile } = useRoleProfile("volunteer");
  return <main className="impact-page"><div className="impact-page-heading"><Link href="/volunteer" className="impact-back">‹ {t("back")}</Link><h1>{t("myImpact")}</h1></div>{ready && profile ? <Impact key={profile.id} /> : <p>{t("loading")}</p>}</main>;
}
