import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AdminTabs from "./admin-tabs";
import InviteForm from "./invite-form";
import MembersList from "./members-list";
import TenantsTable from "./tenants-table";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const active = (tab as "tenants" | "members" | "invite") ?? "tenants";

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: me } = await supabase
    .from("client_users")
    .select("role")
    .eq("user_id", user.id)
    .single();

  if (me?.role !== "admin") {
    return (
      <div className="card p-12 text-center">
        <h2 className="text-xl font-semibold text-[var(--ink)]">Not authorized</h2>
        <p className="text-sm text-[var(--muted)] mt-1">This page is admin-only.</p>
      </div>
    );
  }

  const [{ data: clients }, { data: members }] = await Promise.all([
    supabase
      .from("clients")
      .select("id, name, slug, kpi_target_meetings, default_deal_size_monthly, default_deal_size_annual, active")
      .order("name"),
    supabase
      .from("client_users")
      .select("user_id, email, role, client_id, clients(name)")
      .order("email"),
  ]);

  return (
    <div className="space-y-6 rise">
      <div>
        <div className="text-[11px] uppercase tracking-[0.22em] text-[var(--muted)] mb-2">
          Admin
        </div>
        <h1 className="text-[32px] leading-[1.1] font-semibold tracking-tight text-[var(--ink)]">
          Workspace settings
        </h1>
        <p className="text-[14px] text-[var(--muted)] mt-1.5">
          Manage tenants, members, and invites.
        </p>
      </div>

      <AdminTabs active={active} />

      {active === "tenants" && <TenantsTable clients={clients ?? []} />}

      {active === "members" && (
        <MembersList
          members={(members ?? []).map((m) => ({
            user_id: m.user_id,
            email: m.email,
            role: m.role,
            client_name:
              (Array.isArray(m.clients) ? m.clients[0]?.name : (m.clients as { name?: string } | null)?.name) ?? "—",
          }))}
        />
      )}

      {active === "invite" && <InviteForm clients={(clients ?? []).map((c) => ({ id: c.id, name: c.name, slug: c.slug }))} />}
    </div>
  );
}
