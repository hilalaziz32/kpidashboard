"use client";

import Link from "next/link";

const TABS = [
  { key: "tenants", label: "Tenants" },
  { key: "members", label: "Members" },
  { key: "invite",  label: "Invite" },
] as const;

export default function AdminTabs({
  active,
}: {
  active: "tenants" | "members" | "invite";
}) {
  return (
    <div
      className="flex items-center gap-1 p-1 rounded-xl bg-white border w-fit"
      style={{ borderColor: "var(--border)" }}
    >
      {TABS.map((t) => {
        const isActive = active === t.key;
        return (
          <Link
            key={t.key}
            href={`/dashboard/admin?tab=${t.key}`}
            className={`rounded-lg px-4 py-1.5 text-[13px] font-medium transition ${
              isActive
                ? "text-white"
                : "text-[var(--muted)] hover:text-[var(--ink)]"
            }`}
            style={
              isActive
                ? {
                    background: "var(--violet)",
                    boxShadow: "0 2px 8px -2px rgba(105,56,239,0.35)",
                  }
                : undefined
            }
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
