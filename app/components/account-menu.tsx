"use client";
import { useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useApp } from "./providers";
export default function AccountMenu() {
  const { t, user } = useApp(),
    dialog = useRef<HTMLDialogElement>(null),
    path = usePathname();
  return (
    <>
      <button
        type="button"
        className="account-link inline-flex min-h-12 items-center gap-2 rounded-xl bg-foreground px-4 font-semibold text-white"
        aria-haspopup="dialog"
        title={t("account")}
        onClick={() => dialog.current?.showModal()}
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21v-2a8 8 0 0 1 16 0v2" />
        </svg>
        <span className="sr-only">{t("account")}</span>
      </button>
      <dialog
        ref={dialog}
        className="account-drawer"
        aria-label={t("account")}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            const rect = e.currentTarget.getBoundingClientRect();
            if (e.clientX < rect.left || e.clientX > rect.right)
              dialog.current?.close();
          }
        }}
      >
        <div className="drawer-heading">
          <h2>{t("account")}</h2>
          <button
            type="button"
            className="drawer-close"
            aria-label={t("closeMenu")}
            onClick={() => dialog.current?.close()}
          >
            ×
          </button>
        </div>
        {user && <p className="drawer-user">{user.name}</p>}
        <nav className="drawer-nav" aria-label={t("account")}>
          {(user
            ? [
                ["profile", "profileTab"],
                ...(user.role === "volunteer" ? [["impact", "myImpact"]] : []),
                ["privacy", "privacy"],
                ["manage", "manageTab"],
              ]
            : [["", "start"]]
          ).map(([section, label]) => (
            <Link
              key={label}
              href={user ? "/account/" + section : "/login"}
              aria-current={path === "/account/" + section ? "page" : undefined}
              onClick={() => dialog.current?.close()}
            >
              <span>{t(label)}</span>
              <span aria-hidden>›</span>
            </Link>
          ))}
        </nav>
      </dialog>
    </>
  );
}
