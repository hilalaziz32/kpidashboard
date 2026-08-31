"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { LeadStatus, STATUS_LABEL } from "@/lib/types";

// Shown when a lead is moved to a negative status. The reason is mandatory —
// Save stays disabled until something is typed, and dismissing cancels the
// status change entirely rather than leaving a disqualification unexplained.
export default function ReasonPrompt({
  leadName,
  status,
  initial = "",
  onCancel,
  onConfirm,
}: {
  leadName: string | null;
  status: LeadStatus;
  initial?: string;
  onCancel: () => void;
  onConfirm: (reason: string) => Promise<void> | void;
}) {
  const [reason, setReason] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [mounted, setMounted] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    ref.current?.focus();
  }, [mounted]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !saving) onCancel();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel, saving]);

  if (!mounted) return null;
  const valid = reason.trim().length > 0;

  async function submit() {
    if (!valid || saving) return;
    setSaving(true);
    await onConfirm(reason.trim());
    setSaving(false);
  }

  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={() => !saving && onCancel()}
      />
      <div
        className="relative w-full max-w-[460px] rounded-2xl bg-white p-6"
        style={{ boxShadow: "0 24px 64px -12px rgba(15,11,26,0.35)" }}
      >
        <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">
          Reason required
        </div>
        <h3 className="text-[17px] font-semibold text-[var(--ink)] mt-2 leading-snug">
          Why is {leadName || "this lead"} being marked{" "}
          <span className="text-[var(--violet-600)]">{STATUS_LABEL[status]}</span>?
        </h3>
        <p className="text-[12px] text-[var(--muted)] mt-1.5">
          Be specific — this decides whether the meeting counts as qualified, so
          &quot;not interested&quot; on its own isn&apos;t enough.
        </p>

        <textarea
          ref={ref}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={4}
          placeholder="e.g. Wrong decision maker — they'd already signed with a competitor in June"
          className="mt-4 w-full rounded-lg border bg-white px-3.5 py-2.5 text-[13px] outline-none resize-none focus:border-[var(--violet)] focus:ring-4 focus:ring-[var(--violet-50)]"
          style={{ borderColor: "var(--border-strong)" }}
        />

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            onClick={onCancel}
            disabled={saving}
            className="rounded-lg px-3.5 py-2 text-[13px] font-medium text-[var(--muted)] hover:text-[var(--ink)] disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={!valid || saving}
            title={valid ? undefined : "Enter a reason first"}
            className="rounded-lg px-4 py-2 text-[13px] font-medium text-white disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: "var(--violet)" }}
          >
            {saving ? "Saving…" : "Save reason"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
