"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { updateDealStage, updateDealNotes } from "@/lib/airtable";
import { syncCurrentMonth, type MonthSyncSummary } from "@/lib/sync";
import { getActiveTenant } from "@/lib/active-tenant";
import { LeadStatus } from "@/lib/types";

export type SyncMonthResult =
  | { ok: true; summary: MonthSyncSummary }
  | { ok: false; error: string };

// "Sync deals" button — pulls the active client's deals for the month being
// viewed (defaults to the current month) from Airtable and upserts them.
export async function syncActiveClientMonth(
  yyyymm?: string
): Promise<SyncMonthResult> {
  const active = await getActiveTenant();
  if (!active) return { ok: false, error: "Not authenticated." };
  if (!active.clientId) return { ok: false, error: "No client selected." };
  try {
    const summary = await syncCurrentMonth(active.clientId, yyyymm);
    revalidatePath("/dashboard/month");
    revalidatePath("/dashboard");
    return { ok: true, summary };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export type PushStageResult =
  | { ok: true }
  | { ok: false; error: string };

// Called after a dashboard status change is written to Supabase. Mirrors the
// new status back to the deal's Airtable "Pipeline stage" so Airtable stays the
// source of truth. Best-effort: the Supabase write already succeeded, so a
// failure here is surfaced but does not roll anything back.
export async function pushDealStage(
  leadId: string,
  status: LeadStatus,
  // The status the lead held before this change. Supplied by the caller because
  // the dashboard writes Supabase first, so the stored row already holds the new
  // status by the time we get here. Only affects which DQ stage is written.
  previousStatus?: LeadStatus | null
): Promise<PushStageResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated." };

  // Look the record id up server-side (don't trust the client for it). RLS
  // ensures the caller can only read leads they have access to.
  const { data: lead, error } = await supabase
    .from("leads")
    .select("airtable_record_id")
    .eq("id", leadId)
    .single();

  if (error) return { ok: false, error: error.message };
  if (!lead?.airtable_record_id) {
    return { ok: false, error: "Lead has no airtable_record_id — nothing to sync." };
  }

  return updateDealStage(lead.airtable_record_id, status, previousStatus);
}

// Set a lead's status AND its disqualification reason in one call. Used when a
// negative status is chosen: the reason is mandatory, so both must land together
// rather than leaving a disqualification in Airtable with no explanation.
export async function pushDealStatusWithReason(
  leadId: string,
  status: LeadStatus,
  reason: string,
  previousStatus?: LeadStatus | null
): Promise<PushStageResult> {
  const trimmed = reason.trim();
  if (!trimmed) return { ok: false, error: "A reason is required." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated." };

  const { data: lead, error } = await supabase
    .from("leads")
    .select("airtable_record_id")
    .eq("id", leadId)
    .single();
  if (error) return { ok: false, error: error.message };
  if (!lead?.airtable_record_id) {
    return { ok: false, error: "Lead has no airtable_record_id — nothing to sync." };
  }

  const stage = await updateDealStage(lead.airtable_record_id, status, previousStatus);
  if (!stage.ok) return stage;
  return updateDealNotes(lead.airtable_record_id, { dq_reason: trimmed });
}

// Mirror dashboard-edited notes / recording link back to Airtable so the next
// sync (which pulls Notes + Recordings) doesn't overwrite them.
export async function pushDealNotes(
  leadId: string,
  fields: { notes?: string | null; call_recording_url?: string | null }
): Promise<PushStageResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated." };

  const { data: lead, error } = await supabase
    .from("leads")
    .select("airtable_record_id")
    .eq("id", leadId)
    .single();

  if (error) return { ok: false, error: error.message };
  if (!lead?.airtable_record_id) {
    return { ok: false, error: "Lead has no airtable_record_id — nothing to sync." };
  }

  return updateDealNotes(lead.airtable_record_id, fields);
}
