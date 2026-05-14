"use client";

import Link from "next/link";

export default function CategoryTabs({
  active,
  year,
  month,
  meetingsCount,
  prCount,
}: {
  active: "meetings" | "pr";
  year: number;
  month: number;
  meetingsCount: number;
  prCount: number;
}) {
  const base = `/dashboard/month?y=${year}&m=${month}`;
  const tabs = [
    { key: "meetings", label: "Meetings", count: meetingsCount, href: base },
    { key: "pr",       label: "PR",       count: prCount,       href: `${base}&tab=pr` },
  ] as const;

  return (
    <div
      className="inline-flex items-center gap-1 p-1 rounded-xl bg-white border"
      style={{ borderColor: "var(--border)" }}
    >
      {tabs.map((t) => {
        const isActive = active === t.key;
        return (
          <Link
            key={t.key}
            href={t.href}
            scroll={false}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-1.5 text-[13px] font-medium transition ${
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
            <span
              className={`tabular text-[11px] ${
                isActive ? "text-white/75" : "text-[var(--muted)]"
              }`}
            >
              {t.count}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
