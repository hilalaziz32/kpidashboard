"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { switchTenant } from "./switch-tenant";

export default function TenantSwitcher({
  activeTenantId,
  activeTenantName,
  allTenants,
}: {
  activeTenantId: string | null;
  activeTenantName: string;
  allTenants: { id: string; name: string; slug: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  function pick(id: string) {
    setOpen(false);
    start(() => switchTenant(id));
  }

  const filtered = query
    ? allTenants.filter((t) =>
        t.name.toLowerCase().includes(query.toLowerCase())
      )
    : allTenants;

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] transition px-4 py-3 text-left"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-[0.18em] text-white/40 mb-0.5">
              Viewing
            </div>
            <div className="text-white text-[14px] font-medium truncate">
              {pending ? "Switching…" : activeTenantName}
            </div>
          </div>
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            className={`text-white/60 shrink-0 transition ${open ? "rotate-180" : ""}`}
          >
            <path
              d="M3 5l4 4 4-4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </div>
      </button>

      {open && (
        <div
          className="absolute z-50 left-0 right-0 mt-2 rounded-xl border bg-white shadow-2xl overflow-hidden"
          style={{ borderColor: "var(--border)" }}
        >
          <div className="p-2 border-b" style={{ borderColor: "var(--border)" }}>
            <input
              type="text"
              autoFocus
              placeholder="Search tenants…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full rounded-md bg-slate-50 border border-transparent px-3 py-1.5 text-[13px] outline-none focus:bg-white focus:border-[var(--violet)]"
            />
          </div>
          <div className="max-h-[320px] overflow-y-auto py-1">
            {filtered.length === 0 && (
              <div className="px-4 py-6 text-center text-[12px] text-[var(--muted)]">
                No match.
              </div>
            )}
            {filtered.map((t) => {
              const isActive = t.id === activeTenantId;
              return (
                <button
                  key={t.id}
                  onClick={() => pick(t.id)}
                  className={`w-full px-3 py-2 flex items-center justify-between text-left text-[13px] hover:bg-[var(--violet-50)] transition ${
                    isActive ? "bg-[var(--violet-50)]" : ""
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className="w-6 h-6 rounded-md flex items-center justify-center text-white font-semibold text-[11px] shrink-0"
                      style={{
                        background: isActive
                          ? "var(--violet)"
                          : "linear-gradient(135deg, #4A22BD 0%, #6938EF 100%)",
                        opacity: isActive ? 1 : 0.6,
                      }}
                    >
                      {t.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium text-[var(--ink)] truncate">
                        {t.name}
                      </div>
                      <div className="text-[10px] text-[var(--muted)] tabular truncate">
                        {t.slug}
                      </div>
                    </div>
                  </div>
                  {isActive && (
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path
                        d="M3 7l3 3 5-6"
                        stroke="var(--violet)"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                      />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
