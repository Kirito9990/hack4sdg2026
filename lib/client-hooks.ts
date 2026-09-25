"use client";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/app/components/providers";
import type { RequestView } from "@/lib/types";
export function useLocation(enabled: boolean) {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
      null,
    ),
    [error, setError] = useState(""),
    [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    if (!navigator.geolocation) {
      queueMicrotask(() => {
        if (active) setError("locationError");
      });
      return () => {
        active = false;
      };
    }
    navigator.geolocation.getCurrentPosition(
      (p) => {
        if (active) {
          setCoords({ lat: p.coords.latitude, lng: p.coords.longitude });
          setError("");
        }
      },
      () => {
        if (active) setError("locationError");
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 20000 },
    );
    return () => {
      active = false;
    };
  }, [enabled, attempt]);
  return {
    coords,
    error,
    retry: () => {
      setError("");
      setAttempt((a) => a + 1);
    },
  };
}
export function useRequests(enabled: boolean) {
  const [requests, setRequests] = useState<RequestView[]>([]),
    [error, setError] = useState("");
  const refresh = useCallback(async () => {
    try {
      const b = await api<{ requests: RequestView[] }>("/api/request/status");
      setRequests(b.requests);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    const poll = async () => {
      try {
        const b = await api<{ requests: RequestView[] }>("/api/request/status");
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
  }, [enabled]);
  return { requests, error, refresh };
}
