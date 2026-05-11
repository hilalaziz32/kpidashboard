import { createClient } from "@/lib/supabase/server";
import { MONTH_NAMES } from "@/lib/kpi";
import MonthSwitcher from "../month/month-switcher";
import { getActiveTenant } from "@/lib/active-tenant";

type DailyRow = {
  stat_date: string;
  emails_sent: number;
  sms_sent: number;
  email_prs: number;
  sms_prs: number;
};

export default async function MarketingPage({
  searchParams,
}: {
  searchParams: Promise<{ y?: string; m?: string }>;
}) {
  const params = await searchParams;
  const now = new Date();
  const year = params.y ? Number(params.y) : now.getFullYear();
  const month = params.m ? Number(params.m) : now.getMonth() + 1;

  const start = new Date(year, month - 1, 1).toISOString().slice(0, 10);
  const end = new Date(year, month, 1).toISOString().slice(0, 10);

  const supabase = await createClient();
  const active = await getActiveTenant();
  const tenantId = active?.clientId;

  if (!tenantId) {
    return (
      <div className="card p-12 text-center">
        <h2 className="text-xl font-semibold text-[var(--ink)]">No tenant selected</h2>
        <p className="text-sm text-[var(--muted)] mt-1">Pick a tenant from the sidebar.</p>
      </div>
    );
  }

  const { data: dailyRaw } = await supabase
    .from("daily_marketing_stats")
    .select("stat_date, emails_sent, sms_sent, email_prs, sms_prs")
    .eq("client_id", tenantId)
    .gte("stat_date", start)
    .lt("stat_date", end)
    .order("stat_date", { ascending: true });

  const daily = (dailyRaw ?? []) as DailyRow[];

  const totals = daily.reduce(
    (a, d) => ({
      emails: a.emails + d.emails_sent,
      sms: a.sms + d.sms_sent,
      emailPrs: a.emailPrs + d.email_prs,
      smsPrs: a.smsPrs + d.sms_prs,
    }),
    { emails: 0, sms: 0, emailPrs: 0, smsPrs: 0 }
  );
  const emailReplyRate = totals.emails ? totals.emailPrs / totals.emails : 0;
  const smsReplyRate = totals.sms ? totals.smsPrs / totals.sms : 0;

  // Weekly buckets (1-7, 8-14, 15-21, 22-28, 29-end)
  const monthEnd = new Date(year, month, 0).getDate();
  const weeks: {
    index: number;
    range: string;
    emails: number;
    sms: number;
    emailPrs: number;
    smsPrs: number;
  }[] = [];
  let day = 1;
  let idx = 1;
  while (day <= monthEnd) {
    const last = Math.min(day + 6, monthEnd);
    const sumOf = (key: keyof DailyRow) =>
      daily
        .filter((d) => {
          const dd = new Date(d.stat_date).getDate();
          return dd >= day && dd <= last;
        })
        .reduce((s, d) => s + (d[key] as number), 0);
    weeks.push({
      index: idx,
      range: `${MONTH_NAMES[month - 1].slice(0, 3)} ${day} – ${last}`,
      emails: sumOf("emails_sent"),
      sms: sumOf("sms_sent"),
      emailPrs: sumOf("email_prs"),
      smsPrs: sumOf("sms_prs"),
    });
    day = last + 1;
    idx += 1;
  }

  const hasData = daily.length > 0;

  return (
    <div className="space-y-8 rise">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <div className="text-[11px] uppercase tracking-[0.22em] text-[var(--muted)] mb-2">
            Marketing
          </div>
          <h1 className="text-[32px] leading-[1.1] font-semibold tracking-tight text-[var(--ink)]">
            {MONTH_NAMES[month - 1]}{" "}
            <span className="text-[var(--violet)]">{year}</span>
          </h1>
          <p className="text-[14px] text-[var(--muted)] mt-1.5">
            Email + SMS outreach activity. Pulled from your daily stats feed.
          </p>
        </div>
        <MonthSwitcher year={year} month={month} basePath="/dashboard/marketing" />
      </div>

      {/* Big totals */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat
          label="Emails Sent"
          value={totals.emails.toLocaleString()}
          sub={`${totals.emailPrs} positive · ${(emailReplyRate * 100).toFixed(2)}%`}
        />
        <Stat
          label="SMS Sent"
          value={totals.sms.toLocaleString()}
          sub={`${totals.smsPrs} positive · ${(smsReplyRate * 100).toFixed(2)}%`}
        />
        <Stat
          label="Email Positive Replies"
          value={totals.emailPrs.toLocaleString()}
          accent
        />
        <Stat
          label="SMS Positive Replies"
          value={totals.smsPrs.toLocaleString()}
          accent
        />
      </div>

      {/* Weekly breakdown */}
      <div className="card overflow-hidden">
        <div
          className="px-5 py-4 border-b"
          style={{ borderColor: "var(--border)" }}
        >
          <h3 className="text-[14px] font-semibold text-[var(--ink)]">
            Weekly breakdown
          </h3>
          <p className="text-[12px] text-[var(--muted)] mt-0.5">
            Same metrics, summed into 7-day windows.
          </p>
        </div>

        {!hasData ? (
          <div className="px-6 py-12 text-center text-[var(--muted)] text-[13px]">
            No marketing data for this month yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="text-left">
                  {[
                    { label: "Week", align: "left" },
                    { label: "Emails Sent", align: "right" },
                    { label: "SMS Sent", align: "right" },
                    { label: "Email PRs", align: "right" },
                    { label: "SMS PRs", align: "right" },
                    { label: "Email Reply %", align: "right" },
                    { label: "SMS Reply %", align: "right" },
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
                  const ePct = w.emails ? w.emailPrs / w.emails : 0;
                  const sPct = w.sms ? w.smsPrs / w.sms : 0;
                  const empty = w.emails + w.sms === 0;
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
                          Week {w.index}
                        </div>
                        <div className="text-[11px] text-[var(--muted)] mt-0.5 tabular">
                          {w.range}
                        </div>
                      </td>
                      <Cell>{w.emails.toLocaleString()}</Cell>
                      <Cell>{w.sms.toLocaleString()}</Cell>
                      <Cell>{w.emailPrs}</Cell>
                      <Cell>{w.smsPrs}</Cell>
                      <Cell>{(ePct * 100).toFixed(2)}%</Cell>
                      <Cell>{(sPct * 100).toFixed(2)}%</Cell>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div
      className="card p-5 relative overflow-hidden"
      style={
        accent
          ? {
              background:
                "linear-gradient(135deg, var(--violet) 0%, #4A22BD 100%)",
              borderColor: "transparent",
              color: "white",
            }
          : undefined
      }
    >
      {accent && (
        <div
          className="absolute -top-10 -right-10 w-32 h-32 rounded-full blur-2xl"
          style={{ background: "rgba(255,255,255,0.18)" }}
        />
      )}
      <div
        className={`text-[10px] uppercase tracking-[0.2em] ${
          accent ? "text-white/70" : "text-[var(--muted)]"
        }`}
      >
        {label}
      </div>
      <div
        className={`tabular text-[28px] font-semibold tracking-tight mt-2 ${
          accent ? "text-white" : "text-[var(--ink)]"
        }`}
      >
        {value}
      </div>
      {sub && (
        <div
          className={`text-[12px] mt-1 ${
            accent ? "text-white/70" : "text-[var(--muted)]"
          }`}
        >
          {sub}
        </div>
      )}
    </div>
  );
}

function Cell({ children }: { children: React.ReactNode }) {
  return (
    <td className="px-4 py-3 tabular text-right whitespace-nowrap text-[var(--text)]">
      {children}
    </td>
  );
}
