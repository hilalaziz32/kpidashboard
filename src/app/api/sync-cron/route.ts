import { NextRequest, NextResponse } from "next/server";
import { syncCurrentMonth } from "@/lib/sync";

// GET /api/sync-cron — bulk sync of the CURRENT MONTH's deals for ALL clients.
// Runs on a schedule (every 3h). Older months are handled one-off by n8n via
// /api/sync-deal, so this deliberately only touches the current month.
//
// Auth: Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`. We also accept
// our own `SYNC_SECRET` (header or ?secret=) so any scheduler / manual run works.
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorized(req: NextRequest) {
  const sync = process.env.SYNC_SECRET;
  const cron = process.env.CRON_SECRET;
  const header = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const qs = req.nextUrl.searchParams.get("secret");
  return Boolean(
    (sync && (header === sync || qs === sync)) ||
      (cron && header === cron)
  );
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const summary = await syncCurrentMonth(); // no clientId = all clients
    return NextResponse.json({ ok: true, ...summary });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
