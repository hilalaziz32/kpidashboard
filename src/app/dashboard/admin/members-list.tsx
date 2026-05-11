"use client";

import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

type Member = {
  user_id: string;
  email: string;
  role: string;
  client_name: string;
};

function generatePassword() {
  const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 10; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export default function MembersList({ members }: { members: Member[] }) {
  const router = useRouter();
  const supabase = createClient();
  const [pending, start] = useTransition();
  const [resetFor, setResetFor] = useState<Member | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [feedback, setFeedback] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  function openReset(m: Member) {
    setResetFor(m);
    setNewPassword(generatePassword());
    setFeedback(null);
  }

  function closeReset() {
    setResetFor(null);
    setFeedback(null);
  }

  function doReset() {
    if (!resetFor) return;
    start(async () => {
      const { error } = await supabase.rpc("admin_set_password", {
        p_email: resetFor.email,
        p_password: newPassword,
      });
      if (error) {
        setFeedback({ kind: "err", text: error.message });
        return;
      }
      setFeedback({ kind: "ok", text: "Password reset. Share it with them." });
    });
  }

  function removeMember(m: Member) {
    if (!confirm(`Remove access for ${m.email}? They won't be able to sign in.`)) return;
    start(async () => {
      const { error } = await supabase.rpc("admin_remove_member", { p_user_id: m.user_id });
      if (error) {
        alert(`Failed: ${error.message}`);
        return;
      }
      router.refresh();
    });
  }

  return (
    <>
      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b" style={{ borderColor: "var(--border)" }}>
          <h3 className="text-[14px] font-semibold text-[var(--ink)]">Members</h3>
          <p className="text-[12px] text-[var(--muted)] mt-0.5">
            {members.length} {members.length === 1 ? "person" : "people"} with access.
          </p>
        </div>
        <table className="w-full text-[13px]">
          <thead>
            <tr className="text-left">
              {["Email", "Tenant", "Role", ""].map((h) => (
                <th
                  key={h}
                  className="px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]"
                  style={{ borderBottom: "1px solid var(--border)" }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {members.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-[var(--muted)]">
                  No members yet.
                </td>
              </tr>
            )}
            {members.map((m) => (
              <tr
                key={m.user_id}
                className="hover:bg-[var(--violet-50)]/40 transition"
                style={{ borderTop: "1px solid var(--border)" }}
              >
                <td className="px-5 py-3 font-medium text-[var(--ink)]">{m.email}</td>
                <td className="px-5 py-3 text-[var(--text)]">{m.client_name}</td>
                <td className="px-5 py-3">
                  <span
                    className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full"
                    style={
                      m.role === "admin"
                        ? { background: "var(--violet-100)", color: "var(--violet-700)" }
                        : { background: "#F1F1F5", color: "#3F3D56" }
                    }
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ background: m.role === "admin" ? "var(--violet)" : "#94A3B8" }}
                    />
                    {m.role}
                  </span>
                </td>
                <td className="px-5 py-3 text-right whitespace-nowrap">
                  <button
                    onClick={() => openReset(m)}
                    disabled={pending}
                    className="text-[12px] text-[var(--violet-600)] hover:underline disabled:opacity-50"
                  >
                    Reset password
                  </button>
                  <button
                    onClick={() => removeMember(m)}
                    disabled={pending}
                    className="ml-3 text-[12px] text-rose-600 hover:underline disabled:opacity-50"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {resetFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeReset} />
          <div className="relative card p-6 w-full max-w-md">
            <h3 className="text-[16px] font-semibold text-[var(--ink)]">Reset password</h3>
            <p className="text-[13px] text-[var(--muted)] mt-1">
              For <span className="font-medium text-[var(--ink)]">{resetFor.email}</span>
            </p>

            <div className="mt-5">
              <label className="block text-[10px] uppercase tracking-[0.18em] text-[var(--muted)] mb-1.5">
                New password
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="flex-1 rounded-lg border bg-white px-3.5 py-2.5 text-[13px] tabular outline-none focus:border-[var(--violet)] focus:ring-4 focus:ring-[var(--violet-50)]"
                  style={{ borderColor: "var(--border)" }}
                />
                <button
                  onClick={() => setNewPassword(generatePassword())}
                  className="rounded-lg border bg-white px-3 py-2.5 text-[12px] hover:bg-[var(--violet-50)] transition"
                  style={{ borderColor: "var(--border)" }}
                >
                  ↻
                </button>
              </div>
              <p className="text-[11px] text-[var(--muted)] mt-1.5">
                Min 6 characters.
              </p>
            </div>

            {feedback && (
              <div
                className={`mt-4 text-[12px] rounded-lg px-3 py-2 ${
                  feedback.kind === "ok"
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-rose-50 text-rose-700"
                }`}
              >
                {feedback.text}
              </div>
            )}

            <div className="mt-5 flex gap-2 justify-end">
              <button
                onClick={closeReset}
                className="rounded-lg border bg-white px-4 py-2 text-[13px] hover:bg-slate-50"
                style={{ borderColor: "var(--border)" }}
              >
                Close
              </button>
              <button
                onClick={doReset}
                disabled={pending || newPassword.length < 6}
                className="rounded-lg text-white px-4 py-2 text-[13px] font-medium transition disabled:opacity-50 hover:shadow-lg"
                style={{ background: "var(--violet)" }}
              >
                {pending ? "Saving…" : "Save password"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
