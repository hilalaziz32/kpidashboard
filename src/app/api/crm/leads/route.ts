import { NextRequest, NextResponse } from "next/server";
import { authorizeWrite, db, jsonError, validateLeadPatch } from "@/lib/crm-write";

export const dynamic = "force-dynamic";

// POST /api/crm/leads — create a lead directly in the dashboard.
// Body: { client, status, full_name, ... }  where `client` is a slug/name/uuid.
//
// Note: a lead created here exists only in the dashboard — it has no Airtable
// deal behind it, so the sync will never update it. Prefer creating the deal in
// Airtable and letting it sync; use this for one-offs the sync can't cover.
export async function POST(req: NextRequest) {
  const denied = authorizeWrite(req);
  if (denied) return denied;

  try {
    const body = (await req.json()) as Record<string, unknown>;
    const clientRef = body.client ?? body.client_id;
    if (!clientRef) {
      return NextResponse.json(
        { error: "client is required (slug, name or uuid)" },
        { status: 400 }
      );
    }
    delete body.client;
    delete body.client_id;

    const category = (body.category as string) ?? "meeting";
    delete body.category;
    if (!["meeting", "pr"].includes(category)) {
      return NextResponse.json({ error: "category must be 'meeting' or 'pr'" }, { status: 400 });
    }

    const airtableRecordId = (body.airtable_record_id as string) ?? null;
    delete body.airtable_record_id;

    if (!body.status) body.status = "meeting booked";
    const v = validateLeadPatch(body);
    if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });

    // Resolve the client reference.
    const { data: clients } = await db().from("clients").select("id, name, slug");
    const ref = String(clientRef).toLowerCase();
    const client = (clients ?? []).find(
      (c) => c.id === clientRef || c.slug?.toLowerCase() === ref || c.name?.toLowerCase() === ref
    );
    if (!client) {
      return NextResponse.json({ error: `Unknown client: ${clientRef}` }, { status: 400 });
    }

    const row = {
      ...v.patch,
      client_id: client.id,
      category,
      airtable_record_id: airtableRecordId,
      created_date: v.patch.created_date ?? new Date().toISOString(),
    };

    const { data, error } = await db().from("leads").insert(row).select("*").single();
    if (error) {
      const hint =
        error.code === "23505"
          ? " — a lead with this email already exists for this client (leads are unique per client+email)"
          : "";
      return NextResponse.json({ error: error.message + hint }, { status: 400 });
    }

    return NextResponse.json({ ok: true, client: client.name, lead: data }, { status: 201 });
  } catch (e) {
    return jsonError(e);
  }
}
