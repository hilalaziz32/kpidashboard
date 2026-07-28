import { LeadStatus } from "./types";

// SERVER-ONLY. Never import into a client component — it uses the Airtable
// secret. Used to write dashboard status changes back to the Airtable Deals
// table so Airtable stays the source of truth (and n8n won't clobber edits).

export const BASE_ID = "appgezzL6Uqr0xgBa";
export const DEALS_TABLE_ID = "tblpcwgO0EguL7K98";
const STAGE_FIELD = "Pipeline stage";

// Reverse of STATUS_TO_STAGE: Airtable "Pipeline stage" → Supabase lead_status.
// Stages not listed here (e.g. "Positive Reply", "Maybe") are pre-meeting and
// are intentionally NOT synced as meeting leads.
export const STAGE_TO_STATUS: Record<string, LeadStatus> = {
  "Meeting Booked": "meeting booked",
  Rescheduled: "rescheduled",
  Show: "show",
  "No Show": "no show",
  "Next Stage": "next stage",
  "Proposal Sent": "proposal sent",
  "Verbal Agreement": "verbal agreement",
  Won: "won",
  Lost: "lost",
  "Post Meeting Lost": "post_meeting_lost",
  Disqualified: "not closed", // UI labels "not closed" as "Unqualified"
};

// Pull one Deal record straight from Airtable (source of truth).
export async function fetchDeal(recordId: string) {
  const key = process.env.AIRTABLE_API_KEY;
  if (!key) throw new Error("AIRTABLE_API_KEY not set");
  const res = await fetch(
    `https://api.airtable.com/v0/${BASE_ID}/${DEALS_TABLE_ID}/${recordId}`,
    { headers: { Authorization: `Bearer ${key}` }, cache: "no-store" }
  );
  if (!res.ok) {
    throw new Error(`Airtable fetch ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  return (await res.json()) as { id: string; fields: Record<string, unknown> };
}

// Airtable lookup fields come back as arrays; scalar fields as-is.
export function first(v: unknown): string | null {
  if (Array.isArray(v)) return v.length ? String(v[0]) : null;
  if (v === undefined || v === null || v === "") return null;
  return String(v);
}

// Supabase lead_status → Airtable "Pipeline stage" single-select option name.
// These MUST match the Airtable choice names exactly or the PATCH is rejected.
const STATUS_TO_STAGE: Record<LeadStatus, string> = {
  "meeting booked": "Meeting Booked",
  rescheduled: "Rescheduled",
  show: "Show",
  "no show": "No Show",
  "not closed": "Disqualified", // UI labels this "Unqualified"; closest AT stage
  "next stage": "Next Stage",
  "proposal sent": "Proposal Sent",
  "verbal agreement": "Verbal Agreement",
  won: "Won",
  lost: "Lost",
  post_meeting_lost: "Post Meeting Lost",
};

export type AirtableWriteResult =
  | { ok: true }
  | { ok: false; error: string };

export async function updateDealStage(
  airtableRecordId: string,
  status: LeadStatus
): Promise<AirtableWriteResult> {
  const key = process.env.AIRTABLE_API_KEY;
  if (!key) return { ok: false, error: "AIRTABLE_API_KEY not set" };

  const stage = STATUS_TO_STAGE[status];
  if (!stage) return { ok: false, error: `No Airtable stage mapped for "${status}"` };

  const res = await fetch(
    `https://api.airtable.com/v0/${BASE_ID}/${DEALS_TABLE_ID}/${airtableRecordId}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ fields: { [STAGE_FIELD]: stage } }),
    }
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return { ok: false, error: `Airtable ${res.status}: ${text.slice(0, 200)}` };
  }
  return { ok: true };
}
