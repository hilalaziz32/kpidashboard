import { Lead } from "./types";

export type KpiSummary = {
  meetingsBooked: number;
  upcomingMeetings: number;
  shows: number;
  noShows: number;
  notClosed: number;
  nextStageOrBeyond: number;
  proposalsSent: number;
  won: number;
  lost: number;
  future: number;
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
      l.status === "meeting booked" &&
      l.date_of_meeting &&
      new Date(l.date_of_meeting) > now
  ).length;
  // Anyone who actually showed up to a call.
  const shows = leads.filter((l) =>
    ["show", "not closed", "next stage", "proposal sent", "verbal agreement", "won", "lost", "future"].includes(l.status)
  ).length;
  const noShows = leads.filter((l) => l.status === "no show").length;
  // "not closed" is the DB value; UI labels it "Unqualified".
  const notClosed = leads.filter((l) => l.status === "not closed").length;
  // Proposals: anyone who got a proposal — proposal sent, verbal agreement, won, lost, or future.
  // Lost/future leads typically had a proposal in flight.
  const proposalsSent = leads.filter((l) =>
    ["proposal sent", "verbal agreement", "won", "lost", "future"].includes(l.status)
  ).length;
  const won = leads.filter((l) => l.status === "won").length;
  const lost = leads.filter((l) => l.status === "lost").length;
  const future = leads.filter((l) => l.status === "future").length;
  // Reached "next stage" or beyond — used for funnel conversion.
  const nextStageOrBeyond = leads.filter((l) =>
    ["next stage", "proposal sent", "verbal agreement", "won", "lost", "future"].includes(l.status)
  ).length;
  // Active proposals = proposal sent and not yet decided.
  const proposalsActive = leads.filter((l) => l.status === "proposal sent").length;

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
    notClosed,
    nextStageOrBeyond,
    proposalsSent,
    won,
    lost,
    future,
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
