import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getActiveTenant } from "@/lib/active-tenant";
import { ACTIVE_TENANT_COOKIE } from "@/lib/active-tenant";

// Deep link target for Airtable's "Sales Dashboard Link" formula field, which
// builds .../dashboard/lead/<Airtable record id>. We resolve the Airtable id to
// the lead, point the session at that lead's tenant, then hand off to the normal
// month view with the drawer open — so the link lands on the real, editable UI
// rather than a second read-only copy of it.
export default async function LeadDeepLink({
  params,
}: {
  params: Promise<{ recordId: string }>;
}) {
  const { recordId } = await params;

  // User-scoped client: RLS decides what this person may see, so a client user
  // following a link to another tenant's lead simply gets "not found".
  const supabase = await createClient();
  const { data: lead } = await supabase
    .from("leads")
    .select("id, client_id, category, date_of_meeting, created_date")
    .eq("airtable_record_id", recordId)
    .maybeSingle();

  if (!lead) return <NotFound recordId={recordId} />;

  // Admins carry an active-tenant cookie; the lead may belong to a different
  // tenant than the one they were last looking at, so point it at this one.
  const active = await getActiveTenant();
  if (active?.isAdmin && active.clientId !== lead.client_id) {
    const jar = await cookies();
    jar.set(ACTIVE_TENANT_COOKIE, lead.client_id, {
      path: "/",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
    });
  }

  // The month view is filtered by date_of_meeting, so open the month the lead
  // actually appears in. Fall back to created_date for leads with no meeting.
  const anchor = lead.date_of_meeting ?? lead.created_date;
  const d = anchor ? new Date(anchor) : new Date();
  const y = d.getFullYear();
  const m = d.getMonth() + 1;

  // Meetings and positive replies live on separate tabs; land on the one that
  // actually contains this lead, or the drawer silently won't open.
  const tab = lead.category === "pr" ? "&tab=pr" : "";
  redirect(`/dashboard/month?y=${y}&m=${m}${tab}&lead=${lead.id}`);
}

function NotFound({ recordId }: { recordId: string }) {
  return (
    <div className="card p-12 text-center max-w-lg mx-auto">
      <h2 className="text-xl font-semibold text-[var(--ink)]">Lead not on the dashboard</h2>
      <p className="text-sm text-[var(--muted)] mt-2 leading-relaxed">
        Airtable deal <code className="text-[var(--ink)]">{recordId}</code> has no
        matching lead here. That is expected for pre-meeting stages, which are not
        synced — or the deal may not have synced yet.
      </p>
      <Link
        href="/dashboard/month"
        className="inline-block mt-6 rounded-lg px-4 py-2 text-[14px] text-white"
        style={{ background: "var(--violet)" }}
      >
        Go to this month →
      </Link>
    </div>
  );
}
