"use client";

import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";

type TenantRow = {
  id: string;
  name: string;
  slug: string;
  kpi_target_meetings: number;
  default_deal_size_monthly: number | null;
  default_deal_size_annual: number | null;
  active: boolean;
};

export default function TenantsTable({ clients }: { clients: TenantRow[] }) {
  const [rows, setRows] = useState(clients);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [, start] = useTransition();
  const supabase = createClient();

  async function patchTenant(id: string, patch: Partial<TenantRow>) {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    setSavingId(id);
    const { error } = await supabase.rpc("admin_update_tenant", {
      p_client_id: id,
      p_kpi_target_meetings:       patch.kpi_target_meetings       ?? null,
      p_default_deal_size_monthly: patch.default_deal_size_monthly ?? null,
      p_default_deal_size_annual:  patch.default_deal_size_annual  ?? null,
      p_active:                    patch.active                    ?? null,
    });
    setSavingId(null);
    if (error) alert(`Update failed: ${error.message}`);
  }

  return (
    <div className="card overflow-hidden">
      <div className="px-6 py-4 border-b" style={{ borderColor: "var(--border)" }}>
        <h3 className="text-[14px] font-semibold text-[var(--ink)]">Tenants</h3>
        <p className="text-[12px] text-[var(--muted)] mt-0.5">
          {rows.length} tenants · click any cell to edit. Saves on blur.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr>
              {[
                { label: "Name", align: "left" },
                { label: "Slug", align: "left" },
                { label: "Meeting Target", align: "right" },
                { label: "Default Deal $/mo", align: "right" },
                { label: "Default Deal $/yr", align: "right" },
                { label: "Active", align: "center" },
              ].map((h) => (
                <th
                  key={h.label}
                  className={`px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)] whitespace-nowrap ${
                    h.align === "right"
                      ? "text-right"
                      : h.align === "center"
                        ? "text-center"
                        : "text-left"
                  }`}
                  style={{ borderBottom: "1px solid var(--border)" }}
                >
                  {h.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.id}
                className={`transition ${!r.active ? "opacity-50" : ""}`}
                style={{ borderTop: "1px solid var(--border)" }}
              >
                <td className="px-4 py-2.5 font-medium text-[var(--ink)]">
                  {r.name}
                  {savingId === r.id && (
                    <span className="ml-2 text-[11px] text-[var(--muted)]">saving…</span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-[var(--muted)] tabular text-[12px]">
                  {r.slug}
                </td>
                <td className="px-4 py-2.5 text-right">
                  <NumCell
                    value={r.kpi_target_meetings}
                    onSave={(v) => patchTenant(r.id, { kpi_target_meetings: v })}
                  />
                </td>
                <td className="px-4 py-2.5 text-right">
                  <MoneyCell
                    value={r.default_deal_size_monthly}
                    onSave={(v) => patchTenant(r.id, { default_deal_size_monthly: v })}
                  />
                </td>
                <td className="px-4 py-2.5 text-right">
                  <MoneyCell
                    value={r.default_deal_size_annual}
                    onSave={(v) => patchTenant(r.id, { default_deal_size_annual: v })}
                  />
                </td>
                <td className="px-4 py-2.5 text-center">
                  <Toggle
                    on={r.active}
                    onChange={(v) => patchTenant(r.id, { active: v })}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function NumCell({ value, onSave }: { value: number; onSave: (v: number) => void }) {
  const [v, setV] = useState(String(value));
  return (
    <input
      type="number"
      value={v}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => {
        const n = Math.max(0, Number(v) || 0);
        if (n !== value) onSave(n);
      }}
      className="w-24 rounded-lg border bg-white px-3 py-1.5 text-[13px] tabular text-right outline-none focus:border-[var(--violet)] focus:ring-2 focus:ring-[var(--violet-50)]"
      style={{ borderColor: "var(--border)" }}
    />
  );
}

function MoneyCell({
  value,
  onSave,
}: {
  value: number | null;
  onSave: (v: number | null) => void;
}) {
  const [v, setV] = useState(value === null ? "" : String(value));
  return (
    <div className="relative inline-block">
      {v !== "" && (
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[12px] text-[var(--muted)] pointer-events-none">
          $
        </span>
      )}
      <input
        type="number"
        step="0.01"
        value={v}
        placeholder=""
        onChange={(e) => setV(e.target.value)}
        onBlur={() => {
          if (v === "") {
            if (value !== null) onSave(null);
          } else {
            const n = Number(v);
            if (!Number.isNaN(n) && n !== value) onSave(n);
          }
        }}
        className={`w-32 rounded-lg border bg-white py-1.5 text-[13px] tabular text-right outline-none focus:border-[var(--violet)] focus:ring-2 focus:ring-[var(--violet-50)] ${
          v !== "" ? "pl-7 pr-3" : "px-3"
        }`}
        style={{ borderColor: "var(--border)" }}
      />
    </div>
  );
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!on)}
      className="inline-flex items-center"
      aria-label={on ? "Disable" : "Enable"}
    >
      <span
        className={`relative inline-block w-10 h-5 rounded-full transition`}
        style={{ background: on ? "var(--violet)" : "#D5D3E1" }}
      >
        <span
          className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition ${
            on ? "left-5" : "left-0.5"
          }`}
        />
      </span>
    </button>
  );
}
