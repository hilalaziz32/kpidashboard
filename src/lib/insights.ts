import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Shared plumbing for the read-only /api/insights/* endpoints. These are meant
// to be called by an agent (Claude Code) to analyse the dashboard, so they are
// GET-only, never mutate, and return plain JSON.

// Auth is a single static bearer token — no login flow, no per-user session.
// It is NOT optional: these endpoints expose every client's contacts and
// revenue, so an unauthenticated URL would be a public data leak the moment it
// is guessed or logged. One header keeps that shut without adding friction.
export function authorize(req: NextRequest): NextResponse | null {
  const expected = process.env.INSIGHTS_TOKEN || process.env.SYNC_SECRET;
  if (!expected) {
    return NextResponse.json(
      { error: "INSIGHTS_TOKEN not configured on the server" },
      { status: 500 }
    );
  }
  const header = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const qs = req.nextUrl.searchParams.get("token");
  if (header !== expected && qs !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return null;
}

export const db = createAdminClient;

export function jsonError(e: unknown, status = 500) {
  return NextResponse.json({ error: (e as Error).message }, { status });
}

// ---- shared query params -------------------------------------------------

export type Filters = {
  clientIds: string[] | null; // null = all clients
  from: string | null;
  to: string | null;
  dateField: "date_of_meeting" | "created_date" | "call_scheduled_for";
};

// Resolve ?client= (slug, name or uuid, comma-separated) to client ids.
export async function resolveFilters(req: NextRequest): Promise<Filters> {
  const sp = req.nextUrl.searchParams;
  const raw = sp.get("client");
  const dateFieldParam = sp.get("dateField");
  const dateField =
    dateFieldParam === "created_date" || dateFieldParam === "call_scheduled_for"
      ? dateFieldParam
      : "date_of_meeting";

  let clientIds: string[] | null = null;
  if (raw) {
    const wanted = raw.split(",").map((s) => s.trim()).filter(Boolean);
    const { data } = await db().from("clients").select("id, name, slug");
    const all = data ?? [];
    clientIds = wanted
      .map((w) => {
        const lc = w.toLowerCase();
        const hit = all.find(
          (c) =>
            c.id === w ||
            c.slug?.toLowerCase() === lc ||
            c.name?.toLowerCase() === lc
        );
        return hit?.id;
      })
      .filter((x): x is string => Boolean(x));
  }

  return {
    clientIds,
    from: sp.get("from"),
    to: sp.get("to"),
    dateField,
  };
}

// Fetch leads matching the filters, paging past PostgREST's 1000-row cap.
export async function fetchLeads(f: Filters, extra?: { category?: string }) {
  const rows: Record<string, unknown>[] = [];
  const PAGE = 1000;
  for (let offset = 0; ; offset += PAGE) {
    let q = db()
      .from("leads")
      .select("*")
      .range(offset, offset + PAGE - 1);

    if (f.clientIds) q = q.in("client_id", f.clientIds);
    if (f.from) q = q.gte(f.dateField, f.from);
    if (f.to) q = q.lt(f.dateField, f.to);
    if (extra?.category) q = q.eq("category", extra.category);

    const { data, error } = await q;
    if (error) throw new Error(error.message);
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE) break;
  }
  return rows;
}

export async function clientLookup() {
  const { data } = await db().from("clients").select("id, name, slug, active, kpi_target_meetings, account_manager, website, contact_email");
  const byId = new Map((data ?? []).map((c) => [c.id, c]));
  return { list: data ?? [], byId };
}

export function money(n: number) {
  return Math.round(n * 100) / 100;
}
