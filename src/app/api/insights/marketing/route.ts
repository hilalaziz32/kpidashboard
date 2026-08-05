import { NextRequest, NextResponse } from "next/server";
import { authorize, resolveFilters, clientLookup, db, jsonError } from "@/lib/insights";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Stat = {
  client_id: string;
  emails_sent: number;
  sms_sent: number;
  email_prs: number;
  sms_prs: number;
  year?: number;
  month?: number;
  stat_date?: string;
};

function agg(rows: Stat[]) {
  const t = rows.reduce(
    (a, r) => ({
      emailsSent: a.emailsSent + (r.emails_sent || 0),
      smsSent: a.smsSent + (r.sms_sent || 0),
      emailPrs: a.emailPrs + (r.email_prs || 0),
      smsPrs: a.smsPrs + (r.sms_prs || 0),
    }),
    { emailsSent: 0, smsSent: 0, emailPrs: 0, smsPrs: 0 }
  );
  return {
    ...t,
    totalSent: t.emailsSent + t.smsSent,
    totalPositiveReplies: t.emailPrs + t.smsPrs,
    emailReplyRate: t.emailsSent ? t.emailPrs / t.emailsSent : 0,
    smsReplyRate: t.smsSent ? t.smsPrs / t.smsSent : 0,
  };
}

// GET /api/insights/marketing?granularity=month|day — outbound volume and
// positive-reply rates, the top of the funnel that feeds meetings.
export async function GET(req: NextRequest) {
  const denied = authorize(req);
  if (denied) return denied;

  try {
    const f = await resolveFilters(req);
    const daily = req.nextUrl.searchParams.get("granularity") === "day";
    const table = daily ? "daily_marketing_stats" : "monthly_marketing_stats";

    let q = db().from(table).select("*");
    if (f.clientIds) q = q.in("client_id", f.clientIds);
    if (daily) {
      if (f.from) q = q.gte("stat_date", f.from);
      if (f.to) q = q.lt("stat_date", f.to);
    }
    const { data, error } = await q;
    if (error) throw new Error(error.message);

    let rows = (data ?? []) as Stat[];

    // monthly_marketing_stats stores year/month, so range-filter in memory.
    if (!daily && (f.from || f.to)) {
      rows = rows.filter((r) => {
        const key = `${r.year}-${String(r.month).padStart(2, "0")}`;
        if (f.from && key < f.from.slice(0, 7)) return false;
        if (f.to && key >= f.to.slice(0, 7)) return false;
        return true;
      });
    }

    const { byId } = await clientLookup();
    const buckets = new Map<string, Stat[]>();
    for (const r of rows) {
      const arr = buckets.get(r.client_id) ?? [];
      arr.push(r);
      buckets.set(r.client_id, arr);
    }

    return NextResponse.json({
      filters: { ...f, granularity: daily ? "day" : "month" },
      overall: agg(rows),
      byClient: [...buckets.entries()]
        .map(([id, rs]) => ({ client: byId.get(id)?.name ?? id, ...agg(rs) }))
        .sort((a, b) => b.totalSent - a.totalSent),
      periods: rows
        .map((r) => ({
          client: byId.get(r.client_id)?.name ?? r.client_id,
          period: daily ? r.stat_date : `${r.year}-${String(r.month).padStart(2, "0")}`,
          emailsSent: r.emails_sent,
          smsSent: r.sms_sent,
          emailPrs: r.email_prs,
          smsPrs: r.sms_prs,
        }))
        .sort((a, b) => String(b.period).localeCompare(String(a.period))),
    });
  } catch (e) {
    return jsonError(e);
  }
}
