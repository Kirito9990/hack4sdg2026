"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Locale, User } from "@/lib/types";
import { translate } from "@/lib/i18n";
const Context = createContext<{
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string) => string;
  user: User | null;
  ready: boolean;
  setUser: (u: User | null) => void;
  refresh: () => Promise<void>;
}>({
  locale: "en",
  setLocale: () => {},
  t: (key) => translate("en", key),
  user: null,
  ready: false,
  setUser: () => {},
  refresh: async () => {},
});
export function Providers({ children }: { children: React.ReactNode }) {
  const [locale, setLanguage] = useState<Locale>("en"),
    [user, setUser] = useState<User | null>(null),
    [ready, setReady] = useState(false);
  const setLocale = useCallback((l: Locale) => {
    setLanguage(l);
    document.documentElement.lang = l;
    try {
      localStorage.setItem("carecall_language", l);
    } catch {}
  }, []);
  const refresh = useCallback(async () => {
    try {
      const r = await fetch("/api/auth", { cache: "no-store" });
      const b = await r.json();
      setUser(b.user ?? null);
    } catch {
    } finally {
      setReady(true);
    }
  }, []);
  useEffect(() => {
    try {
      const l = localStorage.getItem("carecall_language");
      if (l === "en" || l === "zh-Hant" || l === "zh-Hans")
        queueMicrotask(() => setLocale(l));
    } catch {
      /* The language selector still works when storage is blocked. */
    }
    queueMicrotask(() => void refresh());
    const focus = () => void refresh();
    window.addEventListener("focus", focus);
    return () => window.removeEventListener("focus", focus);
  }, [refresh, setLocale]);
  useEffect(()=>{
    if(!user?.id||!navigator.permissions)return;
    let live=true,permission:PermissionStatus|undefined;
    // Browser permission is separate from the account's saved preference.
    // A query result must not undo a successful GPS request or user opt-in.
    const changed=()=>{if(permission?.state==='denied'){try{sessionStorage.removeItem('carecall_position_'+user.id);}catch{}}};
    void navigator.permissions.query({name:'geolocation'}).then(p=>{if(!live)return;permission=p;p.addEventListener('change',changed);if(p.state==='denied'&&user.privacy.allowLocation)changed();}).catch(()=>{});
    return()=>{live=false;permission?.removeEventListener('change',changed);};
  },[user?.id,user?.privacy.allowLocation]);
  const t = useCallback((key: string) => translate(locale, key), [locale]);
  const value = useMemo(
    () => ({
      locale,
      setLocale,
      t,
      user,
      ready,
      setUser,
      refresh,
    }),
    [locale, setLocale, t, user, ready, refresh],
  );
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useApp() {
  return useContext(Context);
}
export async function api<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, { cache: "no-store", ...options });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.error || "networkError");
  return body as T;
}
export function post<T>(url: string, body: unknown) {
  return api<T>(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
