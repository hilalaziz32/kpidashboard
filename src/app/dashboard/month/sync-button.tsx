"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { syncActiveClientMonth } from "../lead-actions";

export default function SyncButton({
  year,
  month,
}: {
  year: number;
  month: number;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  // Sync the month currently on screen, not just today's month.
  const yyyymm = `${year}-${String(month).padStart(2, "0")}`;

  function run() {
    setMsg(null);
    start(async () => {
      const res = await syncActiveClientMonth(yyyymm);
      if (res.ok) {
        const s = res.summary;
        setMsg({ kind: "ok", text: `Synced ${s.upserted} deal${s.upserted === 1 ? "" : "s"} (${s.month})` });
        router.refresh();
      } else {
        setMsg({ kind: "err", text: res.error });
      }
      setTimeout(() => setMsg(null), 4000);
    });
  }

  return (
    <div className="flex items-center gap-2">
      {msg && (
        <span
          className="text-[12px]"
          style={{ color: msg.kind === "ok" ? "#065F46" : "#991B1B" }}
        >
          {msg.text}
        </span>
      )}
      <button
        onClick={run}
        disabled={pending}
        title="Pull this client's current-month deals from Airtable"
        className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-[13px] font-medium disabled:opacity-60"
        style={{ borderColor: "var(--border)", color: "var(--ink)" }}
      >
        <span className={pending ? "animate-spin" : ""}>⟳</span>
        {pending ? "Syncing…" : "Sync deals"}
      </button>
    </div>
  );
}
