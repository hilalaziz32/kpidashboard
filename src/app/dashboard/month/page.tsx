import { createClient } from "@/lib/supabase/server";
import { computeKpis, fmtMoney, fmtPct, MONTH_NAMES } from "@/lib/kpi";
import { Client, Lead } from "@/lib/types";
import LeadsTable from "./leads-table";
import MonthSwitcher from "./month-switcher";
import CategoryTabs from "./category-tabs";
import { getActiveTenant } from "@/lib/active-tenant";

export default async function MonthPage({
  searchParams,
}: {
  searchParams: Promise<{ y?: string; m?: string; tab?: string }>;
}) {
  const params = await searchParams;
  const now = new Date();
  const year = params.y ? Number(params.y) : now.getFullYear();
  const month = params.m ? Number(params.m) : now.getMonth() + 1;
  const tab = params.tab === "pr" ? "pr" : "meetings";

  const start = new Date(year, month - 1, 1).toISOString();
  const end = new Date(year, month, 1).toISOString();

  const supabase = await createClient();
  const active = await getActiveTenant();
  const myClientId = active?.clientId;

  if (!myClientId) {
    return (
      <div className="card p-12 text-center">
        <h2 className="text-xl font-semibold text-[var(--ink)]">No tenant selected</h2>
        <p className="text-sm text-[var(--muted)] mt-1">Pick a tenant from the sidebar.</p>
      </div>
    );
  }

  const { data: client } = await supabase
    .from("clients")
    .select("id, name, slug, kpi_target_meetings")
    .eq("id", myClientId)
    .single<Client>();

  // Two parallel queries: meetings (for KPIs) + PR count (for tab badge)
  const [{ data: meetingsData }, { count: prCountRaw }] = await Promise.all([
    supabase
      .from("leads")
      .select("*")
      .eq("client_id", myClientId!)
      .eq("category", "meeting")
      .gte("date_of_meeting", start)
      .lt("date_of_meeting", end)
      .order("date_of_meeting", { ascending: true }),
    supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("client_id", myClientId!)
      .eq("category", "pr")
      .gte("created_date", start)
      .lt("created_date", end),
  ]);
  const prCount = prCountRaw ?? 0;

  // For PR tab, fetch the actual PR rows
  let prRows: Lead[] = [];
  if (tab === "pr") {
    const { data } = await supabase
      .from("leads")
      .select("*")
      .eq("client_id", myClientId!)
      .eq("category", "pr")
      .gte("created_date", start)
      .lt("created_date", end)
      .order("created_date", { ascending: false });
    prRows = (data ?? []) as Lead[];
  }

  const meetings = (meetingsData ?? []) as Lead[];
  const k = computeKpis(meetings);
  const target = client?.kpi_target_meetings ?? 0;
  const diff = target - k.meetingsBooked;
  const targetProgress = target > 0 ? Math.min(k.meetingsBooked / target, 1) : 0;

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
        </div>
        <MonthSwitcher year={year} month={month} />
      </div>

      {/* Compact KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-7 gap-3">
        <Stat label="Booked" value={k.meetingsBooked} />
        <Stat label="Shows" value={k.shows} />
        <Stat label="No Shows" value={k.noShows} />
        <Stat label="Unqualified" value={k.notClosed} />
        <Stat label="Proposals" value={k.proposalsSent} />
        <Stat label="Won" value={k.won} accent />
        <Stat label="Close Rate" value={fmtPct(k.closingRate)} />
      </div>

      {/* Pacing + Revenue — single row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-7 card p-6">
          <div className="flex items-end justify-between mb-4">
            <div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">
                Pacing
              </div>
              <div className="mt-2 flex items-baseline gap-3">
                <div className="tabular text-[40px] leading-none font-semibold text-[var(--ink)]">
                  {k.meetingsBooked}
                </div>
                <div className="tabular text-[15px] text-[var(--muted)]">
                  / {target} target
                </div>
              </div>
            </div>
            <DiffBadge value={diff} />
          </div>
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
        </div>

        <div className="lg:col-span-5 card p-6">
          <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--muted)] mb-4">
            Revenue
          </div>
          <div className="grid grid-cols-2 gap-5">
            <Metric label="MRR Added" value={fmtMoney(k.totalMrr)} accent />
            <Metric label="Upfront" value={fmtMoney(k.totalUpfront)} />
          </div>
        </div>
      </div>

      <CategoryTabs
        active={tab}
        year={year}
        month={month}
        meetingsCount={meetings.length}
        prCount={prCount}
      />

      {tab === "meetings" ? (
        <LeadsTable leads={meetings} />
      ) : (
        <LeadsTable leads={prRows} prMode />
      )}
    </div>
  );
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

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: number | string;
  accent?: boolean;
}) {
  return (
    <div className="card px-3 py-2.5">
      <div className="text-[9px] uppercase tracking-[0.16em] text-[var(--muted)] truncate">
        {label}
      </div>
      <div
        className={`tabular text-[18px] font-semibold tracking-tight mt-0.5 ${
          accent ? "text-[var(--violet-600)]" : "text-[var(--ink)]"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
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
