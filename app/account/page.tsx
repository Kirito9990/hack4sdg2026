"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, useApp } from "@/app/components/providers";
import type { User } from "@/lib/types";
function AccountForm({ user }: { user: User }) {
  const { t, setUser } = useApp(),
    router = useRouter();
  const [name, setName] = useState(user.name),
    [phone, setPhone] = useState(user.phone),
    [privacy, setPrivacy] = useState(user.privacy),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  async function remove() {
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
  }
  return (
    <>
      <form
        className="mt-6 space-y-5"
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
          <span className="hint text-sm">{t("phoneHint")}</span>
        </label>
        <h2>{t("privacy")}</h2>
        {(["allowCalls", "allowChat", "allowAI"] as const).map((key) => (
          <label className="flex items-start gap-3" key={key}>
            <input
              className="mt-1 h-5 w-5 shrink-0"
              type="checkbox"
              checked={privacy[key]}
              onChange={(e) =>
                setPrivacy({ ...privacy, [key]: e.target.checked })
              }
            />
            <span>{t(key)}</span>
          </label>
        ))}
        <p className="hint text-sm">{t("callPrivacy")}</p>
        <p className="hint text-sm">{t("aiPrivacy")}</p>
        <p className="hint text-sm">{t("privacyInfo")}</p>
        <button className="button" disabled={busy}>
          {t(busy ? "saving" : "save")}
        </button>
        {message && <p role="status">{t(message)}</p>}
      </form>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link className="button secondary" href={"/" + user.role}>
          {t("home")}
        </Link>
        <button
          className="button secondary"
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
          className="button bg-danger"
          disabled={busy}
          onClick={() => void remove()}
        >
          {t("deleteAccount")}
        </button>
      </div>
    </>
  );
}
export default function Account() {
  const { t, user, ready } = useApp();
  return (
    <main className="page max-w-2xl">
      <h1>{t("account")}</h1>
      {!ready ? (
        <p>{t("loading")}</p>
      ) : user ? (
        <AccountForm key={user.id} user={user} />
      ) : (
        <Link href="/login" className="button mt-6">
          {t("start")}
        </Link>
      )}
      <p className="hint mt-8 text-sm">{t("demo")}</p>
    </main>
  );
}
