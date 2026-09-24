import { createSession, createUser } from "@/lib/db";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Send your name, phone, and role as JSON." }, { status: 400 });
  }

  const record = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const name = typeof record.name === "string" ? record.name.trim() : "";
  const phone = typeof record.phone === "string" ? record.phone.trim() : "";
  const role = record.role === "resident" || record.role === "volunteer" ? record.role : null;

  if (name.length < 2 || name.length > 80) {
    return NextResponse.json({ error: "Enter the name people should call you." }, { status: 400 });
  }
  if (!/^[0-9+().\-\s]{6,20}$/.test(phone)) {
    return NextResponse.json({ error: "Enter a phone number volunteers can call." }, { status: 400 });
  }
  if (!role) {
    return NextResponse.json({ error: "Choose resident or volunteer." }, { status: 400 });
  }

  const user = createUser({ name, phone, role });
  const session = createSession(user.id);
  return NextResponse.json({ user, session });
}
