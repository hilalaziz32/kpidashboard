export type LeadStatus =
  | "meeting booked"
  | "rescheduled"
  | "show"
  | "no show"
  | "not closed"
  | "next stage"
  | "proposal sent"
  | "verbal agreement"
  | "won"
  | "lost"
  | "post_meeting_lost";

export const LEAD_STATUSES: LeadStatus[] = [
  "meeting booked",
  "rescheduled",
  "no show",
  "not closed",
  "show",
  "next stage",
  "proposal sent",
  "verbal agreement",
  "won",
  "lost",
  "post_meeting_lost",
];

export const STATUS_LABEL: Record<LeadStatus, string> = {
  "meeting booked": "Meeting Booked",
  rescheduled: "Rescheduled",
  show: "Show",
  "no show": "No Show",
  "not closed": "Unqualified",
  "next stage": "Next Stage",
  "proposal sent": "Proposal Sent",
  "verbal agreement": "Verbal Agreement",
  won: "Won",
  lost: "Lost",
  post_meeting_lost: "Post Meeting Lost",
};

export type LeadCategory = "meeting" | "pr";
export type LeadSource = "email" | "sms";

export const SOURCE_LABEL: Record<LeadSource, string> = {
  email: "Email",
  sms: "SMS",
};

export type Lead = {
  id: string;
  client_id: string;
  category: LeadCategory;
  source: LeadSource | null;
  status: LeadStatus;
  full_name: string | null;
  email: string | null;
  company_name: string | null;
  website: string | null;
  phone: string | null;
  created_date: string;
  date_of_meeting: string | null;
  call_scheduled_for: string | null;
  closed_date: string | null;
  upfront_collected: number | null;
  mrr_collected: number | null;
  deal_size_monthly: number | null;
  deal_size_annual: number | null;
  call_recording_url: string | null;
  notes: string | null;
  campaign_name: string | null;
  conversation_history: string | null;
};

export type Client = {
  id: string;
  name: string;
  slug: string;
  kpi_target_meetings: number;
};

export type MarketingStats = {
  emails_sent: number;
  sms_sent: number;
  email_prs: number;
  sms_prs: number;
};
