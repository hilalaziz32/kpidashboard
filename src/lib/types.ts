export type LeadStatus =
  | "meeting booked"
  | "show"
  | "no show"
  | "not closed"
  | "proposal sent"
  | "won";

export const LEAD_STATUSES: LeadStatus[] = [
  "meeting booked",
  "show",
  "no show",
  "not closed",
  "proposal sent",
  "won",
];

export const STATUS_LABEL: Record<LeadStatus, string> = {
  "meeting booked": "Meeting Booked",
  show: "Show",
  "no show": "No Show",
  "not closed": "Not Closed",
  "proposal sent": "Proposal Sent",
  won: "Won",
};

export type Lead = {
  id: string;
  client_id: string;
  status: LeadStatus;
  full_name: string | null;
  email: string | null;
  company_name: string | null;
  website: string | null;
  phone: string | null;
  created_date: string;
  date_of_meeting: string | null;
  upfront_collected: number | null;
  mrr_collected: number | null;
  call_recording_url: string | null;
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
