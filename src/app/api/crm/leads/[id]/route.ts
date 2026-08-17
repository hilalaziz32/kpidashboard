import { NextRequest, NextResponse } from "next/server";
import {
  authorizeWrite,
  db,
  jsonError,
  mirrorToAirtable,
  validateLeadPatch,
} from "@/lib/crm-write";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

// GET /api/crm/leads/:id — read one lead (handy before editing it).
export async function GET(req: NextRequest, ctx: Ctx) {
  const denied = authorizeWrite(req);
  if (denied) return denied;
  const { id } = await ctx.params;
  const { data, error } = await db().from("leads").select("*, clients(name)").eq("id", id).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json({ lead: data });
}

// PATCH /api/crm/leads/:id — update a lead. Status/notes/recording are mirrored
// back to Airtable so the next sync doesn't overwrite the change.
export async function PATCH(req: NextRequest, ctx: Ctx) {
  const denied = authorizeWrite(req);
  if (denied) return denied;

  try {
    const { id } = await ctx.params;
    const body = (await req.json()) as Record<string, unknown>;
    const v = validateLeadPatch(body);
    if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });

    const { data: before, error: findErr } = await db()
      .from("leads")
      .select("id, airtable_record_id")
      .eq("id", id)
      .single();
    if (findErr) return NextResponse.json({ error: `Lead not found: ${id}` }, { status: 404 });

    const { data, error } = await db()
      .from("leads")
      .update(v.patch)
      .eq("id", id)
      .select("*")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    const { mirrored, airtableError } = await mirrorToAirtable(
      before.airtable_record_id,
      v.patch
    );

    return NextResponse.json({
      ok: true,
      updated: Object.keys(v.patch),
      mirroredToAirtable: mirrored,
      ...(airtableError ? { airtableWarning: airtableError } : {}),
      lead: data,
    });
  } catch (e) {
    return jsonError(e);
  }
}

// DELETE /api/crm/leads/:id?confirm=true — permanent. The confirm flag exists so
// a mistyped call can't quietly destroy a row.
export async function DELETE(req: NextRequest, ctx: Ctx) {
  const denied = authorizeWrite(req);
  if (denied) return denied;

  const { id } = await ctx.params;
  if (req.nextUrl.searchParams.get("confirm") !== "true") {
    return NextResponse.json(
      { error: "Deletion is permanent — repeat the call with ?confirm=true" },
      { status: 400 }
    );
  }

  const { data, error } = await db().from("leads").delete().eq("id", id).select("full_name, company_name");
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (!data?.length) return NextResponse.json({ error: `Lead not found: ${id}` }, { status: 404 });

  return NextResponse.json({ ok: true, deleted: data[0] });
}
