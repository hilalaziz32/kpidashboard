import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActiveTenant } from "@/lib/active-tenant";
import Sidebar from "./sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const active = await getActiveTenant();

  return (
    <div className="min-h-screen flex relative z-10">
      <Sidebar
        clientName={active?.name ?? ""}
        userEmail={user.email ?? ""}
        isAdmin={active?.isAdmin ?? false}
        activeTenantId={active?.clientId ?? null}
        allTenants={active?.allTenants ?? []}
      />
      <main className="flex-1 px-8 py-10 overflow-x-hidden">{children}</main>
    </div>
  );
}
