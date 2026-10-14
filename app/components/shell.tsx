"use client";
import Image from "next/image";
import Link from "next/link";
import AccountMenu from "./account-menu";
import { useApp } from "./providers";
import type { Locale } from "@/lib/types";
export function PhoneIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      className="h-7 w-7 shrink-0"
    >
      <path d="M5 3h4l2 5-3 2a16 16 0 0 0 6 6l2-3 5 2v4c0 2-2 3-4 2C9 20 4 15 3 7c-1-2 0-4 2-4Z" />
    </svg>
  );
}
export default function Shell({ children }: { children: React.ReactNode }) {
  const { t, locale, setLocale, user } = useApp(),
    emergency = process.env.NEXT_PUBLIC_EMERGENCY_NUMBER || "999";
  return (
    <>
      <header className="compact-header border-b border-line bg-surface">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <Link
            href={user ? "/" + user.role : "/login"}
            className="brand-mark text-2xl font-bold tracking-tight"
          >
            <Image src="/carecall-mark.png" alt="" width={40} height={40} priority />
            CareCall
          </Link>
          <nav className="flex flex-wrap items-center gap-3">
            <label className="sr-only" htmlFor="language">
              {t("language")}
            </label>
            <select
              id="language"
              value={locale}
              onChange={(e) => setLocale(e.target.value as Locale)}
              className="rounded-xl border border-line bg-white px-3 py-3 text-sm"
            >
              <option value="zh-Hant">繁體中文</option>
              <option value="zh-Hans">简体中文</option>
              <option value="en">English</option>
            </select>
            <AccountMenu />
          </nav>
        </div>
      </header>
      <div className="flex-1">{children}</div>
      <footer className="compact-footer border-t border-line bg-surface">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-5">
          <p className="text-sm text-muted">{t("emergency")}</p>
          <a href={"tel:" + emergency} className="call-button bg-danger">
            <PhoneIcon />
            {t("emergencyCall")} {emergency}
          </a>
        </div>
      </footer>
    </>
  );
}
