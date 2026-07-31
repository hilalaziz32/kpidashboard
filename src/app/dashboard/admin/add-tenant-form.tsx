"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createTenant, type CreateTenantResult } from "./actions";

export default function AddTenantForm() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [created, setCreated] = useState<{
    id: string;
    name: string;
    linked: boolean;
    linkError?: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setCreated(null);
    const form = e.currentTarget;
    const fd = new FormData(form);
    start(async () => {
      const res: CreateTenantResult = await createTenant(fd);
      if (res.ok) {
        setCreated({
          id: res.id,
          name: res.name,
          linked: res.linked,
          linkError: res.linkError,
        });
        form.reset();
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  async function copyId() {
    if (!created) return;
    await navigator.clipboard.writeText(created.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="card p-6">
      <h3 className="text-[14px] font-semibold text-[var(--ink)]">Add client</h3>
      <p className="text-[12px] text-[var(--muted)] mt-0.5">
        Creates a new active tenant. Copy its UUID into the client&apos;s{" "}
        <span className="tabular">DashboardID</span> in Airtable to link the sync.
      </p>

      <form onSubmit={onSubmit} className="mt-4 flex flex-wrap items-end gap-3">
        <Field label="Name" hint="e.g. Go Fish Digital">
          <input
            name="name"
            required
            placeholder="Client name"
            className="w-56 rounded-lg border bg-white px-3 py-2 text-[13px] outline-none focus:border-[var(--violet)] focus:ring-2 focus:ring-[var(--violet-50)]"
            style={{ borderColor: "var(--border)" }}
          />
        </Field>
        <Field label="Slug" hint="auto from name if blank">
          <input
            name="slug"
            placeholder="go-fish-digital"
            className="w-48 rounded-lg border bg-white px-3 py-2 text-[13px] tabular outline-none focus:border-[var(--violet)] focus:ring-2 focus:ring-[var(--violet-50)]"
            style={{ borderColor: "var(--border)" }}
          />
        </Field>
        <Field label="Meeting Target">
          <input
            name="kpi_target_meetings"
            type="number"
            min={0}
            defaultValue={0}
            className="w-28 rounded-lg border bg-white px-3 py-2 text-[13px] tabular text-right outline-none focus:border-[var(--violet)] focus:ring-2 focus:ring-[var(--violet-50)]"
            style={{ borderColor: "var(--border)" }}
          />
        </Field>
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg px-4 py-2 text-[13px] font-medium text-white disabled:opacity-60"
          style={{ background: "var(--violet)" }}
        >
          {pending ? "Creating…" : "Create client"}
        </button>
      </form>

      {error && (
        <div className="mt-3 rounded-lg px-3 py-2 text-[12px]" style={{ background: "#FEE2E2", color: "#991B1B" }}>
          {error}
        </div>
      )}

      {created && (
        <div
          className="mt-3 rounded-lg px-3 py-2.5 text-[12px] flex items-center gap-3 flex-wrap"
          style={{ background: "#DCFCE7", color: "#065F46" }}
        >
          <span>
            Created <strong>{created.name}</strong>. UUID:
          </span>
          <code className="tabular rounded bg-white/70 px-2 py-1 text-[12px] text-[var(--ink)]">
            {created.id}
          </code>
          <button
            onClick={copyId}
            className="rounded-md border px-2 py-1 text-[11px] font-medium"
            style={{ borderColor: "#86EFAC", color: "#065F46" }}
          >
            {copied ? "Copied ✓" : "Copy"}
          </button>
          <span className="w-full text-[11px]">
            {created.linked ? (
              <>✓ Written to Airtable → Clients → <span className="tabular">DashboardID</span>. Deals will sync.</>
            ) : (
              <span style={{ color: "#92400E" }}>
                ⚠ Not linked in Airtable ({created.linkError}). Paste the UUID into
                that client&apos;s <span className="tabular">DashboardID</span> manually, or deals won&apos;t sync.
              </span>
            )}
          </span>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">
        {label}
        {hint && <span className="ml-1.5 normal-case tracking-normal text-[var(--border-strong)]">· {hint}</span>}
      </span>
      {children}
    </label>
  );
}
