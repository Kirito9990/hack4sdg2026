import { getRequest } from "@/lib/db";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("id")?.trim() ?? "";
  if (!id) {
    return NextResponse.json({ error: "Missing request id." }, { status: 400 });
  }
  const found = getRequest(id);
  if (!found) {
    return NextResponse.json({ error: "That request is not on this server." }, { status: 404 });
  }
  return NextResponse.json(found, { headers: { "Cache-Control": "no-store" } });
}
