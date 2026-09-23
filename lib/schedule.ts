/**
 * Fits today's tasks into the gaps in the user's day.
 *
 * Pure, so it can be tested without a calendar: give it the busy intervals
 * (from Google Calendar, plus any slot the user has marked "busy then") and
 * the tasks in priority order, and it returns a suggested start and end for
 * each. Nothing is written back to the calendar — these are suggestions the
 * user can reject, which is what Josh asked for: "it would just be suggested
 * time… an option to tell it I'm busy during that time, and it can re-plan."
 */

export interface Interval { start: number; end: number }

export interface PlanInput<K extends string = string> {
  /** Tasks in the order they should be done — Next Action first. */
  tasks: { key: K; minutes?: number }[];
  /** Busy time from the calendar and from the user's own rejections. */
  busy: Interval[];
  /** Now. Nothing is suggested in the past. */
  now: number;
  /** Earliest hour a task may start, local time. Defaults to 7. */
  dayStartHour?: number;
  /** Latest hour a task may end, local time. Defaults to 22. */
  dayEndHour?: number;
  /** Breathing room kept either side of busy time and between tasks, in minutes. */
  gapMinutes?: number;
}

export interface PlanResult<K extends string = string> {
  slots: Record<K, Interval>;
  /** Tasks that did not fit anywhere today — said plainly, never squeezed in. */
  unplaced: K[];
}

const MIN = 60000;
/** Used when a task carries no estimate. */
export const DEFAULT_TASK_MINUTES = 30;
/** Suggestions start on a quarter hour, so "4:37 PM" never appears. */
const ROUND = 15 * MIN;

/** Sorts and merges overlapping intervals. */
export function mergeIntervals(list: Interval[]): Interval[] {
  const sorted = list
    .filter(i => i.end > i.start)
    .map(i => ({ ...i }))
    .sort((a, b) => a.start - b.start);
  const out: Interval[] = [];
  for (const i of sorted) {
    const last = out[out.length - 1];
    if (last && i.start <= last.end) last.end = Math.max(last.end, i.end);
    else out.push(i);
  }
  return out;
}

export function planDay<K extends string>(input: PlanInput<K>): PlanResult<K> {
  const gap = (input.gapMinutes ?? 10) * MIN;
  const day = new Date(input.now);

  const open = new Date(day);
  open.setHours(input.dayStartHour ?? 7, 0, 0, 0);
  const close = new Date(day);
  close.setHours(input.dayEndHour ?? 22, 0, 0, 0);

  // Round "now" up to the next quarter hour; never before the day opens.
  const from = Math.max(open.getTime(), Math.ceil(input.now / ROUND) * ROUND);

  // Everything already taken, with its breathing room.
  const taken = mergeIntervals(input.busy.map(b => ({ start: b.start - gap, end: b.end + gap })));

  const slots = {} as Record<K, Interval>;
  const unplaced: K[] = [];

  for (const t of input.tasks) {
    const len = Math.max(5, Math.round(t.minutes ?? DEFAULT_TASK_MINUTES)) * MIN;
    let cursor = from;
    let placed: Interval | null = null;

    for (const b of [...taken, { start: close.getTime(), end: Infinity }]) {
      if (cursor + len <= b.start && cursor + len <= close.getTime()) {
        placed = { start: cursor, end: cursor + len };
        break;
      }
      cursor = Math.max(cursor, Math.ceil(b.end / ROUND) * ROUND);
      if (cursor >= close.getTime()) break;
    }

    if (!placed) { unplaced.push(t.key); continue; }
    slots[t.key] = placed;
    // The task itself is now taken, gap included, so the next one follows it.
    taken.push({ start: placed.start - gap, end: placed.end + gap });
    taken.splice(0, taken.length, ...mergeIntervals(taken));
  }

  return { slots, unplaced };
}

/** "4:30 PM" in the user's locale. */
export function formatTime(ms: number): string {
  return new Date(ms).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}
