import { Lead } from "./types";

export type KpiSummary = {
  meetingsBooked: number;
  upcomingMeetings: number;
  shows: number;
  noShows: number;
  proposalsSent: number;
  won: number;
  closingRate: number;
  proposalsActive: number;
  bookedToProposal: number;
  newClients: number;
  totalMrr: number;
  avgMrr: number;
  totalUpfront: number;
};

export function computeKpis(leads: Lead[], now = new Date()): KpiSummary {
  const total = leads.length;
  const upcoming = leads.filter(
    (l) =>
      l.status === "meeting_booked" &&
      l.date_of_meeting &&
      new Date(l.date_of_meeting) > now
  ).length;
  // cumulative logic: shows include show + proposal_sent + won
  const shows = leads.filter((l) =>
    ["show", "proposal_sent", "won"].includes(l.status)
  ).length;
  const noShows = leads.filter((l) => l.status === "no_show").length;
  // proposals sent counts proposal_sent + won
  const proposalsSent = leads.filter((l) =>
    ["proposal_sent", "won"].includes(l.status)
  ).length;
  const won = leads.filter((l) => l.status === "won").length;
  const proposalsActive = leads.filter((l) => l.status === "proposal_sent").length;

  const closingRate = proposalsSent ? won / proposalsSent : 0;
  const bookedToProposal = total ? proposalsSent / total : 0;

  const wonLeads = leads.filter((l) => l.status === "won");
  const totalMrr = wonLeads.reduce((s, l) => s + Number(l.mrr_collected || 0), 0);
  const totalUpfront = wonLeads.reduce(
    (s, l) => s + Number(l.upfront_collected || 0),
    0
  );
  const avgMrr = wonLeads.length ? totalMrr / wonLeads.length : 0;

  return {
    meetingsBooked: total,
    upcomingMeetings: upcoming,
    shows,
    noShows,
    proposalsSent,
    won,
    closingRate,
    proposalsActive,
    bookedToProposal,
    newClients: won,
    totalMrr,
    avgMrr,
    totalUpfront,
  };
}

export function fmtPct(v: number) {
  return `${(v * 100).toFixed(1)}%`;
}
export function fmtMoney(v: number) {
  return `$${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
