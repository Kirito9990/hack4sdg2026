"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { post, useApp } from "@/app/components/providers";
import PrivacyNotice from "@/app/components/privacy-notice";
import type { User, UserRole } from "@/lib/types";

function PasswordEye({ hidden }: { hidden: boolean }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
      {hidden ? (
        <>
          <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
          <circle cx="12" cy="12" r="2.5" />
        </>
      ) : (
        <>
          <path d="M3 3l18 18" />
          <path d="M10.5 6.2A10 10 0 0 1 12 6c6.5 0 10 6 10 6a18 18 0 0 1-3.2 3.8" />
          <path d="M6.1 6.8C3.5 8.6 2 12 2 12s3.5 6 10 6c1.6 0 3-.3 4.2-.9" />
          <path d="M9.9 9.9a2.5 2.5 0 0 0 3.2 3.2" />
        </>
      )}
    </svg>
  );
}

export default function Login() {
  const { t, setUser } = useApp(),
    router = useRouter();
  const [mode, setMode] = useState<"login" | "create">("login"),
    [name, setName] = useState(""),
    [phone, setPhone] = useState(""),
    [password, setPassword] = useState(""),
    [passwordVisible, setPasswordVisible] = useState(false),
    [role, setRole] = useState<UserRole>("resident"),
    [agreed, setAgreed] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  function switchMode(next: "login" | "create") {
    setMode(next);
    setError("");
    setPasswordVisible(false);
  }
  return (
    <main className="mobile-app login-workspace">
      <div className="login-heading">
        <h1>{t(mode === "create" ? "createAccount" : "logIn")}</h1>
        <p>{t(mode === "create" ? "intro" : "loginIntro")}</p>
      </div>
      <form
        className="login-form stage-scroll"
        onSubmit={async (e) => {
          e.preventDefault();
          if (busy) return;
          if (mode === "create" && !agreed) {
            setError("privacyRequired");
            return;
          }
          setBusy(true);
          setError("");
          try {
            if (mode === "create") {
              const b = await post<{ user: User }>("/api/auth", {
                mode: "create",
                name,
                phone,
                role,
                password,
                privacyAccepted: true,
                allowLocation: false,
              });
              setUser(b.user);
              router.push("/" + b.user.role);
            } else {
              const b = await post<{ user: User }>("/api/auth", {
                mode: "login",
                phone,
                role,
                password,
              });
              setUser(b.user);
              router.push("/" + b.user.role);
            }
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        {mode === "create" && (
          <label className="field">
            {t("name")}
            <input
              required
              autoComplete="name"
              minLength={2}
              maxLength={80}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
        )}
        <label className="field">
          {t("phone")}
          <input
            required
            type="tel"
            autoComplete="tel"
            placeholder="0000 0000"
            maxLength={24}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </label>
        <div className="field">
          <label htmlFor="account-password">{t("password")}</label>
          <div className="password-field">
            <input
              id="account-password"
              required
              type={passwordVisible ? "text" : "password"}
              autoComplete={mode === "create" ? "new-password" : "current-password"}
              minLength={8}
              maxLength={72}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              className="password-toggle"
              aria-pressed={passwordVisible}
              aria-label={t(passwordVisible ? "hidePassword" : "showPassword")}
              onClick={() => setPasswordVisible((visible) => !visible)}
            >
              <PasswordEye hidden={!passwordVisible} />
            </button>
          </div>
        </div>
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
        {mode === "create" && (
          <>
            <div className="consent-row">
              <input
                id="privacy-consent"
                type="checkbox"
                required
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
              />
              <div>
                <label htmlFor="privacy-consent">{t("agreePrivacy")} </label>
                <PrivacyNotice />
              </div>
            </div>
            <p className="signup-note">{t("signupLocation")}</p>
          </>
        )}
        {error && (
          <p className="error" role="alert">
            {t(error)}
          </p>
        )}
        <button className="button w-full" disabled={busy}>
          {t(busy ? "saving" : mode === "create" ? "createAccount" : "logIn")}
        </button>
        <button
          type="button"
          className="button secondary w-full"
          disabled={busy}
          onClick={() => switchMode(mode === "login" ? "create" : "login")}
        >
          {t(mode === "login" ? "needAccount" : "haveAccount")}
        </button>
      </form>
    </main>
  );
}
