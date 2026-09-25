"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/app/components/providers";
import type { UserRole } from "@/lib/types";
export function useRoleProfile(role: UserRole) {
  const app = useApp(),
    router = useRouter();
  useEffect(() => {
    if (app.ready && !app.user) router.replace("/login");
    else if (app.user && app.user.role !== role)
      router.replace("/" + app.user.role);
  }, [app.ready, app.user, role, router]);
  return {
    ready: app.ready,
    profile: app.user?.role === role ? app.user : null,
  };
}
