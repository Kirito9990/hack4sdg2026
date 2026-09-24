"use client";

import { useSyncExternalStore } from "react";

export type UserRole = "resident" | "volunteer";

export type UserProfile = {
  id?: string;
  name: string;
  phone: string;
  role: UserRole;
};

export const PROFILE_KEY = "user_profile";

export function readProfile(): UserProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(PROFILE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<UserProfile>;
    if (parsed.role !== "resident" && parsed.role !== "volunteer") return null;
    if (typeof parsed.name !== "string" || !parsed.name.trim()) return null;
    if (typeof parsed.phone !== "string" || !parsed.phone.trim()) return null;
    return {
      id: typeof parsed.id === "string" ? parsed.id : undefined,
      name: parsed.name.trim(),
      phone: parsed.phone.trim(),
      role: parsed.role,
    };
  } catch {
    return null;
  }
}

let cachedRaw: string | null | undefined;
let cachedProfile: UserProfile | null = null;

function snapshotFromRaw(raw: string | null): UserProfile | null {
  if (raw === cachedRaw) return cachedProfile;
  cachedRaw = raw;
  if (!raw) {
    cachedProfile = null;
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as Partial<UserProfile>;
    if (parsed.role !== "resident" && parsed.role !== "volunteer") {
      cachedProfile = null;
      return null;
    }
    if (typeof parsed.name !== "string" || !parsed.name.trim()) {
      cachedProfile = null;
      return null;
    }
    if (typeof parsed.phone !== "string" || !parsed.phone.trim()) {
      cachedProfile = null;
      return null;
    }
    cachedProfile = {
      id: typeof parsed.id === "string" ? parsed.id : undefined,
      name: parsed.name.trim(),
      phone: parsed.phone.trim(),
      role: parsed.role,
    };
    return cachedProfile;
  } catch {
    cachedProfile = null;
    return null;
  }
}

export function writeProfile(profile: UserProfile) {
  const raw = JSON.stringify(profile);
  window.localStorage.setItem(PROFILE_KEY, raw);
  cachedRaw = raw;
  cachedProfile = profile;
}

function subscribeProfile(onChange: () => void) {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

function subscribeClient(onChange: () => void) {
  return () => {
    void onChange;
  };
}

export function useClientReady() {
  return useSyncExternalStore(subscribeClient, () => true, () => false);
}

export function useRoleProfile(role: UserRole): { ready: boolean; profile: UserProfile | null } {
  const ready = useSyncExternalStore(subscribeClient, () => true, () => false);
  const saved = useSyncExternalStore(subscribeProfile, () => snapshotFromRaw(window.localStorage.getItem(PROFILE_KEY)), () => null);
  return { ready, profile: ready && saved?.role === role ? saved : null };
}
