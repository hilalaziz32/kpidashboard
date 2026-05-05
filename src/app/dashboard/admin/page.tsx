import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import InviteForm from "./invite-form";
import MembersList from "./members-list";

export default async function AdminPage() {
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

  const { data: clients } = await supabase
    .from("clients")
    .select("id, name, slug")
    .order("name");

  const { data: members } = await supabase
    .from("client_users")
    .select("user_id, email, role, client_id, clients(name)")
    .order("email");

  return (
    <div className="space-y-8 rise">
      <div>
        <div className="text-[11px] uppercase tracking-[0.22em] text-[var(--muted)] mb-2">
          Admin
        </div>
        <h1 className="text-[32px] leading-[1.1] font-semibold tracking-tight text-[var(--ink)]">
          Tenant access
        </h1>
        <p className="text-[14px] text-[var(--muted)] mt-1.5">
          Invite users and assign them to a tenant.
        </p>
      </div>

      <InviteForm clients={clients ?? []} />

      <MembersList
        members={(members ?? []).map((m) => ({
          user_id: m.user_id,
          email: m.email,
          role: m.role,
          client_name:
            (Array.isArray(m.clients) ? m.clients[0]?.name : (m.clients as { name?: string } | null)?.name) ?? "—",
        }))}
      />
    </div>
  );
}
