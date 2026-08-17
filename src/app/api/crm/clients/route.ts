import { NextRequest, NextResponse } from "next/server";
import { authorizeWrite, db, jsonError } from "@/lib/crm-write";
import { linkClientDashboardId } from "@/lib/airtable";

export const dynamic = "force-dynamic";

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

// POST /api/crm/clients — create a client and link it back to Airtable.
// Body: { name, slug?, kpi_target_meetings?, active? }
//
// The Airtable link matters: Deals route to a dashboard tenant via the Clients
// table's DashboardID, so without it the new client's deals never sync.
export async function POST(req: NextRequest) {
  const denied = authorizeWrite(req);
  if (denied) return denied;

  try {
    const body = (await req.json()) as Record<string, unknown>;
    const name = String(body.name ?? "").trim();
    if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });

    const slug = slugify(String(body.slug ?? name));
    const target = Number(body.kpi_target_meetings ?? 0) || 0;

    const { data, error } = await db()
      .from("clients")
      .insert({
        name,
        slug,
        kpi_target_meetings: target,
        active: body.active === undefined ? true : Boolean(body.active),
      })
      .select("*")
      .single();

    if (error) {
      const hint = error.code === "23505" ? ` — slug "${slug}" is already taken` : "";
      return NextResponse.json({ error: error.message + hint }, { status: 400 });
    }

    const link = await linkClientDashboardId(data.name, data.id);

    return NextResponse.json(
      {
        ok: true,
        client: data,
        airtableLinked: link.ok,
        ...(link.ok
          ? { airtableRecordId: link.recordId }
          : {
              airtableWarning:
                `${link.error}. Paste ${data.id} into this client's DashboardID in Airtable, or its deals will not sync.`,
            }),
      },
      { status: 201 }
    );
  } catch (e) {
    return jsonError(e);
  }
}
