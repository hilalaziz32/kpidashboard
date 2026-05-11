"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-[1fr_520px] relative z-10">
      {/* Left: brand panel */}
      <div
        className="hidden lg:flex flex-col justify-between p-12 relative overflow-hidden"
        style={{ background: "var(--ink)" }}
      >
        {/* Glow */}
        <div
          className="absolute -top-40 -left-40 w-[480px] h-[480px] rounded-full blur-3xl"
          style={{ background: "rgba(105,56,239,0.35)" }}
        />
        <div
          className="absolute -bottom-40 -right-20 w-[400px] h-[400px] rounded-full blur-3xl"
          style={{ background: "rgba(167,139,250,0.18)" }}
        />

        <div className="flex items-center gap-3 relative z-10">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center"
            style={{ background: "var(--violet)" }}
          >
            <span className="text-white font-bold tabular">S</span>
          </div>
          <span className="text-white font-semibold tracking-tight">Scaletopia</span>
        </div>

        <div className="relative z-10 rise max-w-lg">
          <div className="text-[11px] uppercase tracking-[0.25em] text-violet-200/60 mb-5">
            Scaletopia · Client Portal
          </div>
          <h1 className="text-white text-[56px] leading-[1.02] tracking-tight font-semibold">
            Your pipeline,
            <br />
            <span
              style={{
                background: "linear-gradient(90deg, #A78BFA 0%, #C4B5FD 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              in real time.
            </span>
          </h1>
          <p className="text-white/55 mt-6 text-[16px] leading-relaxed">
            Every booked meeting, every proposal, every close — synced live from
            the team running your outbound. No spreadsheets, no waiting on
            updates.
          </p>

          <div
            className="mt-12 inline-flex items-center gap-3 rounded-full border border-white/10 px-4 py-2 text-[12px] text-white/60"
            style={{ background: "rgba(255,255,255,0.03)" }}
          >
            <span
              className="w-2 h-2 rounded-full"
              style={{ background: "#10B981", boxShadow: "0 0 12px #10B981" }}
            />
            All client tenants synced and live
          </div>
        </div>

        <div className="text-[11px] text-white/30 relative z-10">
          © Scaletopia · {new Date().getFullYear()}
        </div>
      </div>

      {/* Right: form */}
      <div className="flex items-center justify-center p-8 lg:p-12">
        <div className="w-full max-w-sm rise">
          <div className="lg:hidden flex items-center gap-2 mb-10">
            <div
              className="w-8 h-8 rounded-md flex items-center justify-center"
              style={{ background: "var(--violet)" }}
            >
              <span className="text-white text-xs font-bold">S</span>
            </div>
            <span className="font-semibold tracking-tight">Scaletopia</span>
          </div>

          <div className="text-[11px] uppercase tracking-[0.22em] text-[var(--muted)] mb-3">
            Welcome back
          </div>
          <h2 className="text-3xl font-semibold tracking-tight text-[var(--ink)]">
            Sign in
          </h2>
          <p className="text-[14px] text-[var(--muted)] mt-1.5">
            Use your invited credentials.
          </p>

          <form onSubmit={onSubmit} className="mt-8 space-y-4">
            <Field
              label="Email"
              type="email"
              value={email}
              onChange={setEmail}
              placeholder="you@company.com"
              required
            />
            <Field
              label="Password"
              type="password"
              value={password}
              onChange={setPassword}
              required
            />
            {error && (
              <div
                className="text-[13px] rounded-lg px-3 py-2 border"
                style={{
                  color: "#9F1239",
                  background: "#FEF1F4",
                  borderColor: "#FCD7DE",
                }}
              >
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg text-white font-medium py-2.5 text-[14px] transition-all disabled:opacity-50 hover:translate-y-[-1px] hover:shadow-lg"
              style={{
                background: "var(--violet)",
                boxShadow: "0 4px 14px -4px rgba(105,56,239,0.45)",
              }}
            >
              {loading ? "Signing in…" : "Sign in →"}
            </button>
          </form>

          <p className="text-[12px] text-[var(--muted)] mt-8">
            Need access? Ask your Scaletopia admin to invite you.
          </p>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  type,
  value,
  onChange,
  placeholder,
  required,
}: {
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="block text-[11px] uppercase tracking-[0.18em] text-[var(--muted)] mb-1.5">
        {label}
      </span>
      <input
        type={type}
        required={required}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border bg-white px-3.5 py-2.5 text-[14px] outline-none transition focus:border-[var(--violet)] focus:ring-4 focus:ring-[var(--violet-50)]"
        style={{ borderColor: "var(--border-strong)" }}
      />
    </label>
  );
}
