"use client";

import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";

type ClientRow = { id: string; name: string; slug: string };

function generatePassword() {
  const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 10; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export default function InviteForm({ clients }: { clients: ClientRow[] }) {
  const [email, setEmail] = useState("");
  const [clientId, setClientId] = useState(clients[0]?.id ?? "");
  const [role, setRole] = useState<"client" | "admin">("client");
  const [password, setPassword] = useState(generatePassword());
  const [pending, start] = useTransition();
  const [created, setCreated] = useState<{ email: string; password: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCreated(null);
    start(async () => {
      const supabase = createClient();
      const { error: rpcErr } = await supabase.rpc("admin_invite", {
        p_email: email,
        p_client_id: role === "admin" ? null : clientId,
        p_password: password,
        p_role: role,
      });
      if (rpcErr) {
        setError(rpcErr.message);
        return;
      }
      setCreated({ email, password });
      setEmail("");
      setPassword(generatePassword());
    });
  }

  async function copyCredentials() {
    if (!created) return;
    const text = `Email: ${created.email}\nPassword: ${created.password}\nLogin: ${window.location.origin}/login`;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="card p-6 space-y-5">
      <div>
        <h3 className="text-[14px] font-semibold text-[var(--ink)]">Invite a user</h3>
        <p className="text-[12px] text-[var(--muted)] mt-0.5">
          Set their password directly — share the credentials with them and they can change it later.
        </p>
      </div>

      <form onSubmit={submit} className="space-y-4">
        <div className={`grid grid-cols-1 gap-3 ${role === "admin" ? "md:grid-cols-2" : "md:grid-cols-3"}`}>
          <Field label="Email">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@company.com"
              className="w-full rounded-lg border bg-white px-3.5 py-2.5 text-[13px] outline-none transition focus:border-[var(--violet)] focus:ring-4 focus:ring-[var(--violet-50)]"
              style={{ borderColor: "var(--border)" }}
            />
          </Field>

          <Field label="Role">
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as "client" | "admin")}
              className="w-full rounded-lg border bg-white px-3.5 py-2.5 text-[13px] outline-none transition focus:border-[var(--violet)] focus:ring-4 focus:ring-[var(--violet-50)]"
              style={{ borderColor: "var(--border)" }}
            >
              <option value="client">Client</option>
              <option value="admin">Admin (sees all tenants)</option>
            </select>
          </Field>

          {role === "client" && (
            <Field label="Tenant">
              <select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="w-full rounded-lg border bg-white px-3.5 py-2.5 text-[13px] outline-none transition focus:border-[var(--violet)] focus:ring-4 focus:ring-[var(--violet-50)]"
                style={{ borderColor: "var(--border)" }}
              >
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </Field>
          )}
        </div>

        {role === "admin" && (
          <div
            className="rounded-lg px-3.5 py-2.5 text-[12px] flex items-center gap-2"
            style={{ background: "var(--violet-50)", color: "var(--violet-700)" }}
          >
            <span className="font-semibold">Admin access:</span>
            <span>This user will see all {clients.length} tenants and can manage settings.</span>
          </div>
        )}

        <Field label="Password">
          <div className="flex gap-2">
            <input
              type="text"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="flex-1 rounded-lg border bg-white px-3.5 py-2.5 text-[13px] tabular outline-none transition focus:border-[var(--violet)] focus:ring-4 focus:ring-[var(--violet-50)]"
              style={{ borderColor: "var(--border)" }}
            />
            <button
              type="button"
              onClick={() => setPassword(generatePassword())}
              className="rounded-lg border bg-white px-4 py-2.5 text-[12px] hover:bg-[var(--violet-50)] hover:border-[var(--violet-200)] transition"
              style={{ borderColor: "var(--border)" }}
            >
              ↻ Regenerate
            </button>
          </div>
          <p className="text-[11px] text-[var(--muted)] mt-1.5">
            Min 6 characters. The user can change this from their account later.
          </p>
        </Field>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={pending || !email || (role === "client" && !clientId) || password.length < 6}
            className="rounded-lg text-white font-medium px-5 py-2.5 text-[13px] transition-all disabled:opacity-50 hover:translate-y-[-1px] hover:shadow-lg"
            style={{
              background: "var(--violet)",
              boxShadow: "0 4px 14px -4px rgba(105,56,239,0.45)",
            }}
          >
            {pending ? "Creating…" : "Create user →"}
          </button>
          {error && <span className="text-[13px] text-rose-600">{error}</span>}
        </div>
      </form>

      {created && (
        <div
          className="rounded-xl border-2 p-4 rise"
          style={{ background: "var(--violet-50)", borderColor: "var(--violet-200)" }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="text-[11px] uppercase tracking-[0.18em] font-semibold text-[var(--violet-700)]">
              ✓ User created — share these credentials
            </div>
            <button
              onClick={copyCredentials}
              className="rounded-md bg-white border px-2.5 py-1 text-[11px] font-medium hover:bg-[var(--violet-100)] transition"
              style={{ borderColor: "var(--violet-200)", color: "var(--violet-700)" }}
            >
              {copied ? "Copied!" : "Copy all"}
            </button>
          </div>
          <div className="space-y-1.5 text-[13px]">
            <Row label="Email" value={created.email} />
            <Row label="Password" value={created.password} mono />
            <Row label="Login URL" value={`${typeof window !== "undefined" ? window.location.origin : ""}/login`} />
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[10px] uppercase tracking-[0.18em] text-[var(--muted)] mb-1.5">
        {label}
      </span>
      {children}
    </label>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline gap-3">
      <span className="text-[11px] uppercase tracking-wider text-[var(--muted)] w-20 shrink-0">
        {label}
      </span>
      <span className={`text-[var(--ink)] font-medium ${mono ? "tabular" : ""} break-all`}>
        {value}
      </span>
    </div>
  );
}
