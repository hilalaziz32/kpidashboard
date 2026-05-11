import { createClient } from "@/lib/supabase/server";
import { Lead } from "@/lib/types";
import PipelineView from "./pipeline-view";

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
  const { data: { user } } = await supabase.auth.getUser();
  const { data: me } = await supabase
    .from("client_users")
    .select("client_id")
    .eq("user_id", user!.id)
    .single();

  const { data: leadsData } = await supabase
    .from("leads")
    .select("*")
    .eq("client_id", me!.client_id)
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
