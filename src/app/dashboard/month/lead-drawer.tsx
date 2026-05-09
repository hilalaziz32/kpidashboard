"use client";

import { useEffect, useState } from "react";
import { Lead, LEAD_STATUSES, LeadStatus, STATUS_LABEL } from "@/lib/types";

export default function LeadDrawer({
  lead,
  onClose,
  onSave,
}: {
  lead: Lead;
  onClose: () => void;
  onSave: (patch: Partial<Lead>) => Promise<void> | void;
}) {
  const [status, setStatus] = useState<LeadStatus>(lead.status);
  const [upfront, setUpfront] = useState(
    lead.upfront_collected ? String(lead.upfront_collected) : ""
  );
  const [mrr, setMrr] = useState(
    lead.mrr_collected ? String(lead.mrr_collected) : ""
  );
  const [recording, setRecording] = useState(lead.call_recording_url ?? "");
  const [notes, setNotes] = useState(lead.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function save() {
    setSaving(true);
    await onSave({
      status,
      upfront_collected: Number(upfront) || 0,
      mrr_collected: Number(mrr) || 0,
      call_recording_url: recording.trim() || null,
      notes: notes.trim() || null,
    });
    setSaving(false);
    setSavedAt(Date.now());
    setTimeout(() => setSavedAt(null), 1500);
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <aside className="relative ml-auto h-full w-full max-w-[520px] bg-white shadow-2xl flex flex-col rise-right">
        {/* Header */}
        <div className="px-7 pt-5 pb-5 border-b" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] uppercase tracking-[0.22em] text-[var(--muted)]">
              Lead
            </span>
            <button
              onClick={onClose}
              className="rounded-md p-1.5 hover:bg-slate-100 text-[var(--muted)] -mr-1.5"
              aria-label="Close"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 6l12 12M18 6l-12 12" />
              </svg>
            </button>
          </div>
          <h2 className="text-[22px] font-semibold text-[var(--ink)] tracking-tight truncate leading-tight">
            {lead.full_name || "Unnamed"}
          </h2>
          {lead.company_name && (
            <div className="text-[13px] text-[var(--muted)] truncate mt-0.5">
              {lead.company_name}
            </div>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-7 py-5 space-y-5">
          {/* Read-only meta */}
          <div className="grid grid-cols-2 gap-x-5 gap-y-3.5 text-[13px]">
            <Meta label="Email" value={lead.email} />
            <Meta label="Phone" value={lead.phone} />
            <Meta label="Website" value={lead.website} link />
            <Meta label="Created Date" value={fmtDate(lead.created_date)} />
            <Meta
              label="Call Scheduled For"
              value={fmtDate(lead.date_of_meeting)}
              wide
            />
          </div>

          {/* Status */}
          <Field label="Status">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as LeadStatus)}
              className="w-full rounded-lg border bg-white px-3.5 py-2.5 text-[13px] outline-none focus:border-[var(--violet)] focus:ring-4 focus:ring-[var(--violet-50)]"
              style={{ borderColor: "var(--border)" }}
            >
              {LEAD_STATUSES.map((s) => (
                <option key={s} value={s}>{STATUS_LABEL[s]}</option>
              ))}
            </select>
          </Field>

          {/* Money */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Upfront Collected">
              <Money value={upfront} onChange={setUpfront} />
            </Field>
            <Field label="MRR Collected">
              <Money value={mrr} onChange={setMrr} />
            </Field>
          </div>

          {/* Recording */}
          <Field label="Call Recording URL">
            <input
              type="url"
              placeholder="https://..."
              value={recording}
              onChange={(e) => setRecording(e.target.value)}
              className="w-full rounded-lg border bg-white px-3.5 py-2.5 text-[13px] outline-none focus:border-[var(--violet)] focus:ring-4 focus:ring-[var(--violet-50)]"
              style={{ borderColor: "var(--border)" }}
            />
            {recording && (
              <a
                href={recording}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex items-center gap-1.5 text-[12px] text-[var(--violet-600)] hover:underline"
              >
                ▶ Open recording
              </a>
            )}
          </Field>

          {/* Notes */}
          <Field label="Notes">
            <textarea
              rows={6}
              placeholder="Anything worth remembering about this lead — talking points, objections, next steps."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-lg border bg-white px-3.5 py-2.5 text-[13px] outline-none resize-y focus:border-[var(--violet)] focus:ring-4 focus:ring-[var(--violet-50)]"
              style={{ borderColor: "var(--border)" }}
            />
          </Field>

          {/* Save controls — directly under Notes */}
          <div className="flex items-center gap-3">
            <button
              onClick={save}
              disabled={saving}
              className="rounded-lg text-white font-medium px-5 py-2.5 text-[13px] transition-all disabled:opacity-50 hover:translate-y-[-1px] hover:shadow-lg"
              style={{
                background: "var(--violet)",
                boxShadow: "0 4px 14px -4px rgba(105,56,239,0.45)",
              }}
            >
              {saving ? "Saving…" : "Save changes"}
            </button>
            <button
              onClick={onClose}
              className="rounded-lg border px-4 py-2.5 text-[13px] hover:bg-slate-50"
              style={{ borderColor: "var(--border)" }}
            >
              Close
            </button>
            {savedAt && (
              <span className="text-[12px] text-emerald-700">✓ Saved</span>
            )}
          </div>
        </div>
      </aside>

      <style>{`
        @keyframes riseRight {
          from { transform: translateX(20px); opacity: 0.6; }
          to { transform: translateX(0); opacity: 1; }
        }
        .rise-right { animation: riseRight 0.22s cubic-bezier(0.2, 0.7, 0.2, 1) both; }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[10px] uppercase tracking-[0.18em] text-[var(--muted)] mb-1.5">
        {label}
      </span>
      <div>{children}</div>
    </label>
  );
}

function Meta({
  label,
  value,
  link,
  wide,
}: {
  label: string;
  value: string | null | undefined;
  link?: boolean;
  wide?: boolean;
}) {
  return (
    <div className={`min-w-0 ${wide ? "col-span-2" : ""}`}>
      <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--muted)] mb-1">
        {label}
      </div>
      <div className="text-[var(--ink)] truncate">
        {value ? (
          link ? (
            <a
              href={value.startsWith("http") ? value : `https://${value}`}
              target="_blank"
              rel="noreferrer"
              className="text-[var(--violet-600)] hover:underline"
            >
              {value}
            </a>
          ) : (
            value
          )
        ) : (
          <span className="text-[var(--border-strong)]">—</span>
        )}
      </div>
    </div>
  );
}

function Money({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="relative">
      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[13px] text-[var(--muted)] pointer-events-none">$</span>
      <input
        type="number"
        step="0.01"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border bg-white pl-7 pr-3 py-2.5 text-[13px] tabular text-right outline-none focus:border-[var(--violet)] focus:ring-4 focus:ring-[var(--violet-50)]"
        style={{ borderColor: "var(--border)" }}
      />
    </div>
  );
}

function fmtDate(d: string | null) {
  if (!d) return null;
  return new Date(d).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
