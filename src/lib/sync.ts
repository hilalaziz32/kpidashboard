import { createAdminClient } from "@/lib/supabase/admin";
import {
  BASE_ID,
  DEALS_TABLE_ID,
  fetchDeal,
  first,
  STAGE_TO_STATUS,
} from "@/lib/airtable";

// Shared Airtable Deals → Supabase leads sync logic, used by:
//  - /api/sync-deal   (single row, triggered by n8n on change)
//  - the "Sync deals" button (one client, current month)
//  - /api/sync-cron   (all active clients, current month, every 3h)

export type SyncOutcome = {
  recordId: string;
  status: "upserted" | "skipped" | "error";
  reason?: string;
  leadStatus?: string;
};

type Deal = { id: string; fields: Record<string, unknown> };

// Map one Airtable Deal to a leads row. Returns a skip reason instead of a row
// when the deal isn't a syncable meeting (pre-meeting stage or no client link).
export function mapDealToRow(
  deal: Deal
): { row: Record<string, unknown>; leadStatus: string } | { skip: string } {
  const f = deal.fields;
  const stage = first(f["Pipeline stage"]);
  const leadStatus = stage ? STAGE_TO_STATUS[stage] : undefined;
  if (!leadStatus) return { skip: `stage "${stage}" not synced` };

  const clientId = first(f["DashboardID (from Pipeline)"]);
  if (!clientId) return { skip: "no client DashboardID on deal" };

  return {
    leadStatus,
    row: {
      client_id: clientId,
      airtable_record_id: deal.id,
      category: "meeting" as const,
      status: leadStatus,
      full_name: first(f["Opportunity"]),
      email: first(f["Email"]),
      company_name: first(f["Company Name"]),
      website: first(f["Website"]),
      phone: first(f["Mobile phone #"]),
      created_date: first(f["Date created"]),
      date_of_meeting: first(f["Date of Meeting Booked"]),
      call_scheduled_for: first(f["Call Schedule For (Date)"]),
      conversation_history: first(f["Email conversation"]),
      campaign_name: first(f["campaignname"]),
      // Post-meeting fields. Airtable is the source of truth: notes/recordings
      // typed in the dashboard are written back to Airtable (see lead-actions),
      // so pulling them here keeps both sides identical rather than clobbering.
      // Keys are always present — PostgREST bulk upsert requires every object
      // in the payload to have the same keys.
      notes: first(f["Notes"]),
      call_recording_url: first(f["Recordings"]),
    },
  };
}

async function upsertRows(rows: Record<string, unknown>[]) {
  if (!rows.length) return { error: null };
  const admin = createAdminClient();
  return admin
    .from("leads")
    .upsert(rows, { onConflict: "client_id,airtable_record_id" });
}

// Bulk upsert, falling back to row-by-row if the batch fails, so one problem
// row can't abort the whole sync.
//
// Leads are unique per (client_id, email): the same person may appear under two
// different clients, but only once within a client. Airtable sometimes holds
// two Deals for the same person under one client (re-entered later). When that
// happens the insert trips leads_client_email_uniq, so we merge the incoming
// deal into the existing lead — repointing airtable_record_id at the newer
// record — instead of failing.
async function upsertResilient(
  rows: Record<string, unknown>[]
): Promise<{ upserted: number; merged: number; failed: { id: string; reason: string }[] }> {
  if (!rows.length) return { upserted: 0, merged: 0, failed: [] };

  const { error } = await upsertRows(rows);
  if (!error) return { upserted: rows.length, merged: 0, failed: [] };

  const admin = createAdminClient();
  const failed: { id: string; reason: string }[] = [];
  let upserted = 0;
  let merged = 0;

  for (const row of rows) {
    const { error: rowErr } = await upsertRows([row]);
    if (!rowErr) {
      upserted++;
      continue;
    }

    const isEmailClash =
      rowErr.code === "23505" && rowErr.message.includes("leads_client_email_uniq");
    if (isEmailClash && row.email) {
      const { error: mergeErr } = await admin
        .from("leads")
        .update(row)
        .eq("client_id", row.client_id as string)
        .eq("email", row.email as string);
      if (!mergeErr) {
        merged++;
        continue;
      }
      failed.push({ id: String(row.airtable_record_id ?? "?"), reason: mergeErr.message });
      continue;
    }

    failed.push({ id: String(row.airtable_record_id ?? "?"), reason: rowErr.message });
  }
  return { upserted, merged, failed };
}

