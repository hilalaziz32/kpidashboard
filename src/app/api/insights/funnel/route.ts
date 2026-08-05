import { NextRequest, NextResponse } from "next/server";
import { authorize, resolveFilters, fetchLeads, clientLookup, jsonError } from "@/lib/insights";
import { computeKpis } from "@/lib/kpi";
import { Lead } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function funnelFor(leads: Lead[]) {
  const k = computeKpis(leads);
  const steps = [
    { stage: "booked", count: k.meetingsBooked },
    { stage: "showed", count: k.shows },
    { stage: "nextStageOrBeyond", count: k.nextStageOrBeyond },
    { stage: "proposalSent", count: k.proposalsSent },
    { stage: "won", count: k.won },
  ];
  return steps.map((s, i) => ({
    ...s,
    fromPrevious: i === 0 ? 1 : steps[i - 1].count ? s.count / steps[i - 1].count : 0,
    fromBooked: k.meetingsBooked ? s.count / k.meetingsBooked : 0,
    dropOffFromPrevious: i === 0 ? 0 : steps[i - 1].count - s.count,
  }));
}

// GET /api/insights/funnel — stage-by-stage conversion, with the drop-off at
// each step so the weakest stage is obvious. groupBy=client for a comparison.
export async function GET(req: NextRequest) {
  const denied = authorize(req);
  if (denied) return denied;

  try {
    const f = await resolveFilters(req);
    const groupBy = req.nextUrl.searchParams.get("groupBy");
    const leads = (await fetchLeads(f, { category: "meeting" })) as unknown as Lead[];

    const body: Record<string, unknown> = {
      filters: f,
      funnel: funnelFor(leads),
      noShows: leads.filter((l) => l.status === "no show").length,
      lostBeforeMeeting: leads.filter((l) => l.status === "lost").length,
    };

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
          client: byId.get(id)?.name ?? id,
          slug: byId.get(id)?.slug ?? null,
          funnel: funnelFor(ls),
        }))
        .sort((a, b) => b.funnel[0].count - a.funnel[0].count);
    }

    return NextResponse.json(body);
  } catch (e) {
    return jsonError(e);
  }
}
