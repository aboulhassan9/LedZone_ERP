// Pure date-range helpers, no server-only dependency -- shared by both the authenticated
// generation path (modules/reports/services/financial-snapshot-service.ts) and the
// cron Route Handlers (app/api/cron/financial-reports/*), which have no request context to
// derive "now" from beyond the server clock.

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// Monday-Sunday, matching how most of the world (and this company, in Kinshasa) counts a
// work week -- not the JS Date default of Sunday-first.
export function getWeekRange(referenceDate: Date): { start: string; end: string } {
  const day = referenceDate.getUTCDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(referenceDate);
  monday.setUTCDate(referenceDate.getUTCDate() + diffToMonday);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  return { start: toIsoDate(monday), end: toIsoDate(sunday) };
}

export function getMonthRange(referenceDate: Date): { start: string; end: string } {
  const firstDay = new Date(Date.UTC(referenceDate.getUTCFullYear(), referenceDate.getUTCMonth(), 1));
  const lastDay = new Date(Date.UTC(referenceDate.getUTCFullYear(), referenceDate.getUTCMonth() + 1, 0));
  return { start: toIsoDate(firstDay), end: toIsoDate(lastDay) };
}

// "The week/month that just finished" -- what a Monday-morning or 1st-of-month cron actually
// wants, since the period it fires in is still in progress.
export function getPreviousWeekRange(now: Date = new Date()): { start: string; end: string } {
  const lastWeek = new Date(now);
  lastWeek.setUTCDate(now.getUTCDate() - 7);
  return getWeekRange(lastWeek);
}

export function getPreviousMonthRange(now: Date = new Date()): { start: string; end: string } {
  const lastMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  return getMonthRange(lastMonth);
}
