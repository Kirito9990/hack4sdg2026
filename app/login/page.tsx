"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { post, useApp } from "@/app/components/providers";
import type { User, UserRole } from "@/lib/types";
export default function Login() {
  const { t, setUser } = useApp(),
    router = useRouter();
  const [name, setName] = useState(""),
    [phone, setPhone] = useState(""),
    [role, setRole] = useState<UserRole>("resident"),
    [calls, setCalls] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <main className="mobile-app login-workspace">
      <h1>{t("start")}</h1>
      <p className="hint">{t("intro")}</p>
      <form
        className="stage-scroll login-form space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          try {
            const b = await post<{ user: User }>("/api/auth", {
              name,
              phone,
              role,
              allowCalls: calls,
            });
            setUser(b.user);
            router.push("/" + role);
          } catch (e) {
            setError((e as Error).message);
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
            autoComplete="name"
          />
        </label>
        <label className="field">
          {t("phone")}
          <input
            required
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            autoComplete="tel"
            maxLength={24}
          />
          <span className="hint text-sm">{t("phoneHint")}</span>
        </label>
        <div className="grid grid-cols-2 gap-3">
          {(["resident", "volunteer"] as const).map((r) => (
            <button
              type="button"
              key={r}
              aria-pressed={role === r}
              onClick={() => setRole(r)}
              className={role === r ? "button" : "button secondary"}
            >
              {t(r)}
            </button>
          ))}
        </div>
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={calls}
            onChange={(e) => setCalls(e.target.checked)}
            className="mt-1 h-5 w-5"
          />
          <span>{t("allowCalls")}</span>
        </label>
        <details className="text-xs text-muted">
          <summary>{t("contactPrivacy")}</summary>
          <p>{t("callPrivacy")}</p>
        </details>
        {error && (
          <p role="alert" className="error">
            {t(error)}
          </p>
        )}
        <button disabled={busy} className="button w-full">
          {t(busy ? "saving" : "continue")}
        </button>
      </form>
      <p className="text-xs text-muted">{t("demo")}</p>
    </main>
  );
}
