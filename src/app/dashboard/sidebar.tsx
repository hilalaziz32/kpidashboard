"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function Sidebar({
  clientName,
  userEmail,
  isAdmin,
}: {
  clientName: string;
  userEmail: string;
  isAdmin: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const nav = [
    { href: "/dashboard", label: "All-Time", icon: AllTimeIcon },
    { href: "/dashboard/month", label: "Monthly", icon: MonthIcon },
    ...(isAdmin
      ? [{ href: "/dashboard/admin", label: "Admin", icon: AdminIcon }]
      : []),
  ];

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside
      className="w-[260px] shrink-0 sticky top-0 h-screen flex flex-col"
      style={{ background: "var(--ink)" }}
    >
      {/* Top accent line */}
      <div
        className="h-1"
        style={{
          background:
            "linear-gradient(90deg, #6938EF 0%, #A78BFA 50%, #6938EF 100%)",
        }}
      />

      {/* Brand */}
      <div className="px-6 pt-7 pb-8">
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-md flex items-center justify-center"
            style={{ background: "var(--violet)" }}
          >
            <span className="text-white text-xs font-bold tabular">S</span>
          </div>
          <div>
            <div className="text-white text-[13px] font-semibold leading-tight tracking-tight">
              Scaletopia
            </div>
            <div className="text-[11px] tracking-wide text-white/40 uppercase">
              Pipeline
            </div>
          </div>
        </div>
      </div>

      {/* Tenant pill */}
      <div className="px-4 mb-6">
        <div
          className="rounded-xl px-3.5 py-3 border"
          style={{
            background: "rgba(255,255,255,0.04)",
            borderColor: "rgba(255,255,255,0.08)",
          }}
        >
          <div className="text-[10px] uppercase tracking-widest text-white/40">
            Tenant
          </div>
          <div className="text-white text-sm font-medium mt-0.5 truncate">
            {clientName}
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="px-3 flex-1 space-y-1">
        {nav.map((item) => {
          const active =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] transition-colors ${
                active
                  ? "bg-white/[0.07] text-white"
                  : "text-white/60 hover:text-white hover:bg-white/[0.04]"
              }`}
            >
              <span
                className={`w-1 h-1 rounded-full transition-all ${
                  active ? "bg-[#A78BFA] w-3" : "bg-white/30"
                }`}
              />
              <Icon className="w-4 h-4" />
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 pb-5 pt-4 border-t border-white/5">
        <div className="px-2 mb-3">
          <div className="text-[11px] text-white/40 truncate">{userEmail}</div>
          <div className="text-[10px] uppercase tracking-widest text-white/30 mt-0.5">
            {isAdmin ? "Admin" : "Client"}
          </div>
        </div>
        <button
          onClick={signOut}
          className="w-full text-left text-[12px] text-white/50 hover:text-white px-2 py-1.5 rounded-md hover:bg-white/5 transition"
        >
          Sign out →
        </button>
      </div>
    </aside>
  );
}

function AllTimeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 9h18M9 3v18" />
    </svg>
  );
}
function MonthIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M16 3v4M8 3v4M3 11h18" />
    </svg>
  );
}
function AdminIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
    </svg>
  );
}
