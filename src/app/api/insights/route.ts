import { NextRequest, NextResponse } from "next/server";
import { authorize } from "@/lib/insights";
import { LEAD_STATUSES, STATUS_LABEL } from "@/lib/types";

export const dynamic = "force-dynamic";

// GET /api/insights — index. Self-describing so an agent can discover every
// endpoint and valid filter value in one call before querying anything.
export async function GET(req: NextRequest) {
  const denied = authorize(req);
  if (denied) return denied;

  return NextResponse.json({
    description:
      "Read-only insights API for the clients-kpis dashboard. All endpoints are GET, never mutate data, and accept the same filter params.",
    auth: "Send 'Authorization: Bearer <INSIGHTS_TOKEN>' (or ?token=<INSIGHTS_TOKEN>).",
    commonParams: {
      client:
        "Comma-separated client slug, name or uuid. Omit for all clients. e.g. client=chamber-media,go-fish-digital",
      from: "Inclusive ISO date lower bound, e.g. 2026-07-01",
      to: "Exclusive ISO date upper bound, e.g. 2026-08-01",
      dateField:
        "Which date the from/to range filters on: date_of_meeting (default) | created_date | call_scheduled_for",
    },
    endpoints: {
      "GET /api/insights/clients":
        "Every client with lead counts, funnel, revenue and target pacing. Best starting point.",
      "GET /api/insights/kpis":
        "KPI rollup for the filtered set. Add groupBy=month|client|status for a breakdown.",
      "GET /api/insights/leads":
        "Individual lead rows. Params: status, category (meeting|pr), q (name/company/email search), limit (default 200, max 2000), offset, fields=slim.",
      "GET /api/insights/funnel":
        "Stage-by-stage funnel with conversion rates between each step.",
      "GET /api/insights/marketing":
        "Email/SMS volume and positive replies, monthly or daily (granularity=month|day).",
      "GET /api/insights/revenue":
        "Won deals with upfront/MRR, totals and averages, grouped by client or month.",
    },
    enums: {
      leadStatus: LEAD_STATUSES,
      statusLabels: STATUS_LABEL,
      category: ["meeting", "pr"],
      source: ["email", "sms"],
    },
    notes: [
      "meetingsBooked counts every lead EXCEPT status 'lost' (a normal Lost is treated as never having become a real meeting).",
      "'post_meeting_lost' and 'rescheduled' DO count as booked. 'post_meeting_lost' also counts as a show; 'rescheduled' does not.",
      "The UI labels the 'not closed' status as 'Unqualified'.",
      "Revenue (upfront_collected / mrr_collected) is only counted for status 'won'.",
    ],
    examples: [
      "/api/insights/clients",
      "/api/insights/kpis?groupBy=month&client=chamber-media",
      "/api/insights/leads?status=won&from=2026-01-01",
      "/api/insights/funnel?client=growth-lab&from=2026-05-01&to=2026-08-01",
    ],
  });
}
