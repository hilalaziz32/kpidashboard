import { NextRequest, NextResponse } from "next/server";
import { syncRecordIds } from "@/lib/sync";

// POST /api/sync-deal — single-deal sync, called by n8n when one record changes.
// Auth: `Authorization: Bearer <SYNC_SECRET>` or `?secret=<SYNC_SECRET>`.
// Body: { "recordId": "rec..." } or { "recordIds": ["rec...", ...] }

function authorized(req: NextRequest) {
  const secret = process.env.SYNC_SECRET;
  if (!secret) return false;
  const header = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const qs = req.nextUrl.searchParams.get("secret");
  return header === secret || qs === secret;
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: { recordId?: string; recordIds?: string[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const ids = body.recordIds ?? (body.recordId ? [body.recordId] : []);
  if (!ids.length) {
    return NextResponse.json({ error: "provide recordId or recordIds" }, { status: 400 });
  }

  const results = await syncRecordIds(ids);
  const anyError = results.some((r) => r.status === "error");
  return NextResponse.json({ results }, { status: anyError ? 207 : 200 });
}
