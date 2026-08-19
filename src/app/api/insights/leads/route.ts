import { NextRequest, NextResponse } from "next/server";
import { authorize, resolveFilters, fetchLeads, clientLookup, jsonError } from "@/lib/insights";
import { Lead } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SLIM = [
  "full_name",
  "company_name",
  "status",
  "date_of_meeting",
  "call_scheduled_for",
  "closed_date",
  "upfront_collected",
  "mrr_collected",
] as const;

// GET /api/insights/leads — the raw rows behind every metric, for drilling in
// or reading notes. Defaults to 200 rows; ask for more explicitly.
export async function GET(req: NextRequest) {
  const denied = authorize(req);
  if (denied) return denied;

  try {
    const sp = req.nextUrl.searchParams;
    const f = await resolveFilters(req);
    const status = sp.get("status");
    const category = sp.get("category") ?? undefined;
    const q = sp.get("q")?.toLowerCase();
    const slim = sp.get("fields") === "slim";
    const limit = Math.min(Number(sp.get("limit") ?? 200) || 200, 2000);
    const offset = Number(sp.get("offset") ?? 0) || 0;

    let leads = (await fetchLeads(f, { category })) as unknown as Lead[];
    const { byId } = await clientLookup();

    if (status) {
      const wanted = status.split(",").map((s) => s.trim().toLowerCase());
      leads = leads.filter((l) => wanted.includes(l.status));
    }
    if (q) {
      leads = leads.filter((l) =>
        [l.full_name, l.company_name, l.email, l.website]
          .some((v) => v?.toLowerCase().includes(q))
      );
    }

    leads.sort((a, b) =>
      String(b.date_of_meeting ?? b.created_date).localeCompare(
        String(a.date_of_meeting ?? a.created_date)
      )
    );

    const total = leads.length;
    const page = leads.slice(offset, offset + limit).map((l) => {
      const client = byId.get(l.client_id)?.name ?? null;
      if (!slim) return { ...l, client };
      const out: Record<string, unknown> = { client };
      for (const k of SLIM) out[k] = l[k];
      return out;
    });

    return NextResponse.json({
      filters: { ...f, status, category, q, limit, offset },
      total,
      returned: page.length,
      leads: page,
    });
  } catch (e) {
    return jsonError(e);
  }
}
