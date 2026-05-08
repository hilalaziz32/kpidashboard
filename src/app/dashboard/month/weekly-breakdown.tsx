import { computeKpis, fmtMoney, fmtPct } from "@/lib/kpi";
import { Lead } from "@/lib/types";

type WeekBucket = {
  index: number;
  start: Date;
  end: Date;
  label: string;
  range: string;
  leads: Lead[];
};

function buildWeeks(year: number, month: number, leads: Lead[]): WeekBucket[] {
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0);
  const totalDays = monthEnd.getDate();

  const buckets: WeekBucket[] = [];
  let dayCursor = 1;
  let idx = 1;
  while (dayCursor <= totalDays) {
    const start = new Date(year, month - 1, dayCursor);
    const endDay = Math.min(dayCursor + 6, totalDays);
    const end = new Date(year, month - 1, endDay, 23, 59, 59, 999);
    buckets.push({
      index: idx,
      start,
      end,
      label: `Week ${idx}`,
      range: `${monthShort(start)} – ${monthShort(end)}`,
      leads: [],
    });
    dayCursor = endDay + 1;
    idx += 1;
  }

  for (const l of leads) {
    if (!l.date_of_meeting) continue;
    const d = new Date(l.date_of_meeting);
    const bucket = buckets.find((b) => d >= b.start && d <= b.end);
    if (bucket) bucket.leads.push(l);
  }
  return buckets;
}

function monthShort(d: Date) {
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function WeeklyBreakdown({
  leads,
  year,
  month,
}: {
  leads: Lead[];
  year: number;
  month: number;
}) {
  const weeks = buildWeeks(year, month, leads);
  const hasAny = weeks.some((w) => w.leads.length > 0);

  return (
    <div className="card overflow-hidden">
      <div
        className="px-5 py-4 border-b flex items-center justify-between"
        style={{ borderColor: "var(--border)" }}
      >
        <div>
          <h3 className="text-[14px] font-semibold text-[var(--ink)]">
            Weekly breakdown
          </h3>
          <p className="text-[12px] text-[var(--muted)] mt-0.5">
            Same KPIs, grouped into 7-day windows.
          </p>
        </div>
      </div>

      {!hasAny ? (
        <div className="px-6 py-12 text-center text-[var(--muted)] text-[13px]">
          No leads for this month yet.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-left">
                {[
                  { label: "Week", align: "left" },
                  { label: "Booked", align: "right" },
                  { label: "Shows", align: "right" },
                  { label: "No Shows", align: "right" },
                  { label: "Unqualified", align: "right" },
                  { label: "Proposals", align: "right" },
                  { label: "Won", align: "right" },
                  { label: "Close Rate", align: "right" },
                  { label: "MRR", align: "right" },
                  { label: "Upfront", align: "right" },
                ].map((h) => (
                  <th
                    key={h.label}
                    className={`px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)] whitespace-nowrap ${
                      h.align === "right" ? "text-right" : "text-left"
                    }`}
                    style={{ borderBottom: "1px solid var(--border)" }}
                  >
                    {h.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {weeks.map((w) => {
                const k = computeKpis(w.leads);
                const empty = w.leads.length === 0;
                return (
                  <tr
                    key={w.index}
                    className={`hover:bg-[var(--violet-50)]/40 transition ${
                      empty ? "opacity-50" : ""
                    }`}
                    style={{ borderTop: "1px solid var(--border)" }}
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-[var(--ink)]">
                        {w.label}
                      </div>
                      <div className="text-[11px] text-[var(--muted)] mt-0.5 tabular">
                        {w.range}
                      </div>
                    </td>
                    <Cell>{k.meetingsBooked}</Cell>
                    <Cell>{k.shows}</Cell>
                    <Cell>{k.noShows}</Cell>
                    <Cell>{k.notClosed}</Cell>
                    <Cell>{k.proposalsSent}</Cell>
                    <Cell>
                      <span className="inline-flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        {k.won}
                      </span>
                    </Cell>
                    <Cell>{fmtPct(k.closingRate)}</Cell>
                    <Cell strong>{fmtMoney(k.totalMrr)}</Cell>
                    <Cell>{fmtMoney(k.totalUpfront)}</Cell>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Cell({
  children,
  strong,
}: {
  children: React.ReactNode;
  strong?: boolean;
}) {
  return (
    <td
      className={`px-4 py-3 tabular text-right whitespace-nowrap ${
        strong ? "text-[var(--ink)] font-medium" : "text-[var(--text)]"
      }`}
    >
      {children}
    </td>
  );
}
