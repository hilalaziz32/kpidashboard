"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { linkClientDashboardId } from "@/lib/airtable";

export type CreateTenantResult =
  | {
      ok: true;
      id: string;
      name: string;
      slug: string;
      // Whether the id was written into Airtable's Clients.DashboardID.
      linked: boolean;
      linkError?: string;
    }
  | { ok: false; error: string };

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function createTenant(formData: FormData): Promise<CreateTenantResult> {
  const name = String(formData.get("name") ?? "").trim();
  const slugRaw = String(formData.get("slug") ?? "").trim();
  const target = Number(formData.get("kpi_target_meetings") ?? 0) || 0;

  if (!name) return { ok: false, error: "Name is required." };
  const slug = slugify(slugRaw || name);
  if (!slug) return { ok: false, error: "Could not derive a valid slug." };

  // Re-verify the caller is an admin using their own session (NOT the service
  // role) so this action can't be used to escalate privileges.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated." };

  const { data: me } = await supabase
    .from("client_users")
    .select("role")
    .eq("user_id", user.id)
    .single();
  if (me?.role !== "admin") return { ok: false, error: "Admin only." };

  // Privileged insert via service role (bypasses RLS).
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("clients")
    .insert({ name, slug, kpi_target_meetings: target, active: true })
    .select("id, name, slug")
    .single();

  if (error) {
    const msg =
      error.code === "23505"
        ? `Slug "${slug}" is already taken.`
        : error.message;
    return { ok: false, error: msg };
  }

  // Push the new id into Airtable so this client's deals start syncing. The
  // tenant already exists at this point, so a link failure is reported rather
  // than treated as a failed creation.
  const link = await linkClientDashboardId(data.name, data.id);

  revalidatePath("/dashboard/admin");
  return {
    ok: true,
    id: data.id,
    name: data.name,
    slug: data.slug,
    linked: link.ok,
    ...(link.ok ? {} : { linkError: link.error }),
  };
}
