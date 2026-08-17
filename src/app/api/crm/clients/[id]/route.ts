import { NextRequest, NextResponse } from "next/server";
import { authorizeWrite, db, jsonError } from "@/lib/crm-write";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

const EDITABLE = [
  "name",
  "slug",
  "kpi_target_meetings",
  "default_deal_size_monthly",
  "default_deal_size_annual",
  "active",
] as const;

// PATCH /api/crm/clients/:id — :id accepts a uuid, slug or name.
// Body may set: name, slug, kpi_target_meetings, default_deal_size_monthly,
// default_deal_size_annual, active.
export async function PATCH(req: NextRequest, ctx: Ctx) {
  const denied = authorizeWrite(req);
  if (denied) return denied;

  try {
    const { id } = await ctx.params;
    const body = (await req.json()) as Record<string, unknown>;

    const patch: Record<string, unknown> = {};
    const unknown: string[] = [];
    for (const [k, v] of Object.entries(body)) {
      if (!(EDITABLE as readonly string[]).includes(k)) {
        unknown.push(k);
        continue;
      }
      if (k === "kpi_target_meetings") {
        const n = Number(v);
        if (!Number.isFinite(n) || n < 0) {
          return NextResponse.json({ error: "kpi_target_meetings must be a non-negative number" }, { status: 400 });
        }
        patch[k] = Math.round(n);
      } else if (k === "active") {
        patch[k] = Boolean(v);
      } else if (k.startsWith("default_deal_size")) {
        patch[k] = v === null || v === "" ? null : Number(v);
      } else {
        patch[k] = v;
      }
    }
    if (unknown.length) {
      return NextResponse.json(
        { error: `Not editable: ${unknown.join(", ")}. Editable: ${EDITABLE.join(", ")}` },
        { status: 400 }
      );
    }
    if (!Object.keys(patch).length) {
      return NextResponse.json({ error: "No editable fields supplied" }, { status: 400 });
    }

    // Accept uuid, slug or name for convenience.
    const { data: clients } = await db().from("clients").select("id, name, slug");
    const ref = id.toLowerCase();
    const client = (clients ?? []).find(
      (c) => c.id === id || c.slug?.toLowerCase() === ref || c.name?.toLowerCase() === ref
    );
    if (!client) return NextResponse.json({ error: `Unknown client: ${id}` }, { status: 404 });

    const { data, error } = await db()
      .from("clients")
      .update(patch)
      .eq("id", client.id)
      .select("*")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({
      ok: true,
      updated: Object.keys(patch),
      client: data,
      note: "kpi_target_meetings is dashboard-only — update Airtable's 'KPI - Qualified Showed Meetings' too if it should match.",
    });
  } catch (e) {
    return jsonError(e);
  }
}
