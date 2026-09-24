import { acceptRequest } from "@/lib/db";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Send the request id as JSON." }, { status: 400 });
  }

  const id =
    body && typeof body === "object" && typeof (body as { id?: unknown }).id === "string"
      ? (body as { id: string }).id.trim()
      : "";
  if (!id) {
    return NextResponse.json({ error: "Missing request id." }, { status: 400 });
  }

  const updated = acceptRequest(id);
  if (!updated) {
    return NextResponse.json({ error: "That request is not on this server." }, { status: 404 });
  }
  return NextResponse.json(updated);
}
