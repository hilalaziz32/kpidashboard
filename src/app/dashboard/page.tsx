import { createClient } from "@/lib/supabase/server";
import { computeKpis, fmtMoney, fmtPct, MONTH_NAMES } from "@/lib/kpi";
import { Lead } from "@/lib/types";
import Link from "next/link";

export default async function AllTimePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: me } = await supabase
    .from("client_users")
    .select("client_id")
    .eq("user_id", user!.id)
    .single();

  const [{ data: leadsData }, { data: marketingMonthly }] = await Promise.all([
    supabase
      .from("leads")
      .select("*")
      .eq("client_id", me!.client_id)
      .order("date_of_meeting", { ascending: false }),
    supabase
      .from("monthly_marketing_stats")
      .select("year, month, emails_sent, sms_sent, email_prs, sms_prs")
      .eq("client_id", me!.client_id),
  ]);
  const leads = (leadsData ?? []) as Lead[];
  const marketingByMonth = new Map<string, { emails: number; sms: number; emailPrs: number; smsPrs: number }>();
  let totalEmails = 0, totalSms = 0, totalEmailPrs = 0, totalSmsPrs = 0;
  for (const m of marketingMonthly ?? []) {
    const key = `${m.year}-${m.month - 1}`;
    marketingByMonth.set(key, {
      emails: m.emails_sent, sms: m.sms_sent,
      emailPrs: m.email_prs, smsPrs: m.sms_prs,
    });
    totalEmails += m.emails_sent;
    totalSms += m.sms_sent;
    totalEmailPrs += m.email_prs;
    totalSmsPrs += m.sms_prs;
  }
  const emailReplyRate = totalEmails ? totalEmailPrs / totalEmails : 0;
  const smsReplyRate = totalSms ? totalSmsPrs / totalSms : 0;

  const byMonth = new Map<string, Lead[]>();
  for (const l of leads) {
    const d = l.date_of_meeting ? new Date(l.date_of_meeting) : new Date(l.created_date);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (!byMonth.has(key)) byMonth.set(key, []);
    byMonth.get(key)!.push(l);
  }
  const rows = Array.from(byMonth.entries())
    .map(([k, ls]) => {
      const [y, m] = k.split("-").map(Number);
      return { year: y, month: m, leads: ls, kpi: computeKpis(ls) };
    })
    .sort((a, b) => (b.year - a.year) || (b.month - a.month));

  const totals = rows.reduce(
    (a, r) => ({
      booked: a.booked + r.kpi.meetingsBooked,
      won: a.won + r.kpi.won,
      mrr: a.mrr + r.kpi.totalMrr,
      upfront: a.upfront + r.kpi.totalUpfront,
    }),
    { booked: 0, won: 0, mrr: 0, upfront: 0 }
  );
  const closing = totals.booked ? totals.won / totals.booked : 0;

  return (
    <div className="space-y-10 rise">
      <div className="flex items-end justify-between gap-6">
        <div>
          <div className="text-[11px] uppercase tracking-[0.22em] text-[var(--muted)] mb-2">
            Overview
          </div>
          <h1 className="text-[32px] leading-[1.1] font-semibold tracking-tight text-[var(--ink)]">
            All-Time Results
          </h1>
          <p className="text-[14px] text-[var(--muted)] mt-1.5">
            Monthly rollup, auto-calculated from your pipeline.
          </p>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-widest text-[var(--muted)]">
            Generated
          </div>
          <div className="tabular text-[12px] text-[var(--ink)] mt-0.5">
            {new Date().toLocaleString()}
          </div>
        </div>
      </div>

      {/* Hero stats — pipeline */}
      <div>
        <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--muted)] mb-3">
          Pipeline
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <HeroStat label="Total Meetings" value={totals.booked.toLocaleString()} accent />
        <HeroStat label="Closed-Won" value={totals.won.toLocaleString()} sub={`${(closing * 100).toFixed(1)}% close`} />
        <HeroStat label="MRR Added" value={fmtMoney(totals.mrr)} />
        <HeroStat label="Upfront" value={fmtMoney(totals.upfront)} />
        </div>
      </div>

      {/* Hero stats — marketing */}
      <div>
        <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--muted)] mb-3">
          Marketing Activity
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <HeroStat
            label="Emails Sent"
            value={totalEmails.toLocaleString()}
            sub={`${totalEmailPrs} positive replies · ${(emailReplyRate * 100).toFixed(2)}%`}
          />
          <HeroStat
            label="SMS Sent"
            value={totalSms.toLocaleString()}
            sub={`${totalSmsPrs} positive replies · ${(smsReplyRate * 100).toFixed(2)}%`}
          />
          <HeroStat
            label="Email Positive Replies"
            value={totalEmailPrs.toLocaleString()}
          />
          <HeroStat
            label="SMS Positive Replies"
            value={totalSmsPrs.toLocaleString()}
          />
        </div>
      </div>

      {/* Monthly table */}
      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b" style={{ borderColor: "var(--border)" }}>
          <h3 className="text-[14px] font-semibold text-[var(--ink)]">Monthly breakdown</h3>
          <p className="text-[12px] text-[var(--muted)] mt-0.5">
            Click a month to drill into the leads pipeline.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr>
                {[
                  { label: "Period", align: "left" },
                  { label: "Booked", align: "right" },
                  { label: "Shows", align: "right" },
                  { label: "No Shows", align: "right" },
                  { label: "Not Closed", align: "right" },
                  { label: "Proposals", align: "right" },
                  { label: "Won", align: "right" },
                  { label: "Close Rate", align: "right" },
                  { label: "Active %", align: "right" },
                  { label: "Booked → Prop", align: "right" },
                  { label: "Emails", align: "right" },
                  { label: "SMS", align: "right" },
                  { label: "Email PRs", align: "right" },
                  { label: "SMS PRs", align: "right" },
                  { label: "Upfront", align: "right" },
                  { label: "MRR", align: "right" },
                ].map((h) => (
                  <th
                    key={h.label}
                    className={`px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)] whitespace-nowrap ${
                      h.align === "right" ? "text-right" : "text-left"
                    }`}
                    style={{ borderBottom: "1px solid var(--border)" }}
                  >
                    {h.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={16} className="px-6 py-16 text-center text-[var(--muted)]">
                    No data yet. Once your automation pushes leads, this fills automatically.
                  </td>
                </tr>
              )}
              {rows.map((r) => {
                const k = r.kpi;
                const activePct = k.meetingsBooked ? k.proposalsActive / k.meetingsBooked : 0;
                const mk = marketingByMonth.get(`${r.year}-${r.month}`);
                return (
                  <tr
                    key={`${r.year}-${r.month}`}
                    className="hover:bg-[var(--violet-50)]/40 transition group"
                    style={{ borderTop: "1px solid var(--border)" }}
                  >
                    <td className="px-5 py-4">
                      <Link
                        href={`/dashboard/month?y=${r.year}&m=${r.month + 1}`}
                        className="font-medium text-[var(--ink)] group-hover:text-[var(--violet-600)] transition"
                      >
                        {MONTH_NAMES[r.month]} {r.year}
                      </Link>
                    </td>
                    <Cell>{k.meetingsBooked}</Cell>
                    <Cell>{k.shows}</Cell>
                    <Cell>{k.noShows}</Cell>
                    <Cell>{k.notClosed}</Cell>
                    <Cell>{k.proposalsSent}</Cell>
                    <Cell>
                      <span className="inline-flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        {k.won}
                      </span>
                    </Cell>
                    <Cell>{fmtPct(k.closingRate)}</Cell>
                    <Cell>{fmtPct(activePct)}</Cell>
                    <Cell>{fmtPct(k.bookedToProposal)}</Cell>
                    <Cell>{(mk?.emails ?? 0).toLocaleString()}</Cell>
                    <Cell>{(mk?.sms ?? 0).toLocaleString()}</Cell>
                    <Cell>{mk?.emailPrs ?? 0}</Cell>
                    <Cell>{mk?.smsPrs ?? 0}</Cell>
                    <Cell>{fmtMoney(k.totalUpfront)}</Cell>
                    <Cell strong>{fmtMoney(k.totalMrr)}</Cell>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function HeroStat({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div
      className="card p-5 relative overflow-hidden"
      style={
        accent
          ? {
              background:
                "linear-gradient(135deg, var(--violet) 0%, #4A22BD 100%)",
              borderColor: "transparent",
              color: "white",
            }
          : undefined
      }
    >
      {accent && (
        <div
          className="absolute -top-10 -right-10 w-32 h-32 rounded-full blur-2xl"
          style={{ background: "rgba(255,255,255,0.18)" }}
        />
      )}
      <div
        className={`text-[10px] uppercase tracking-[0.2em] ${
          accent ? "text-white/70" : "text-[var(--muted)]"
        }`}
      >
        {label}
      </div>
      <div
        className={`tabular text-[28px] font-semibold tracking-tight mt-2 ${
          accent ? "text-white" : "text-[var(--ink)]"
        }`}
      >
        {value}
      </div>
      {sub && (
        <div
          className={`text-[12px] mt-1 ${
            accent ? "text-white/70" : "text-[var(--muted)]"
          }`}
        >
          {sub}
        </div>
      )}
    </div>
  );
}

function Cell({ children, strong }: { children: React.ReactNode; strong?: boolean }) {
  return (
    <td
      className={`px-5 py-4 tabular text-right whitespace-nowrap ${
        strong ? "text-[var(--ink)] font-medium" : "text-[var(--text)]"
      }`}
    >
      {children}
    </td>
  );
}
