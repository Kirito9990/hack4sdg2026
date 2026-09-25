"use client";
import Link from "next/link";
import { useApp } from "./components/providers";
export default function NotFound() {
  const { t, user } = useApp();
  return (
    <main className="page max-w-xl">
      <h1>{t("pageMissing")}</h1>
      <Link href={user ? "/" + user.role : "/login"} className="button mt-6">
        {t(user ? "home" : "start")}
      </Link>
    </main>
  );
}
