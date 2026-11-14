/**
 * Calendar dates, kept as ISO strings (yyyy-mm-dd). In that form they compare
 * chronologically as plain strings and carry no time zone.
 */

/** Whether the value is an existing calendar date written yyyy-mm-dd. */
export function isIsoDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  // Impossible dates (e.g. 2026-02-30) roll over to another day
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

/** Formats an ISO date the way users read it: dd/mm/yyyy. */
export function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-');
  return `${day}/${month}/${year}`;
}