// --- Single-record path (n8n webhook) ------------------------------------
export async function syncRecordIds(ids: string[]): Promise<SyncOutcome[]> {
  const out: SyncOutcome[] = [];
  for (const id of ids) {
    let deal: Deal;
    try {
      deal = await fetchDeal(id);
    } catch (e) {
      out.push({ recordId: id, status: "error", reason: (e as Error).message });
      continue;
    }
    const mapped = mapDealToRow(deal);
    if ("skip" in mapped) {
      out.push({ recordId: id, status: "skipped", reason: mapped.skip });
      continue;
    }
    const { error } = await upsertRows([mapped.row]);
    out.push(
      error
        ? { recordId: id, status: "error", reason: error.message }
        : { recordId: id, status: "upserted", leadStatus: mapped.leadStatus }
    );
  }
  return out;
}

// --- Current-month bulk path (button + cron) ------------------------------

// "Current month" in Pacific time, since Airtable "Date created" is stored in
// America/Los_Angeles. Returns e.g. "2026-07".
export function currentMonthPT(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
  }).format(now); // "2026-07"
  return parts;
}

async function fetchDealsCreatedInMonth(yyyymm: string): Promise<Deal[]> {
  const key = process.env.AIRTABLE_API_KEY;
  if (!key) throw new Error("AIRTABLE_API_KEY not set");
  // Match on EITHER date: a deal created last month can have its meeting this
  // month (and vice versa). The dashboard's monthly view filters by
  // date_of_meeting, so matching only "Date created" would miss rows that are
  // visible on screen.
  // The IF() guard matters: DATETIME_FORMAT on a blank date errors, and an
  // error inside OR() drops the record entirely — silently losing rows.
  const inMonth = (field: string) =>
    `IF({${field}},DATETIME_FORMAT(SET_TIMEZONE({${field}},'America/Los_Angeles'),'YYYY-MM')='${yyyymm}',FALSE())`;
  const formula = `OR(${inMonth("Date created")},${inMonth("Date of Meeting Booked")})`;

  const deals: Deal[] = [];
  let offset: string | undefined;
  do {
    const url = new URL(`https://api.airtable.com/v0/${BASE_ID}/${DEALS_TABLE_ID}`);
    url.searchParams.set("filterByFormula", formula);
    url.searchParams.set("pageSize", "100");
    if (offset) url.searchParams.set("offset", offset);
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${key}` },
      cache: "no-store",
    });
    if (!res.ok) {
      throw new Error(`Airtable list ${res.status}: ${(await res.text()).slice(0, 200)}`);
    }
    const json = (await res.json()) as { records: Deal[]; offset?: string };
    deals.push(...json.records);
    offset = json.offset;
  } while (offset);
  return deals;
}

export type MonthSyncSummary = {
  month: string;
  fetched: number;
  upserted: number;
  skipped: number;
  merged?: number;
  failed?: { id: string; reason: string }[];
  clientId?: string;
};

// Sync one month's deals. Pass a clientId to limit to one tenant (the button);
// omit it to sync every client (the cron). `yyyymm` defaults to the current
// month — the button passes the month currently being viewed.
export async function syncCurrentMonth(
  clientId?: string,
  yyyymm?: string
): Promise<MonthSyncSummary> {
  const month = yyyymm ?? currentMonthPT();
  const deals = await fetchDealsCreatedInMonth(month);

  const rows: Record<string, unknown>[] = [];
  let skipped = 0;
  for (const d of deals) {
    const mapped = mapDealToRow(d);
    if ("skip" in mapped) {
      skipped++;
      continue;
    }
    if (clientId && mapped.row.client_id !== clientId) continue;
    rows.push(mapped.row);
  }

  const { upserted, merged, failed } = await upsertResilient(rows);

  return {
    month,
    fetched: deals.length,
    upserted,
    skipped,
    clientId,
    ...(merged ? { merged } : {}),
    ...(failed.length ? { failed } : {}),
  };
}
