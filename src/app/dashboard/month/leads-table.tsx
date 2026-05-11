"use client";

import { useEffect, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { Lead, LEAD_STATUSES, LeadStatus, STATUS_LABEL } from "@/lib/types";
import { useRouter } from "next/navigation";
import LeadDrawer from "./lead-drawer";

const STATUS_STYLE: Record<LeadStatus, { bg: string; fg: string; dot: string }> = {
  "meeting booked":    { bg: "#F1F1F5", fg: "#3F3D56", dot: "#94A3B8" },
  show:                { bg: "#E0F2FE", fg: "#075985", dot: "#0EA5E9" },
  "no show":           { bg: "#FEE2E6", fg: "#9F1239", dot: "#F43F5E" },
  "not closed":        { bg: "#FEE7E2", fg: "#9A3412", dot: "#F97316" },
  "next stage":        { bg: "#EDE9FE", fg: "#5B21B6", dot: "#8B5CF6" },
  "proposal sent":     { bg: "#FEF3C7", fg: "#854D0E", dot: "#F59E0B" },
  "verbal agreement":  { bg: "#CFFAFE", fg: "#155E75", dot: "#06B6D4" },
  won:                 { bg: "#D1FAE5", fg: "#065F46", dot: "#10B981" },
};

export default function LeadsTable({ leads: initial }: { leads: Lead[] }) {
  const [leads, setLeads] = useState(initial);
  const [filter, setFilter] = useState<LeadStatus | "all">("all");
  const [openLeadId, setOpenLeadId] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    setLeads(initial);
  }, [initial]);

  async function patchLead(id: string, patch: Partial<Lead>) {
    setLeads((ls) => ls.map((l) => (l.id === id ? { ...l, ...patch } : l)));
    const { error } = await supabase.from("leads").update(patch).eq("id", id);
    if (error) {
      alert(`Update failed: ${error.message}`);
      start(() => router.refresh());
    }
  }

  const filtered = filter === "all" ? leads : leads.filter((l) => l.status === filter);

  const counts: Record<LeadStatus, number> = {
    "meeting booked": 0, show: 0, "no show": 0, "not closed": 0,
    "next stage": 0, "proposal sent": 0, "verbal agreement": 0, won: 0,
  };
  leads.forEach((l) => counts[l.status]++);

  const openLead = leads.find((l) => l.id === openLeadId) ?? null;

  return (
    <>
      <div className="card overflow-hidden">
        <div className="px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b" style={{ borderColor: "var(--border)" }}>
          <div>
            <h3 className="text-[14px] font-semibold text-[var(--ink)]">Leads</h3>
            <p className="text-[12px] text-[var(--muted)] mt-0.5">
              {leads.length} total · click any row to edit
            </p>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <Pill active={filter === "all"} onClick={() => setFilter("all")}>
              All <span className="tabular text-[var(--muted)] ml-1">{leads.length}</span>
            </Pill>
            {LEAD_STATUSES.map((s) => (
              <Pill key={s} active={filter === s} onClick={() => setFilter(s)} dotColor={STATUS_STYLE[s].dot}>
                {STATUS_LABEL[s]} <span className="tabular text-[var(--muted)] ml-1">{counts[s]}</span>
              </Pill>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-left">
                {[
                  "Status", "Name", "Company", "Email",
                  "Call Scheduled For", "Upfront", "MRR", "Recording", "Notes",
                ].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)] whitespace-nowrap"
                    style={{ borderBottom: "1px solid var(--border)" }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-6 py-16 text-center text-[var(--muted)]">
                    {leads.length === 0
                      ? "No leads booked this month yet."
                      : "No leads match this filter."}
                  </td>
                </tr>
              )}
              {filtered.map((l) => {
                const s = STATUS_STYLE[l.status];
                return (
                  <tr
                    key={l.id}
                    onClick={() => setOpenLeadId(l.id)}
                    className="hover:bg-[var(--violet-50)]/40 transition cursor-pointer"
                    style={{ borderTop: "1px solid var(--border)" }}
                  >
                    <td className="px-4 py-2.5" onClick={(e) => e.stopPropagation()}>
                      <div className="relative inline-block">
                        <select
                          value={l.status}
                          onChange={(e) =>
                            patchLead(l.id, { status: e.target.value as LeadStatus })
                          }
                          className="appearance-none cursor-pointer rounded-full text-[11px] font-medium pl-7 pr-8 py-1.5 border-0 outline-none focus:ring-2 focus:ring-[var(--violet-200)]"
                          style={{ background: s.bg, color: s.fg }}
                        >
                          {LEAD_STATUSES.map((opt) => (
                            <option key={opt} value={opt}>{STATUS_LABEL[opt]}</option>
                          ))}
                        </select>
                        <span
                          className="absolute left-3 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full pointer-events-none"
                          style={{ background: s.dot }}
                        />
                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: s.fg }}>
                          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                            <path d="M2 4l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                          </svg>
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap font-medium text-[var(--ink)]">
                      {l.full_name}
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      {l.company_name && <div>{l.company_name}</div>}
                      {l.website && (
                        <a
                          href={l.website.startsWith("http") ? l.website : `https://${l.website}`}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-[11px] text-[var(--violet-600)] hover:underline"
                        >
                          {l.website}
                        </a>
                      )}
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap text-[var(--text)]">{l.email}</td>
                    <td className="px-4 py-2.5 whitespace-nowrap tabular">{fmtDate(l.date_of_meeting)}</td>
                    <td className="px-4 py-2.5 whitespace-nowrap tabular text-right">
                      {Number(l.upfront_collected ?? 0) > 0 ? `$${Number(l.upfront_collected).toLocaleString()}` : <span className="text-[var(--border-strong)]"></span>}
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap tabular text-right">
                      {Number(l.mrr_collected ?? 0) > 0 ? `$${Number(l.mrr_collected).toLocaleString()}` : <span className="text-[var(--border-strong)]"></span>}
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      {l.call_recording_url ? (
                        <a
                          href={l.call_recording_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 text-[12px] text-[var(--violet-600)] hover:underline"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polygon points="5,3 19,12 5,21" />
                          </svg>
                          Play
                        </a>
                      ) : (
                        <span className="text-[var(--border-strong)]"></span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 max-w-[240px]">
                      <div className="truncate text-[var(--muted)] text-[12px]">
                        {l.notes || <span className="text-[var(--border-strong)]"></span>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {pending && <div className="px-5 py-2 text-[11px] text-[var(--muted)] border-t" style={{ borderColor: "var(--border)" }}>Saving…</div>}
      </div>

      {openLead && (
        <LeadDrawer
          lead={openLead}
          onClose={() => setOpenLeadId(null)}
          onSave={(patch) => patchLead(openLead.id, patch)}
        />
      )}
    </>
  );
}

function Pill({
  children,
  active,
  onClick,
  dotColor,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
  dotColor?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full text-[11px] font-medium px-3 py-1.5 transition border ${
        active
          ? "bg-[var(--ink)] text-white border-[var(--ink)]"
          : "bg-white text-[var(--text)] hover:border-[var(--border-strong)]"
      }`}
      style={!active ? { borderColor: "var(--border)" } : undefined}
    >
      {dotColor && (
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{ background: dotColor }}
        />
      )}
      {children}
    </button>
  );
}

function fmtDate(d: string | null) {
  if (!d) return "";
  return new Date(d).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
