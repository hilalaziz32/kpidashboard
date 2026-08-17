import { NextRequest, NextResponse } from "next/server";
import { authorizeWrite, EDITABLE } from "@/lib/crm-write";
import { LEAD_STATUSES } from "@/lib/types";

export const dynamic = "force-dynamic";

// GET /api/crm — self-describing index for the write API.
export async function GET(req: NextRequest) {
  const denied = authorizeWrite(req);
  if (denied) return denied;

  return NextResponse.json({
    description:
      "Write API for the clients-kpis CRM. Pair it with the read-only /api/insights endpoints, which use a different token.",
    auth: "Authorization: Bearer <CRM_WRITE_TOKEN> (or ?token=). Separate from the insights read token.",
    endpoints: {
      "GET /api/crm/leads/:id": "Read one lead (useful before editing).",
      "PATCH /api/crm/leads/:id":
        "Update a lead. status, notes and call_recording_url are mirrored back to Airtable.",
      "DELETE /api/crm/leads/:id?confirm=true": "Permanently delete a lead. The confirm flag is required.",
      "POST /api/crm/leads":
        "Create a lead. Requires `client` (slug/name/uuid). Dashboard-only unless you pass airtable_record_id.",
      "POST /api/crm/clients":
        "Create a client and write its uuid into Airtable Clients.DashboardID.",
      "PATCH /api/crm/clients/:id":
        "Update a client (uuid, slug or name). Fields: name, slug, kpi_target_meetings, default_deal_size_monthly, default_deal_size_annual, active.",
    },
    editableLeadFields: EDITABLE,
    leadStatuses: LEAD_STATUSES,
    importantNotes: [
      "Airtable is the source of truth for status/notes/recordings. Edits here are pushed back to Airtable so the next sync does not overwrite them.",
      "Leads are unique per (client_id, email) — the same person can exist under different clients, but only once within one.",
      "Revenue (upfront_collected, mrr_collected) only counts toward totals when status is 'won'.",
      "A lead created without airtable_record_id lives only in the dashboard and will never be updated by the sync. Prefer creating the deal in Airtable.",
      "kpi_target_meetings is dashboard-only and does not sync to or from Airtable.",
    ],
    examples: [
      "PATCH /api/crm/leads/<uuid>  {\"status\":\"won\",\"mrr_collected\":2500,\"upfront_collected\":10000}",
      "PATCH /api/crm/clients/seedx  {\"kpi_target_meetings\":8}",
      "POST  /api/crm/clients  {\"name\":\"Acme Co\",\"kpi_target_meetings\":6}",
    ],
  });
}
