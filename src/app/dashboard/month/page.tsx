import { createClient } from "@/lib/supabase/server";
import { computeKpis, fmtMoney, fmtPct, MONTH_NAMES } from "@/lib/kpi";
import { Client, Lead, MarketingStats } from "@/lib/types";
import LeadsTable from "./leads-table";
import MonthSwitcher from "./month-switcher";

export default async function MonthPage({
  searchParams,
}: {
  searchParams: Promise<{ y?: string; m?: string }>;
}) {
  const params = await searchParams;
  const now = new Date();
  const year = params.y ? Number(params.y) : now.getFullYear();
  const month = params.m ? Number(params.m) : now.getMonth() + 1;

  const start = new Date(year, month - 1, 1).toISOString();
  const end = new Date(year, month, 1).toISOString();

  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  const { data: me } = await supabase
    .from("client_users")
    .select("client_id, role, clients(id, name, slug, kpi_target_meetings)")
    .eq("user_id", user!.id)
    .single();

  const client = (Array.isArray(me?.clients) ? me?.clients[0] : me?.clients) as Client | null;
  const myClientId = client?.id;

  const [{ data: leadsData }, { data: mms }] = await Promise.all([
    supabase
      .from("leads")
      .select("*")
      .eq("client_id", myClientId!)
      .gte("date_of_meeting", start)
      .lt("date_of_meeting", end)
      .order("date_of_meeting", { ascending: true }),
    supabase
      .from("monthly_marketing_stats")
      .select("emails_sent, sms_sent, email_prs, sms_prs")
      .eq("client_id", myClientId!)
      .eq("year", year)
      .eq("month", month)
      .maybeSingle<MarketingStats>(),
  ]);

  const leads = (leadsData ?? []) as Lead[];
  const k = computeKpis(leads);
  const target = client?.kpi_target_meetings ?? 0;
  const diff = target - k.meetingsBooked;
  const targetProgress = target > 0 ? Math.min(k.meetingsBooked / target, 1) : 0;
  const activePct = k.meetingsBooked ? k.proposalsActive / k.meetingsBooked : 0;

  return (
    <div className="space-y-8 rise">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <div className="text-[11px] uppercase tracking-[0.22em] text-[var(--muted)] mb-2">
            Monthly KPI
          </div>
          <h1 className="text-[32px] leading-[1.1] font-semibold tracking-tight text-[var(--ink)]">
            {MONTH_NAMES[month - 1]}{" "}
            <span className="text-[var(--violet)]">{year}</span>
          </h1>
          <p className="text-[14px] text-[var(--muted)] mt-1.5">
            Performance for the selected period.
          </p>
        </div>
        <MonthSwitcher year={year} month={month} />
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Pacing - hero */}
        <div className="lg:col-span-5 card p-6 relative overflow-hidden">
          <div className="flex items-start justify-between mb-5">
            <div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">
                KPI Pacing
              </div>
              <div className="mt-2 flex items-baseline gap-3">
                <div className="tabular text-[44px] leading-none font-semibold text-[var(--ink)]">
                  {k.meetingsBooked}
                </div>
                <div className="tabular text-[16px] text-[var(--muted)]">
                  / {target}
                </div>
              </div>
              <div className="text-[12px] text-[var(--muted)] mt-2">
                Meetings booked vs. target
              </div>
            </div>
            <DiffBadge value={diff} />
          </div>

          {/* Progress */}
          <div
            className="h-2 rounded-full overflow-hidden"
            style={{ background: "var(--violet-50)" }}
          >
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${targetProgress * 100}%`,
                background:
                  "linear-gradient(90deg, var(--violet) 0%, #A78BFA 100%)",
              }}
            />
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] text-[var(--muted)]">
            <span>{(targetProgress * 100).toFixed(0)}% of target</span>
            <span className="tabular">{Math.max(0, diff)} to go</span>
          </div>
        </div>

        {/* Status counts */}
        <div className="lg:col-span-7 card p-6">
          <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--muted)] mb-4">
            Status breakdown
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-4">
            <StatusItem label="Meetings Booked" value={k.meetingsBooked} pct={1} dot="bg-slate-400" />
            <StatusItem label="Upcoming" value={k.upcomingMeetings} pct={pct(k.upcomingMeetings, k.meetingsBooked)} dot="bg-sky-500" />
            <StatusItem label="Shows" value={k.shows} pct={pct(k.shows, k.meetingsBooked)} dot="bg-violet-500" />
            <StatusItem label="No Shows" value={k.noShows} pct={pct(k.noShows, k.meetingsBooked)} dot="bg-rose-500" />
            <StatusItem label="Not Closed" value={k.notClosed} pct={pct(k.notClosed, k.meetingsBooked)} dot="bg-orange-500" />
            <StatusItem label="Proposals Sent" value={k.proposalsSent} pct={pct(k.proposalsSent, k.meetingsBooked)} dot="bg-amber-500" />
            <StatusItem label="Won" value={k.won} pct={pct(k.won, k.meetingsBooked)} dot="bg-emerald-500" />
          </div>
        </div>

        {/* Revenue */}
        <div className="lg:col-span-7 card p-6">
          <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--muted)] mb-4">
            Revenue & Clients
          </div>
          <div className="grid grid-cols-2 gap-5">
            <Metric label="MRR Added" value={fmtMoney(k.totalMrr)} accent />
            <Metric label="Avg MRR" value={fmtMoney(k.avgMrr)} />
            <Metric label="Upfront" value={fmtMoney(k.totalUpfront)} />
            <Metric label="Close Rate" value={fmtPct(k.closingRate)} />
          </div>
          <div
            className="mt-6 pt-5 grid grid-cols-3 gap-x-6 gap-y-2 text-[13px]"
            style={{ borderTop: "1px solid var(--border)" }}
          >
            <Inline label="New Clients" value={k.newClients} />
            <Inline label="Proposals" value={k.proposalsSent} />
            <Inline label="Active" value={`${k.proposalsActive} · ${fmtPct(activePct)}`} />
          </div>
        </div>

        {/* Marketing */}
        <div
          className="lg:col-span-5 card p-6 text-white relative overflow-hidden"
          style={{ background: "var(--ink)", borderColor: "transparent" }}
        >
          <div
            className="absolute -top-20 -right-20 w-60 h-60 rounded-full blur-3xl"
            style={{ background: "rgba(105,56,239,0.4)" }}
          />
          <div className="relative">
            <div className="text-[10px] uppercase tracking-[0.2em] text-white/50 mb-4">
              Marketing Activity
            </div>
            <div className="grid grid-cols-2 gap-5">
              <DarkMetric label="Emails Sent" value={(mms?.emails_sent ?? 0).toLocaleString()} />
              <DarkMetric label="SMS Sent" value={(mms?.sms_sent ?? 0).toLocaleString()} />
              <DarkMetric label="Email PRs" value={(mms?.email_prs ?? 0).toLocaleString()} accent />
              <DarkMetric label="SMS PRs" value={(mms?.sms_prs ?? 0).toLocaleString()} accent />
            </div>
          </div>
        </div>
      </div>

      <LeadsTable leads={leads} />
    </div>
  );
}

function pct(a: number, b: number) {
  return b ? a / b : 0;
}

function DiffBadge({ value }: { value: number }) {
  const ahead = value <= 0;
  return (
    <div
      className="rounded-full px-3 py-1.5 text-[11px] font-medium tabular"
      style={{
        background: ahead ? "#DCFCE7" : "#FEF3C7",
        color: ahead ? "#065F46" : "#92400E",
      }}
    >
      {ahead ? "↑" : "↓"} {Math.abs(value)} {ahead ? "ahead" : "behind"}
    </div>
  );
}

function StatusItem({
  label,
  value,
  pct,
  dot,
}: {
  label: string;
  value: number;
  pct: number;
  dot: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-[var(--muted)]">
        <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
        {label}
      </div>
      <div className="mt-1.5 flex items-baseline gap-2">
        <div className="tabular text-[26px] font-semibold text-[var(--ink)] leading-none">
          {value}
        </div>
        <div className="tabular text-[11px] text-[var(--muted)]">
          {fmtPct(pct)}
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="min-w-0">
      <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--muted)] whitespace-nowrap">
        {label}
      </div>
      <div
        className={`tabular text-[22px] font-semibold tracking-tight mt-1 truncate ${
          accent ? "text-[var(--violet-600)]" : "text-[var(--ink)]"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function DarkMetric({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.18em] text-white/40">
        {label}
      </div>
      <div
        className={`tabular text-[22px] font-semibold tracking-tight mt-1 ${
          accent ? "text-[#C4B5FD]" : "text-white"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function Inline({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between gap-3 min-w-0">
      <span className="text-[var(--muted)] whitespace-nowrap">{label}</span>
      <span className="tabular font-medium text-[var(--ink)] truncate">{value}</span>
    </div>
  );
}
