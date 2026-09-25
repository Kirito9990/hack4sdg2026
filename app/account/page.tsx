"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, useApp } from "@/app/components/providers";
import type { User } from "@/lib/types";
function AccountForm({ user }: { user: User }) {
  const { t, setUser } = useApp(),
    router = useRouter();
  const [tab, setTab] = useState("profileTab"),
    [name, setName] = useState(user.name),
    [phone, setPhone] = useState(user.phone),
    [privacy, setPrivacy] = useState(user.privacy),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  return (
    <>
      <div className="segmented" role="tablist" aria-label={t("account")}>
        {["profileTab", "privacy", "manageTab"].map((k) => (
          <button
            role="tab"
            key={k}
            aria-selected={tab === k}
            onClick={() => setTab(k)}
          >
            {t(k)}
          </button>
        ))}
      </div>
      <form
        className="app-stage"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setMessage("");
          try {
            const b = await api<{ user: User }>("/api/account", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ name, phone, privacy }),
            });
            setUser(b.user);
            setMessage("saved");
          } catch (e) {
            setMessage((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="stage-scroll account-content">
          {tab === "profileTab" ? (
            <>
              <label className="field">
                {t("name")}
                <input
                  required
                  minLength={2}
                  maxLength={80}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </label>
              <label className="field">
                {t("phone")}
                <input
                  required
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
                <span className="text-sm text-muted">{t("phoneHint")}</span>
              </label>
              <p className="text-sm text-muted">{t("demo")}</p>
            </>
          ) : tab === "privacy" ? (
            <>
              {(["allowCalls", "allowChat", "allowAI"] as const).map((key) => (
                <div key={key} className="privacy-option">
                  <label className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      className="mt-1 h-5 w-5 shrink-0"
                      checked={privacy[key]}
                      onChange={(e) =>
                        setPrivacy({ ...privacy, [key]: e.target.checked })
                      }
                    />
                    <strong>{t(key)}</strong>
                  </label>
                  <details>
                    <summary>{t("detailsTab")}</summary>
                    <p>
                      {t(
                        key === "allowCalls"
                          ? "callPrivacy"
                          : key === "allowAI"
                            ? "aiPrivacy"
                            : "privacyInfo",
                      )}
                    </p>
                  </details>
                </div>
              ))}
            </>
          ) : (
            <>
              <p className="text-sm text-muted">{t("demo")}</p>
              <button
                type="button"
                className="button secondary w-full"
                disabled={busy}
                onClick={async () => {
                  try {
                    await api("/api/auth", { method: "DELETE" });
                    setUser(null);
                    router.push("/login");
                  } catch {
                    setMessage("networkError");
                  }
                }}
              >
                {t("signout")}
              </button>
              <button
                type="button"
                className="button bg-danger w-full"
                disabled={busy}
                onClick={async () => {
                  if (!confirm(t("deleteConfirm"))) return;
                  setBusy(true);
                  try {
                    await api("/api/account", { method: "DELETE" });
                    setUser(null);
                    router.push("/login");
                  } catch (e) {
                    setMessage((e as Error).message);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                {t("deleteAccount")}
              </button>
            </>
          )}
        </div>
        {message && (
          <p role="status" className="location-chip">
            {t(message)}
          </p>
        )}
        {tab !== "manageTab" && (
          <button className="button w-full" disabled={busy}>
            {t(busy ? "saving" : "save")}
          </button>
        )}
      </form>
      <Link className="button secondary" href={"/" + user.role}>
        {t("back")}
      </Link>
    </>
  );
}
export default function Account() {
  const { t, user, ready } = useApp();
  return (
    <main className="mobile-app account-workspace">
      <div className="workspace-heading">
        <h1>{t("account")}</h1>
      </div>
      {!ready ? (
        <p>{t("loading")}</p>
      ) : user ? (
        <AccountForm key={user.id} user={user} />
      ) : (
        <Link className="button" href="/login">
          {t("start")}
        </Link>
      )}
    </main>
  );
}
