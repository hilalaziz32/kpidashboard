import { NextRequest, NextResponse } from "next/server";
import { authorize, resolveFilters, fetchLeads, clientLookup, jsonError, money } from "@/lib/insights";
import { Lead } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function totals(rows: Lead[]) {
  const mrr = rows.reduce((s, l) => s + Number(l.mrr_collected || 0), 0);
  const upfront = rows.reduce((s, l) => s + Number(l.upfront_collected || 0), 0);
  return {
    deals: rows.length,
    totalMrr: money(mrr),
    totalUpfront: money(upfront),
    totalContractValue: money(mrr + upfront),
    avgMrr: money(rows.length ? mrr / rows.length : 0),
    avgUpfront: money(rows.length ? upfront / rows.length : 0),
  };
}

// GET /api/insights/revenue — won deals only, with the deal list so figures can
// be traced back to specific companies. groupBy=month|client.
export async function GET(req: NextRequest) {
  const denied = authorize(req);
  if (denied) return denied;

  try {
    const f = await resolveFilters(req);
    const groupBy = req.nextUrl.searchParams.get("groupBy");
    const all = (await fetchLeads(f, { category: "meeting" })) as unknown as Lead[];
    const won = all.filter((l) => l.status === "won");
    const { byId } = await clientLookup();

    const body: Record<string, unknown> = {
      filters: f,
      overall: totals(won),
      deals: won
        .sort((a, b) => Number(b.mrr_collected || 0) - Number(a.mrr_collected || 0))
        .map((l) => ({
          client: byId.get(l.client_id)?.name ?? null,
          full_name: l.full_name,
          company_name: l.company_name,
          date_of_meeting: l.date_of_meeting,
          upfront_collected: Number(l.upfront_collected || 0),
          mrr_collected: Number(l.mrr_collected || 0),
          deal_size_monthly: l.deal_size_monthly,
          deal_size_annual: l.deal_size_annual,
        })),
    };

    if (groupBy === "client") {
      const buckets = new Map<string, Lead[]>();
      for (const l of won) {
        const arr = buckets.get(l.client_id) ?? [];
        arr.push(l);
        buckets.set(l.client_id, arr);
      }
      body.byClient = [...buckets.entries()]
        .map(([id, ls]) => ({ client: byId.get(id)?.name ?? id, ...totals(ls) }))
        .sort((a, b) => b.totalMrr - a.totalMrr);
    }

    if (groupBy === "month") {
      const buckets = new Map<string, Lead[]>();
      for (const l of won) {
        const d = (l[f.dateField] as string | null) ?? l.created_date;
        if (!d) continue;
        const arr = buckets.get(String(d).slice(0, 7)) ?? [];
        arr.push(l);
        buckets.set(String(d).slice(0, 7), arr);
      }
      body.byMonth = [...buckets.entries()]
        .sort((a, b) => (a[0] < b[0] ? 1 : -1))
        .map(([month, ls]) => ({ month, ...totals(ls) }));
    }

    return NextResponse.json(body);
  } catch (e) {
    return jsonError(e);
  }
}
