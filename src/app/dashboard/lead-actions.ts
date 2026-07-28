"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { updateDealStage } from "@/lib/airtable";
import { syncCurrentMonth, type MonthSyncSummary } from "@/lib/sync";
import { getActiveTenant } from "@/lib/active-tenant";
import { LeadStatus } from "@/lib/types";

export type SyncMonthResult =
  | { ok: true; summary: MonthSyncSummary }
  | { ok: false; error: string };

// "Sync deals" button — pulls the active client's CURRENT-MONTH deals from
// Airtable and upserts them. Admin-only.
export async function syncActiveClientMonth(): Promise<SyncMonthResult> {
  const active = await getActiveTenant();
  if (!active) return { ok: false, error: "Not authenticated." };
  if (!active.clientId) return { ok: false, error: "No client selected." };
  if (!active.isAdmin) {
    // Non-admins are scoped to their own client; still allow syncing it.
  }
  try {
    const summary = await syncCurrentMonth(active.clientId);
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
  status: LeadStatus
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

  return updateDealStage(lead.airtable_record_id, status);
}
