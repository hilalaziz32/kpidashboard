"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Lead, LEAD_STATUSES, LeadStatus, STATUS_LABEL } from "@/lib/types";
import LeadDrawer from "../month/lead-drawer";

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

export default function PipelineView({
  leads: initial,
  from,
  to,
  isAdmin = false,
}: {
  leads: Lead[];
  from: string;
  to: string;
  isAdmin?: boolean;
}) {
  const router = useRouter();
  const sp = useSearchParams();

  const [leads, setLeads] = useState(initial);
  const [selected, setSelected] = useState<Set<LeadStatus>>(new Set());
  const [openLeadId, setOpenLeadId] = useState<string | null>(null);

  useEffect(() => setLeads(initial), [initial]);

  function toggle(s: LeadStatus) {
    const next = new Set(selected);
    if (next.has(s)) next.delete(s);
    else next.add(s);
    setSelected(next);
  }

  function setRange(newFrom: string, newTo: string) {
    const qs = new URLSearchParams(sp);
    qs.set("from", newFrom);
    qs.set("to", newTo);
    router.push(`/dashboard/pipeline?${qs.toString()}`);
  }

  function preset(months: number) {
    const end = new Date();
    const start = new Date();
    start.setMonth(end.getMonth() - months + 1);
    start.setDate(1);
    setRange(iso(start), iso(end));
  }
  function presetYear() {
    const y = new Date().getFullYear();
    setRange(`${y}-01-01`, `${y}-12-31`);
  }

  const counts = useMemo(() => {
    const c: Record<LeadStatus, number> = {
      "meeting booked": 0, show: 0, "no show": 0, "not closed": 0,
      "next stage": 0, "proposal sent": 0, "verbal agreement": 0, won: 0,
    };
    leads.forEach((l) => c[l.status]++);
    return c;
  }, [leads]);

  const filtered = useMemo(() => {
    if (selected.size === 0) return leads;
    return leads.filter((l) => selected.has(l.status));
  }, [leads, selected]);

  const supabase = createClient();
  async function patchLead(id: string, patch: Partial<Lead>) {
    setLeads((ls) => ls.map((l) => (l.id === id ? { ...l, ...patch } : l)));
    const { error } = await supabase.from("leads").update(patch).eq("id", id);
    if (error) {
      alert(`Update failed: ${error.message}`);
      router.refresh();
    }
  }

  const openLead = leads.find((l) => l.id === openLeadId) ?? null;

  return (
    <>
      {/* Controls */}
      <div className="card p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] uppercase tracking-[0.18em] text-[var(--muted)] mr-1">
            Range
          </span>
          <DateInput value={from} onChange={(v) => setRange(v, to)} />
          <span className="text-[var(--muted)] text-[12px]">to</span>
          <DateInput value={to} onChange={(v) => setRange(from, v)} />
          <div className="ml-2 flex gap-1.5">
            <Preset onClick={() => preset(1)}>This Month</Preset>
            <Preset onClick={() => preset(3)}>Last 90 Days</Preset>
            <Preset onClick={() => preset(6)}>Last 6 Months</Preset>
            <Preset onClick={presetYear}>This Year</Preset>
          </div>
          <div className="ml-auto text-[12px] text-[var(--muted)]">
            <span className="tabular font-medium text-[var(--ink)]">{filtered.length}</span> shown
            {selected.size > 0 && ` (of ${leads.length})`}
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap pt-1">
          <button
            onClick={() => setSelected(new Set())}
            className={`inline-flex items-center gap-1.5 rounded-full text-[11px] font-medium px-3 py-1.5 transition border ${
              selected.size === 0
                ? "bg-[var(--ink)] text-white border-[var(--ink)]"
                : "bg-white text-[var(--text)] hover:border-[var(--border-strong)]"
            }`}
            style={selected.size !== 0 ? { borderColor: "var(--border)" } : undefined}
          >
            All <span className="tabular text-[var(--muted)] ml-1">{leads.length}</span>
          </button>
          {LEAD_STATUSES.map((s) => {
            const active = selected.has(s);
            return (
              <button
                key={s}
                onClick={() => toggle(s)}
                className={`inline-flex items-center gap-1.5 rounded-full text-[11px] font-medium px-3 py-1.5 transition border ${
                  active
                    ? "text-white"
                    : "bg-white text-[var(--text)] hover:border-[var(--border-strong)]"
                }`}
                style={{
                  background: active ? STATUS_STYLE[s].fg : undefined,
                  borderColor: active ? STATUS_STYLE[s].fg : "var(--border)",
                }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: STATUS_STYLE[s].dot }}
                />
                {STATUS_LABEL[s]}
                <span className={`tabular ml-1 ${active ? "text-white/70" : "text-[var(--muted)]"}`}>
                  {counts[s]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
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
                    No leads match this filter.
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
                    <td className="px-4 py-2.5">
                      <span
                        className="inline-flex items-center gap-1.5 rounded-full text-[11px] font-medium px-3 py-1"
                        style={{ background: s.bg, color: s.fg }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.dot }} />
                        {STATUS_LABEL[l.status]}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap font-medium text-[var(--ink)]">
                      {l.full_name}
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      {l.company_name}
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
                          className="text-[12px] text-[var(--violet-600)] hover:underline"
                        >
                          ▶ Play
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
      </div>

      {openLead && (
        <LeadDrawer
          lead={openLead}
          onClose={() => setOpenLeadId(null)}
          onSave={(patch) => patchLead(openLead.id, patch)}
          onDelete={async (id) => {
            setLeads((ls) => ls.filter((l) => l.id !== id));
            const { error } = await supabase.rpc("admin_delete_lead", { p_lead_id: id });
            if (error) {
              alert(`Delete failed: ${error.message}`);
              router.refresh();
            }
          }}
          isAdmin={isAdmin}
        />
      )}
    </>
  );
}

function DateInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      type="date"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-lg border bg-white px-3 py-1.5 text-[12px] tabular outline-none focus:border-[var(--violet)] focus:ring-2 focus:ring-[var(--violet-50)]"
      style={{ borderColor: "var(--border)" }}
    />
  );
}

function Preset({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="rounded-full text-[11px] font-medium px-3 py-1 border bg-white hover:border-[var(--border-strong)] transition"
      style={{ borderColor: "var(--border)" }}
    >
      {children}
    </button>
  );
}

function iso(d: Date) {
  return d.toISOString().slice(0, 10);
}

function fmtDate(d: string | null) {
  if (!d) return "";
  return new Date(d).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
