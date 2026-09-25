export const dynamic = "force-dynamic";
export function GET() {
  return Response.json({ status: "ok", service: "CareCall" }, { headers: { "Cache-Control": "no-store" } });
}
