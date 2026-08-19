---
name: client-crm
description: Read and edit the Scaletopia client CRM dashboard (meetings, pipeline, funnel, revenue, outreach stats). Use when asked about client performance, meetings booked, show rates, close rates, revenue/MRR, pipeline health, which clients are under target, or any question about leads and deals — and when asked to update a lead's status, revenue or notes, add or edit a client, or change a KPI target.
---

# Client CRM

Two APIs on the same dashboard, sharing one token:

- **`/api/insights`** — reading. GET only, never mutates, safe to call freely.
- **`/api/crm`** — writing. Edits leads and clients.

## Access

```
Read base:  https://clients.scaletopia.online/api/insights
Write base: https://clients.scaletopia.online/api/crm
Header:     Authorization: Bearer insights_PWUzYeFT9bsS3hxXGLY27NEmspnlKfUQ
```

`?token=<token>` also works if setting a header is awkward. The same token
authenticates both, so a read call and an edit call look identical apart from
the path and HTTP method.

**Always call `GET /api/insights` first.** It self-documents every endpoint,
filter and enum, so you never have to guess field names. `GET /api/crm` does
the same for the write side.

```bash
curl -H "Authorization: Bearer insights_PWUzYeFT9bsS3hxXGLY27NEmspnlKfUQ" \
  "https://clients.scaletopia.online/api/insights"
```

## Endpoints

| Endpoint | Use it for |
|---|---|
| `/api/insights` | Index — endpoints, enums, caveats. Start here. |
| `/api/insights/clients` | One row per client: booked, shows, won, revenue, target pacing. Best overview. |
| `/api/insights/kpis` | Headline metrics. `groupBy=month\|client\|status` |
| `/api/insights/leads` | Individual lead rows. `status=`, `category=`, `q=` search, `fields=slim`, `limit=`, `offset=` |
| `/api/insights/funnel` | Stage-by-stage conversion + drop-off. `groupBy=client` |
| `/api/insights/revenue` | Won deals, totals, averages. `groupBy=month\|client` |
| `/api/insights/marketing` | Email/SMS sent and positive replies. `granularity=month\|day` |

## Shared filters

Every endpoint accepts:

- `client=` — slug, name or uuid; comma-separated for several. Omit for all clients.
- `from=` / `to=` — ISO dates. `from` inclusive, `to` exclusive.
- `dateField=` — which date the range filters on: `date_of_meeting` (default),
  `created_date`, or `call_scheduled_for`.

```bash
# One client, one quarter, month by month
".../api/insights/kpis?client=chamber-media&from=2026-05-01&to=2026-08-01&groupBy=month"

# Every won deal this year, biggest MRR first
".../api/insights/revenue?from=2026-01-01&groupBy=client"

# Where is the funnel leaking, per client?
".../api/insights/funnel?groupBy=client"
```

## How the metrics are defined

Read this before interpreting numbers — several statuses behave unintuitively.

- **`meetingsBooked` = every lead EXCEPT status `lost`.** A plain "Lost" is
  treated as never having become a real meeting.
- **`post_meeting_lost`** counts as booked **and** as a show (the call happened,
  the deal died afterwards).
- **`rescheduled`** counts as booked but **not** as a show (hasn't happened yet).
- **`shows`** = show, not closed, next stage, proposal sent, verbal agreement,
  won, post_meeting_lost.
- **Revenue is only counted on status `won`** (`upfront_collected`, `mrr_collected`).
- The status `not closed` is labelled **"Unqualified"** in the UI.
- `closingRate` = won ÷ proposalsSent (not ÷ booked). `showRate` = shows ÷ booked.

Statuses: `meeting booked`, `rescheduled`, `show`, `no show`, `not closed`,
`next stage`, `proposal sent`, `verbal agreement`, `won`, `lost`, `post_meeting_lost`.

Categories: `meeting` (sales calls) and `pr` (positive replies). KPI endpoints
count `meeting` only; use `/leads?category=pr` for outreach replies.

## Answering questions well

1. Start with `/clients` to see the landscape, then drill into one client.
2. Quote the concrete numbers and name the clients — never generalise vaguely.
3. When something looks wrong, pull the underlying rows with `/leads` and check
   before concluding. Counts and raw rows should agree.
4. `targetAttainment` on `/clients` is booked ÷ monthly target — the quickest
   read on who is behind.
5. Data flows from Airtable, so a very recent change may not have synced yet.
   If a figure looks stale, say so rather than treating it as final.
