import { cookies } from "next/headers";
import { createClient } from "./supabase/server";

const COOKIE = "active_tenant_id";

export type ActiveTenant = {
  clientId: string | null;
  name: string;
  isAdmin: boolean;
  allTenants: { id: string; name: string; slug: string }[];
};

export async function getActiveTenant(): Promise<ActiveTenant | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: me } = await supabase
    .from("client_users")
    .select("role, client_id, clients(id, name, slug)")
    .eq("user_id", user.id)
    .single();

  const isAdmin = me?.role === "admin";

  if (!isAdmin) {
    const c = (Array.isArray(me?.clients) ? me?.clients[0] : me?.clients) as
      | { id: string; name: string; slug: string }
      | null;
    return {
      clientId: c?.id ?? null,
      name: c?.name ?? "—",
      isAdmin: false,
      allTenants: [],
    };
  }

  // Admin: fetch all tenants
  const { data: allTenants } = await supabase
    .from("clients")
    .select("id, name, slug")
    .eq("active", true)
    .order("name");

  const tenants = allTenants ?? [];

  // Pick from cookie, fall back to first tenant
  const cookieStore = await cookies();
  const cookieId = cookieStore.get(COOKIE)?.value;
  const picked = cookieId ? tenants.find((t) => t.id === cookieId) ?? null : null;
  const active = picked ?? tenants[0] ?? null;

  return {
    clientId: active?.id ?? null,
    name: active?.name ?? "Pick a tenant",
    isAdmin: true,
    allTenants: tenants,
  };
}

export const ACTIVE_TENANT_COOKIE = COOKIE;
