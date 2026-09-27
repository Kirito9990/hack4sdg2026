"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, useApp } from "@/app/components/providers";
import {requestLocation,rememberPoint} from "@/lib/location-client";
import PrivacyNotice from "./privacy-notice";
import type { User } from "@/lib/types";
function AccountForm({ user, tab }: { user: User; tab: string }) {
  const { t, setUser } = useApp(),
    router = useRouter();
  const [name, setName] = useState(user.name),
    [phone, setPhone] = useState(user.phone),
    [address,setAddress]=useState(user.address||""),
    [privacy, setPrivacy] = useState(user.privacy),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  return (
    <>
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
              body: JSON.stringify({ name, phone, privacy, address }),
            });
            setUser(b.user);
            if(!b.user.privacy.allowLocation)try{sessionStorage.removeItem("carecall_position_"+user.id);}catch{}
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
                
              </label>
              {user.role==='resident'&&<label className="field">{t('defaultAddress')}<textarea rows={3} maxLength={450} placeholder={t('addressExample')} value={address} onChange={e=>setAddress(e.target.value)}/><span className="text-sm text-muted">{t('addressPrivacy')}</span></label>}
            </>
          ) : tab === "privacy" ? (
            <>
              {(["allowCalls", "allowChat", "showName", "shareAddress", "allowLocation", "allowAI"] as const).map((key) => (
                <div key={key} className="privacy-option">
                  <label className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      className="mt-1 h-5 w-5 shrink-0"
                      disabled={busy}
                      checked={!!privacy[key]}
                      onChange={async e=>{
                        const checked=e.target.checked;
                        if(key==='allowLocation'&&checked){setBusy(true);const result=await requestLocation();setBusy(false);if(!result.point){setMessage(result.error);return;}rememberPoint(user.id,result.point);}
                        
                        setPrivacy(p=>({...p,[key]:checked}));
                      }}
                    />
                    <strong>{t(key)}</strong>
                  </label>
                  <details>
                    <summary>{t("detailsTab")}</summary>
                    <p>
                      {t(
                        key === "showName" ? "namePrivacy" : key === "shareAddress" ? "addressPrivacy" : key === "allowLocation" ? "locationPreferenceInfo" : key === "allowCalls"
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
              <PrivacyNotice/>
              <button type="button" className="button secondary w-full" disabled={busy} onClick={async()=>{if(!confirm(t("deleteHistoryConfirm")))return;setBusy(true);try{await api("/api/account/archive",{method:"DELETE"});setMessage("historyDeleted");}catch(e){setMessage((e as Error).message);}finally{setBusy(false);}}}>{t("deleteHistory")}</button>
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
export default function AccountScreen({
  section = "profileTab",
}: {
  section?: string;
}) {
  const { t, user, ready } = useApp();
  return (
    <main className="mobile-app account-workspace">
      <div className="workspace-heading">
        <h1>{t(section)}</h1>
      </div>
      {!ready ? (
        <p>{t("loading")}</p>
      ) : user ? (
        <AccountForm key={user.id + section} user={user} tab={section} />
      ) : (
        <Link className="button" href="/login">
          {t("start")}
        </Link>
      )}
    </main>
  );
}
