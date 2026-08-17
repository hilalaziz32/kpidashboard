import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { updateDealStage, updateDealNotes } from "@/lib/airtable";
import { LEAD_STATUSES, LeadStatus } from "@/lib/types";

// Write plumbing for /api/crm/*. Kept separate from the read-only insights API
// so the read token can be shared freely without granting write access.

// Same token as the read API — one credential for both, by design. Note this
// means anyone holding it can edit, not just read.
export function authorizeWrite(req: NextRequest): NextResponse | null {
  const expected = process.env.INSIGHTS_TOKEN || process.env.SYNC_SECRET;
  if (!expected) {
    return NextResponse.json(
      { error: "INSIGHTS_TOKEN not configured on the server" },
      { status: 500 }
    );
  }
  const header = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const qs = req.nextUrl.searchParams.get("token");
  if (header !== expected && qs !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return null;
}

export const db = createAdminClient;

// Fields an agent may set on a lead. Anything else in the body is rejected so a
// typo can't silently no-op, and so identity columns (id, client_id,
// airtable_record_id) can't be rewritten into another tenant.
const NUMERIC = [
  "upfront_collected",
  "mrr_collected",
  "deal_size_monthly",
  "deal_size_annual",
] as const;
const TEXT = ["notes", "call_recording_url", "full_name", "company_name", "email", "phone", "website"] as const;
const DATE = ["date_of_meeting", "call_scheduled_for", "created_date"] as const;

export const EDITABLE = ["status", ...NUMERIC, ...TEXT, ...DATE] as const;

export type ValidationResult =
  | { ok: true; patch: Record<string, unknown> }
  | { ok: false; error: string };

export function validateLeadPatch(body: Record<string, unknown>): ValidationResult {
  const patch: Record<string, unknown> = {};
  const unknown: string[] = [];

  for (const [k, v] of Object.entries(body)) {
    if (!(EDITABLE as readonly string[]).includes(k)) {
      unknown.push(k);
      continue;
    }
    if (k === "status") {
      if (!LEAD_STATUSES.includes(v as LeadStatus)) {
        return {
          ok: false,
          error: `Invalid status "${v}". Valid: ${LEAD_STATUSES.join(", ")}`,
        };
      }
      patch[k] = v;
    } else if ((NUMERIC as readonly string[]).includes(k)) {
      if (v === null) patch[k] = null;
      else if (typeof v === "number" && Number.isFinite(v)) patch[k] = v;
      else return { ok: false, error: `${k} must be a number or null` };
    } else {
      patch[k] = v === "" ? null : v;
    }
  }

  if (unknown.length) {
    return {
      ok: false,
      error: `Not editable: ${unknown.join(", ")}. Editable fields: ${EDITABLE.join(", ")}`,
    };
  }
  if (!Object.keys(patch).length) return { ok: false, error: "No editable fields supplied" };
  return { ok: true, patch };
}

// Mirror the parts of a patch that Airtable also owns. Without this the next
// sync would pull Airtable's older values straight back over the edit.
export async function mirrorToAirtable(
  airtableRecordId: string | null,
  patch: Record<string, unknown>
): Promise<{ mirrored: string[]; airtableError?: string }> {
  if (!airtableRecordId) return { mirrored: [] };
  const mirrored: string[] = [];
  let airtableError: string | undefined;

  if (patch.status) {
    const r = await updateDealStage(airtableRecordId, patch.status as LeadStatus);
    if (r.ok) mirrored.push("Pipeline stage");
    else airtableError = r.error;
  }
  if ("notes" in patch || "call_recording_url" in patch) {
    const r = await updateDealNotes(airtableRecordId, {
      ...("notes" in patch ? { notes: patch.notes as string | null } : {}),
      ...("call_recording_url" in patch
        ? { call_recording_url: patch.call_recording_url as string | null }
        : {}),
    });
    if (r.ok) mirrored.push(...Object.keys(patch).filter((k) => k === "notes" || k === "call_recording_url"));
    else airtableError = r.error;
  }
  return { mirrored, airtableError };
}

export function jsonError(e: unknown, status = 500) {
  return NextResponse.json({ error: (e as Error).message }, { status });
}
