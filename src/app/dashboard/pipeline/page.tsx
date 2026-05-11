import { createClient } from "@/lib/supabase/server";
import { Lead } from "@/lib/types";
import PipelineView from "./pipeline-view";
import { getActiveTenant } from "@/lib/active-tenant";

export default async function PipelinePage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const params = await searchParams;
  const now = new Date();
  const defaultFrom = `${now.getFullYear()}-01-01`;
  const defaultTo = `${now.getFullYear()}-12-31`;
  const from = params.from || defaultFrom;
  const to = params.to || defaultTo;
  // exclusive upper-bound for query
  const toExclusive = new Date(to);
  toExclusive.setDate(toExclusive.getDate() + 1);

  const supabase = await createClient();
  const active = await getActiveTenant();
  const tenantId = active?.clientId;

  if (!tenantId) {
    return (
      <div className="card p-12 text-center">
        <h2 className="text-xl font-semibold text-[var(--ink)]">No tenant selected</h2>
        <p className="text-sm text-[var(--muted)] mt-1">Pick a tenant from the sidebar.</p>
      </div>
    );
  }

  const { data: leadsData } = await supabase
    .from("leads")
    .select("*")
    .eq("client_id", tenantId)
    .gte("date_of_meeting", from)
    .lt("date_of_meeting", toExclusive.toISOString().slice(0, 10))
    .order("date_of_meeting", { ascending: false });

  const leads = (leadsData ?? []) as Lead[];

  return (
    <div className="space-y-6 rise">
      <div>
        <div className="text-[11px] uppercase tracking-[0.22em] text-[var(--muted)] mb-2">
          Pipeline
        </div>
        <h1 className="text-[32px] leading-[1.1] font-semibold tracking-tight text-[var(--ink)]">
          All Leads
        </h1>
        <p className="text-[14px] text-[var(--muted)] mt-1.5">
          Cross-month view — filter by date range and pipeline stage.
        </p>
      </div>

      <PipelineView leads={leads} from={from} to={to} />
    </div>
  );
}
