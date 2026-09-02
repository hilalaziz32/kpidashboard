import { NextRequest, NextResponse } from "next/server";
import { authorize, resolveFilters, fetchLeads, clientLookup, jsonError, money } from "@/lib/insights";
import { computeKpis } from "@/lib/kpi";
import { Lead } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// GET /api/insights/clients — one row per client with counts, funnel and
// revenue. The natural first call: it shows what exists before drilling in.
export async function GET(req: NextRequest) {
  const denied = authorize(req);
  if (denied) return denied;

  try {
    const f = await resolveFilters(req);
    const [{ list }, leads] = await Promise.all([clientLookup(), fetchLeads(f)]);

    const byClient = new Map<string, Lead[]>();
    for (const l of leads as unknown as Lead[]) {
      const arr = byClient.get(l.client_id) ?? [];
      arr.push(l);
      byClient.set(l.client_id, arr);
    }

    const rows = list
      .filter((c) => !f.clientIds || f.clientIds.includes(c.id))
      .map((c) => {
        const mine = byClient.get(c.id) ?? [];
        const meetings = mine.filter((l) => l.category === "meeting");
        const k = computeKpis(meetings);
        const target = c.kpi_target_meetings ?? 0;
        return {
          id: c.id,
          name: c.name,
          slug: c.slug,
          active: c.active,
          accountManager: c.account_manager ?? null,
          website: c.website ?? null,
          contactEmail: c.contact_email ?? null,
          totalLeads: mine.length,
          prLeads: mine.filter((l) => l.category === "pr").length,
          meetingsBooked: k.meetingsBooked,
          upcomingMeetings: k.upcomingMeetings,
          shows: k.shows,
          noShows: k.noShows,
          unqualified: k.notClosed,
          nextStageOrBeyond: k.nextStageOrBeyond,
          proposalsSent: k.proposalsSent,
          won: k.won,
          showRate: k.meetingsBooked ? k.shows / k.meetingsBooked : 0,
          closingRate: k.closingRate,
          totalMrr: money(k.totalMrr),
          totalUpfront: money(k.totalUpfront),
          avgMrr: money(k.avgMrr),
          monthlyTarget: target,
          targetAttainment: target ? k.meetingsBooked / target : null,
        };
      })
      .sort((a, b) => b.meetingsBooked - a.meetingsBooked);

    const totals = rows.reduce(
      (a, r) => ({
        clients: a.clients + 1,
        meetingsBooked: a.meetingsBooked + r.meetingsBooked,
        shows: a.shows + r.shows,
        won: a.won + r.won,
        totalMrr: a.totalMrr + r.totalMrr,
        totalUpfront: a.totalUpfront + r.totalUpfront,
      }),
      { clients: 0, meetingsBooked: 0, shows: 0, won: 0, totalMrr: 0, totalUpfront: 0 }
    );

    return NextResponse.json({
      filters: f,
      totals: {
        ...totals,
        totalMrr: money(totals.totalMrr),
        totalUpfront: money(totals.totalUpfront),
        showRate: totals.meetingsBooked ? totals.shows / totals.meetingsBooked : 0,
      },
      clients: rows,
    });
  } catch (e) {
    return jsonError(e);
  }
}
