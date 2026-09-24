import { haversineMeters, listRequests } from "@/lib/db";
import type { UrgencyLevel } from "@/lib/types";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_DISTANCE_METERS = 5_000;
const URGENCY_RANK: Record<UrgencyLevel, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const lat = Number(params.get("lat"));
  const lng = Number(params.get("lng"));
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return NextResponse.json({ error: "Volunteer latitude and longitude are required." }, { status: 400 });
  }

  const tasks = listRequests()
    .filter((item) => item.status === "PENDING")
    .map((item) => ({
      id: item.id,
      residentName: item.residentName,
      lat: item.lat,
      lng: item.lng,
      urgency_level: item.urgency_level,
      category: item.category,
      summary: item.summary,
      dispatch_action: item.dispatch_action,
      status: item.status,
      createdAt: item.createdAt,
      mediaNote: item.mediaNote,
      distanceMeters: haversineMeters(lat, lng, item.lat, item.lng),
    }))
    .filter((item) => item.distanceMeters <= MAX_DISTANCE_METERS)
    .sort((a, b) => {
      const byUrgency = URGENCY_RANK[a.urgency_level] - URGENCY_RANK[b.urgency_level];
      if (byUrgency !== 0) return byUrgency;
      const byDistance = a.distanceMeters - b.distanceMeters;
      if (byDistance !== 0) return byDistance;
      return a.createdAt.localeCompare(b.createdAt);
    })
    .map((item) => ({
      ...item,
      distanceMeters: Math.round(item.distanceMeters),
    }));

  return NextResponse.json({ tasks }, { headers: { "Cache-Control": "no-store" } });
}
