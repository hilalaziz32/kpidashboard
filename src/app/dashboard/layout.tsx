import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Sidebar from "./sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: me } = await supabase
    .from("client_users")
    .select("role, client_id, clients(name)")
    .eq("user_id", user.id)
    .single();

  const tenantName =
    (Array.isArray(me?.clients)
      ? me?.clients[0]?.name
      : (me?.clients as unknown as { name?: string } | null)?.name) ?? "—";

  return (
    <div className="min-h-screen flex relative z-10">
      <Sidebar
        clientName={tenantName}
        userEmail={user.email ?? ""}
        isAdmin={me?.role === "admin"}
      />
      <main className="flex-1 px-8 py-10 overflow-x-hidden">{children}</main>
    </div>
  );
}
