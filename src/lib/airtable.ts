import { LeadStatus } from "./types";

// SERVER-ONLY. Never import into a client component — it uses the Airtable
// secret. Used to write dashboard status changes back to the Airtable Deals
// table so Airtable stays the source of truth (and n8n won't clobber edits).

export const BASE_ID = "appgezzL6Uqr0xgBa";
export const DEALS_TABLE_ID = "tblpcwgO0EguL7K98";
// The Clients table — note there are several client-ish tables in the base;
// this is the one whose DashboardID drives the sync (Deals link to it).
export const CLIENTS_TABLE_ID = "tbl2yIyegDzYARc5X";
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
  // "Future Potential" is a POST-meeting outcome: the call happened and the lead
  // is worth revisiting. Airtable's older "Future Qualified" is a pre-meeting
  // stage, so it is deliberately not synced (like "Maybe" / "Positive Reply").
  "Future Potential": "future",
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
  future: "Future Potential",
};

export type AirtableWriteResult =
  | { ok: true }
  | { ok: false; error: string };

// Patch arbitrary fields on a Deal.
async function patchDeal(
  airtableRecordId: string,
  fields: Record<string, unknown>
): Promise<AirtableWriteResult> {
  const key = process.env.AIRTABLE_API_KEY;
  if (!key) return { ok: false, error: "AIRTABLE_API_KEY not set" };
  if (!Object.keys(fields).length) return { ok: true };

  const res = await fetch(
    `https://api.airtable.com/v0/${BASE_ID}/${DEALS_TABLE_ID}/${airtableRecordId}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ fields }),
    }
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return { ok: false, error: `Airtable ${res.status}: ${text.slice(0, 200)}` };
  }
  return { ok: true };
}

export async function updateDealStage(
  airtableRecordId: string,
  status: LeadStatus
): Promise<AirtableWriteResult> {
  const stage = STATUS_TO_STAGE[status];
  if (!stage) return { ok: false, error: `No Airtable stage mapped for "${status}"` };
  return patchDeal(airtableRecordId, { [STAGE_FIELD]: stage });
}

// Write a newly-created Supabase client id into the matching Airtable Clients
// record's DashboardID. That field is what links Deals to a dashboard tenant —
// without it, a client's deals never sync. Matched on exact "Client Name".
export async function linkClientDashboardId(
  clientName: string,
  uuid: string
): Promise<AirtableWriteResult & { recordId?: string }> {
  const key = process.env.AIRTABLE_API_KEY;
  if (!key) return { ok: false, error: "AIRTABLE_API_KEY not set" };

  const escaped = clientName.replace(/'/g, "\\'");
  const url = new URL(`https://api.airtable.com/v0/${BASE_ID}/${CLIENTS_TABLE_ID}`);
  url.searchParams.set("filterByFormula", `{Client Name}='${escaped}'`);
  url.searchParams.set("maxRecords", "1");

  const findRes = await fetch(url, {
    headers: { Authorization: `Bearer ${key}` },
    cache: "no-store",
  });
  if (!findRes.ok) {
    return { ok: false, error: `Airtable lookup ${findRes.status}` };
  }
  const found = (await findRes.json()) as { records?: { id: string }[] };
  const recordId = found.records?.[0]?.id;
  if (!recordId) {
    return { ok: false, error: `No Airtable client named "${clientName}"` };
  }

  const res = await fetch(
    `https://api.airtable.com/v0/${BASE_ID}/${CLIENTS_TABLE_ID}/${recordId}`,
    {
      method: "PATCH",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ fields: { DashboardID: uuid } }),
    }
  );
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return { ok: false, error: `Airtable ${res.status}: ${text.slice(0, 200)}` };
  }
  return { ok: true, recordId };
}

// Mirror dashboard-edited post-meeting fields back to Airtable, so the sync
// (which pulls Notes/Recordings) never overwrites what a client typed here.
export async function updateDealNotes(
  airtableRecordId: string,
  fields: {
    notes?: string | null;
    call_recording_url?: string | null;
    closed_date?: string | null;
  }
): Promise<AirtableWriteResult> {
  const patch: Record<string, unknown> = {};
  if (fields.closed_date !== undefined) patch["Closed date"] = fields.closed_date ?? null;
  if (fields.notes !== undefined) patch["Notes"] = fields.notes ?? "";
  // Recording links live in "Meeting URL" — must match what the sync reads,
  // or a write-back would be invisible and then overwritten on the next pull.
  if (fields.call_recording_url !== undefined)
    patch["Meeting URL"] = fields.call_recording_url ?? "";
  return patchDeal(airtableRecordId, patch);
}
