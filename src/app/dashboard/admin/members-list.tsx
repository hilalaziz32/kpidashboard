type Member = {
  user_id: string;
  email: string;
  role: string;
  client_name: string;
};

export default function MembersList({ members }: { members: Member[] }) {
  return (
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
            {["Email", "Tenant", "Role"].map((h) => (
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
              <td colSpan={3} className="px-6 py-12 text-center text-[var(--muted)]">
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
              <td className="px-5 py-3.5 font-medium text-[var(--ink)]">{m.email}</td>
              <td className="px-5 py-3.5 text-[var(--text)]">{m.client_name}</td>
              <td className="px-5 py-3.5">
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
                    style={{
                      background: m.role === "admin" ? "var(--violet)" : "#94A3B8",
                    }}
                  />
                  {m.role}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
