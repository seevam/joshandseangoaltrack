/**
 * The calendar day a moment falls on, where the user is, as "YYYY-MM-DD".
 *
 * Every day-keyed record in the app — task completions, check-ins, streaks,
 * health — must agree on what "today" is. It did not. Most places used
 * `new Date().toISOString().split('T')[0]`, which is the date in UTC, not
 * the user's date:
 *
 *  - West of UTC, finishing a task at 8pm in California stored it under
 *    tomorrow, so today read as missed and health dropped.
 *  - East of UTC, local midnight is the previous UTC day, so health checked
 *    each day against the day before's completions.
 *
 * Built from local calendar fields, so it is the user's day by construction.
 */
export function dayKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Local midnight of the given moment. */
export function startOfLocalDay(d: Date = new Date()): Date {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}
