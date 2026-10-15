"use client";
import {cachedPoint,rememberPoint} from "./location-client";
import type {User} from "./types";
import { useCallback, useEffect, useRef, useState } from "react";
import { api, useApp } from "@/app/components/providers";
import type { RequestView } from "@/lib/types";
export function useLocation(enabled: boolean) {
  type Point = { lat: number; lng: number };
  const {user,setUser}=useApp();
  const userId=user?.id;
  const [coords, setCoords] = useState<Point | null>(null),
    [error, setError] = useState(""),
    [locating, setLocating] = useState(false);
  const attempt = useRef(0),
    pending = useRef<((point: Point | null) => void) | null>(null);
  useEffect(
    () => () => {
      attempt.current++;
      pending.current?.(null);
    },
    [],
  );
  const locate = useCallback(async () => {
    if (!enabled) return null;
    pending.current?.(null);
    const token = ++attempt.current;
    setError("");
    setLocating(true);
    const result = await new Promise<Point | null>((resolve) => {
      let settled = false;
      const finish = (point: Point | null) => {
        if (settled) return;
        settled = true;
        clearTimeout(deadline);
        if (pending.current === finish) pending.current = null;
        resolve(point);
      };
      const deadline = setTimeout(() => {
        if (token === attempt.current) setError("locationUnavailable");
        finish(null);
      }, 15000);
      pending.current = finish;
      if (!navigator.geolocation || !window.isSecureContext) {
        setError("locationUnsupported");
        finish(null);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (p) => {
          if (!settled && token === attempt.current)
            finish({ lat: p.coords.latitude, lng: p.coords.longitude });
        },
        (e) => {
          if (!settled && token === attempt.current) {
            setError(e.code === 1 ? "locationDenied" : "locationUnavailable");
            finish(null);
          }
        },
        { enableHighAccuracy: false, timeout: 12000, maximumAge: 30000 },
      );
    });
    if (token !== attempt.current) return result;
    if (result) {
      setCoords(result);
      if(userId){rememberPoint(userId,result);try{const b=await api<{user:User}>("/api/account/location",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({allowed:true})});setUser(b.user);}catch{}}
    }
    setLocating(false);
    return result;
  }, [enabled,userId,setUser]);
  useEffect(()=>{
    if(!enabled||!userId)return;
    // Account opt-out and a previous browser denial are not a current browser
    // permission result. Only a fresh geolocation failure shows "blocked".
    if(!user?.privacy.allowLocation)return;
    let live=true;
    const cached=cachedPoint(userId);if(cached)queueMicrotask(()=>{if(live)setCoords(cached);});
    else if(navigator.permissions)void navigator.permissions.query({name:"geolocation"}).then(p=>{if(live&&p.state==="granted")void locate();}).catch(()=>{});
    return()=>{live=false;};
  },[enabled,userId,user?.privacy.allowLocation,locate]);
  const pick = useCallback((point: Point) => {
    attempt.current++;
    setCoords(point);
    setError("");
    setLocating(false);
    pending.current?.(point);
  }, []);
  return { coords, error, locating, locate, retry: () => void locate(), pick };
}
export function useRequests(enabled: boolean) {
  const { locale } = useApp();
  const [requests, setRequests] = useState<RequestView[]>([]),
    [error, setError] = useState("");
  const refresh = useCallback(async () => {
    try {
      const b = await api<{ requests: RequestView[] }>(
        "/api/request/status?locale=" + encodeURIComponent(locale),
      );
      setRequests(b.requests);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }, [locale]);
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    const poll = async () => {
      try {
        const b = await api<{ requests: RequestView[] }>(
          "/api/request/status?locale=" + encodeURIComponent(locale),
        );
        if (active) {
          setRequests(b.requests);
          setError("");
        }
      } catch (e) {
        if (active) setError((e as Error).message);
      }
    };
    void poll();
    const id = setInterval(() => void poll(), 2000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [enabled, locale]);
  return {
    requests,
    error,
    refresh,
    add: (request: RequestView) =>
      setRequests((items) => [
        request,
        ...items.filter((r) => r.id !== request.id),
      ]),
  };
}
