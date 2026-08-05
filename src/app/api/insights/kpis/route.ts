import { NextRequest, NextResponse } from "next/server";
import { authorize, resolveFilters, fetchLeads, clientLookup, jsonError, money } from "@/lib/insights";
import { computeKpis } from "@/lib/kpi";
import { Lead, LEAD_STATUSES, LeadStatus } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function summarize(leads: Lead[]) {
  const k = computeKpis(leads);
  return {
    leads: leads.length,
    meetingsBooked: k.meetingsBooked,
    upcomingMeetings: k.upcomingMeetings,
    shows: k.shows,
    noShows: k.noShows,
    unqualified: k.notClosed,
    nextStageOrBeyond: k.nextStageOrBeyond,
    proposalsSent: k.proposalsSent,
    proposalsActive: k.proposalsActive,
    won: k.won,
    showRate: k.meetingsBooked ? k.shows / k.meetingsBooked : 0,
    bookedToProposal: k.bookedToProposal,
    closingRate: k.closingRate,
    totalMrr: money(k.totalMrr),
    totalUpfront: money(k.totalUpfront),
    avgMrr: money(k.avgMrr),
  };
}

// GET /api/insights/kpis?groupBy=month|client|status
// The workhorse: every headline metric, optionally broken down.
export async function GET(req: NextRequest) {
  const denied = authorize(req);
  if (denied) return denied;

  try {
    const f = await resolveFilters(req);
    const groupBy = req.nextUrl.searchParams.get("groupBy");
    const leads = (await fetchLeads(f, { category: "meeting" })) as unknown as Lead[];

    const body: Record<string, unknown> = {
      filters: f,
      overall: summarize(leads),
    };

    if (groupBy === "month") {
      const buckets = new Map<string, Lead[]>();
      for (const l of leads) {
        const d = (l[f.dateField] as string | null) ?? l.created_date;
        if (!d) continue;
        const key = String(d).slice(0, 7);
        const arr = buckets.get(key) ?? [];
        arr.push(l);
        buckets.set(key, arr);
      }
      body.byMonth = [...buckets.entries()]
        .sort((a, b) => (a[0] < b[0] ? 1 : -1))
        .map(([month, ls]) => ({ month, ...summarize(ls) }));
    }

    if (groupBy === "client") {
      const { byId } = await clientLookup();
      const buckets = new Map<string, Lead[]>();
      for (const l of leads) {
        const arr = buckets.get(l.client_id) ?? [];
        arr.push(l);
        buckets.set(l.client_id, arr);
      }
      body.byClient = [...buckets.entries()]
        .map(([id, ls]) => ({
          clientId: id,
          client: byId.get(id)?.name ?? null,
          slug: byId.get(id)?.slug ?? null,
          ...summarize(ls),
        }))
        .sort((a, b) => b.meetingsBooked - a.meetingsBooked);
    }

    if (groupBy === "status") {
      const counts = Object.fromEntries(
        LEAD_STATUSES.map((s) => [s, 0])
      ) as Record<LeadStatus, number>;
      for (const l of leads) counts[l.status] = (counts[l.status] ?? 0) + 1;
      body.byStatus = counts;
    }

    return NextResponse.json(body);
  } catch (e) {
    return jsonError(e);
  }
}
