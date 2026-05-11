import { KpiSummary } from "@/lib/kpi";

export default function Funnel({ k }: { k: KpiSummary }) {
  const b = k.meetingsBooked;
  const steps = [
    { label: "Booked", value: b },
    { label: "Showed", value: k.shows },
    { label: "Next Stage+", value: k.nextStageOrBeyond },
    { label: "Proposals", value: k.proposalsSent },
    { label: "Won", value: k.won, accent: true },
  ];
  return (
    <div className="card p-6">
      <div className="flex items-baseline justify-between mb-5">
        <div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">
            Funnel
          </div>
          <h3 className="text-[14px] font-semibold text-[var(--ink)] mt-1">
            Stage-by-stage conversion
          </h3>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {steps.map((s, i) => {
          const prev = i === 0 ? b : steps[i - 1].value;
          const fromPrev = i === 0 ? 1 : prev ? s.value / prev : 0;
          const fromBooked = b ? s.value / b : 0;
          return (
            <div
              key={s.label}
              className={`relative p-4 rounded-xl border ${
                s.accent
                  ? "text-white"
                  : "bg-white text-[var(--ink)]"
              }`}
              style={{
                borderColor: s.accent ? "transparent" : "var(--border)",
                background: s.accent
                  ? "linear-gradient(135deg, var(--violet) 0%, #4A22BD 100%)"
                  : undefined,
              }}
            >
              <div
                className={`text-[10px] uppercase tracking-[0.18em] ${
                  s.accent ? "text-white/70" : "text-[var(--muted)]"
                }`}
              >
                {s.label}
              </div>
              <div
                className={`tabular text-[28px] font-semibold tracking-tight mt-1 ${
                  s.accent ? "text-white" : "text-[var(--ink)]"
                }`}
              >
                {s.value}
              </div>
              {i > 0 && (
                <div className="mt-2 flex items-center justify-between text-[11px]">
                  <span
                    className={s.accent ? "text-white/60" : "text-[var(--muted)]"}
                  >
                    of prev
                  </span>
                  <span
                    className={`tabular font-medium ${
                      s.accent ? "text-white" : "text-[var(--ink)]"
                    }`}
                  >
                    {(fromPrev * 100).toFixed(1)}%
                  </span>
                </div>
              )}
              {i > 0 && (
                <div className="flex items-center justify-between text-[11px] mt-0.5">
                  <span
                    className={s.accent ? "text-white/60" : "text-[var(--muted)]"}
                  >
                    of booked
                  </span>
                  <span
                    className={`tabular ${
                      s.accent ? "text-white/90" : "text-[var(--muted)]"
                    }`}
                  >
                    {(fromBooked * 100).toFixed(1)}%
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
