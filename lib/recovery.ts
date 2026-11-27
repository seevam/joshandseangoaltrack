import type { Goal, Subtask, DailyTask } from './types';
import { activeTasks } from './stages';
import { dayKey } from './dates';

/**
 * Recovery Mode: rebuild a slipping goal's plan in place, without starting over.
 *
 * What a recovery changes:
 *  1. Timeline — if any milestone is overdue, every open milestone is re-dated
 *     from today: the first a few days out, the rest spread evenly to the
 *     deadline, at least MIN_GAP days apart. If they no longer fit, the
 *     deadline moves out just far enough.
 *  2. Daily targets — each live recurring task the user has been missing
 *     (done on under STRUGGLING of its scheduled days lately) gets lighter:
 *     shorter (×0.7 minutes) and, if it runs more than three days a week, on
 *     fewer days — the days it was missed most are the ones dropped.
 *  3. Health — `recovery.at` is stamped, so health only judges days after it,
 *     and with no milestone overdue, pace is back to full.
 *
 * Pure: give it the goal and a time and it returns the new fields plus a
 * plain-English list of what changed. The AI's tailored version (when the
 * user explains what happened) goes through applyAiAdjustments, which only
 * accepts changes inside the same safe bounds.
 */

const DAY = 86400000;
/** Days from today until the first re-dated milestone. */
export const FIRST_MILESTONE_IN = 3;
/** Minimum days between re-dated milestones. */
export const MIN_GAP = 5;
/** Below this completion rate a task counts as being missed. */
export const STRUGGLING = 0.6;
const LOOKBACK = 14;
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export interface RecoveryPlan {
  subtasks: Subtask[];
  dailyTasks: DailyTask[];
  endDate: string | null;
  recovery: { at: string };
  /** What changed, for the user — one line each. */
  changes: string[];
}

function midnight(ts: number) {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function startTs(goal: Goal, now: number) {
  const raw = goal.startDate ?? goal.createdAt;
  const d = raw ? new Date(/^\d{4}-\d{2}-\d{2}$/.test(raw) ? `${raw}T00:00:00` : raw) : new Date(now);
  return midnight(Number.isNaN(d.getTime()) ? now : d.getTime());
}

const fmt = (ts: number) => new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

/** Per-weekday scheduled/done counts for one task over the last LOOKBACK finished days. */
function taskRecord(goal: Goal, task: DailyTask, now: number) {
  const due = Array(7).fill(0);
  const done = Array(7).fill(0);
  const start = startTs(goal, now);
  const today = midnight(now);
  const from = new Date(Math.max(start, today - LOOKBACK * DAY));
  from.setHours(0, 0, 0, 0);
  for (const d = from; d.getTime() < today; d.setDate(d.getDate() + 1)) {
    const dow = d.getDay();
    if (task.daysOfWeek?.length && !task.daysOfWeek.includes(dow)) continue;
    const end = new Date(d); end.setHours(23, 59, 59, 999);
    if (!activeTasks(goal, end.getTime()).some(t => t.id === task.id)) continue;
    due[dow]++;
    if (goal.taskCompletions?.[dayKey(d)]?.[task.id]) done[dow]++;
  }
  return { due, done };
}

export function buildRecoveryPlan(goal: Goal, now = Date.now()): RecoveryPlan {
  const changes: string[] = [];
  const start = startTs(goal, now);
  const today = midnight(now);
  const todayIdx = Math.round((today - start) / DAY);
  const endRaw = goal.endDate ? new Date(goal.endDate).getTime() : NaN;
  let endIdx = Number.isFinite(endRaw) ? Math.round((midnight(endRaw) - start) / DAY) : NaN;

  // ── 1. Timeline ─────────────────────────────────────────────────────────
  const subtasks = (goal.subtasks || []).map(m => ({ ...m }));
  const open = subtasks
    .map((m, i) => ({ m, i }))
    .filter(x => !x.m.completed)
    .sort((a, b) => (a.m.daysFromStart ?? 0) - (b.m.daysFromStart ?? 0) || a.i - b.i);
  const overdue = open.filter(x => (x.m.daysFromStart ?? 0) < todayIdx).length;

  if (open.length && overdue > 0) {
    const first = todayIdx + FIRST_MILESTONE_IN;
    if (!Number.isFinite(endIdx)) endIdx = first + Math.max(open.length - 1, 0) * 7;
    const needed = first + (open.length - 1) * MIN_GAP;
    if (endIdx < needed) {
      changes.push(`Deadline moved from ${Number.isFinite(endRaw) ? fmt(endRaw) : 'none'} to ${fmt(start + needed * DAY)} so the remaining milestones fit.`);
      endIdx = needed;
    }
    const step = open.length > 1 ? (endIdx - first) / (open.length - 1) : 0;
    open.forEach((x, k) => { subtasks[x.i] = { ...x.m, daysFromStart: Math.round(first + step * k) }; });
    changes.push(
      `${overdue} overdue milestone${overdue === 1 ? '' : 's'} re-dated; next one, "${open[0].m.title}", is now due ${fmt(start + first * DAY)}`
      + (open.length > 1 ? `, with the other ${open.length - 1} spread to ${fmt(start + endIdx * DAY)}.` : '.'),
    );
  }

  // ── 2. Daily targets ────────────────────────────────────────────────────
  const live = new Set(activeTasks(goal).map(t => t.id));
  const dailyTasks = (goal.dailyTasks || []).map(t => {
    if (!live.has(t.id)) return t;
    const { due, done } = taskRecord(goal, t, now);
    const scheduled = due.reduce((a, b) => a + b, 0);
    if (scheduled < 2) return t; // Too little history to judge.
    const rate = done.reduce((a, b) => a + b, 0) / scheduled;
    if (rate >= STRUGGLING) return t;

    const next: DailyTask = { ...t };
    const parts: string[] = [];
    if (typeof t.estimatedMinutes === 'number' && t.estimatedMinutes > 10) {
      next.estimatedMinutes = Math.max(10, Math.round((t.estimatedMinutes * 0.7) / 5) * 5);
      parts.push(`${t.estimatedMinutes} → ${next.estimatedMinutes} min`);
    }
    const days = t.daysOfWeek?.length ? t.daysOfWeek : [0, 1, 2, 3, 4, 5, 6];
    if (days.length > 3) {
      const keep = Math.max(3, Math.ceil(days.length * 0.6));
      // Drop the days it was missed on most (then the least-done ones).
      const ranked = [...days].sort((a, b) =>
        (due[b] - done[b]) - (due[a] - done[a]) || done[a] - done[b] || a - b);
      const dropped = ranked.slice(0, days.length - keep);
      next.daysOfWeek = days.filter(d => !dropped.includes(d)).sort((a, b) => a - b);
      parts.push(`${days.length} → ${keep} days a week (dropped ${dropped.sort((a, b) => a - b).map(d => WEEKDAYS[d]).join(', ')})`);
    }
    if (parts.length) changes.push(`"${t.title}" lightened: ${parts.join(', ')}. Done ${Math.round(rate * 100)}% of the time lately.`);
    return next;
  });

  // ── 3. Health ───────────────────────────────────────────────────────────
  changes.push('Health reset: missed days before today no longer count.');

  const endDate = Number.isFinite(endIdx)
    ? (endIdx === Math.round((midnight(endRaw) - start) / DAY) ? goal.endDate : new Date(start + endIdx * DAY).toISOString())
    : goal.endDate;

  return { subtasks, dailyTasks, endDate, recovery: { at: new Date(now).toISOString() }, changes };
}

/** What the AI may send back to tailor a recovery to the user's explanation. */
export interface AiRecovery {
  summary?: string;
  tasks?: { id: number; title?: string; daysOfWeek?: number[]; estimatedMinutes?: number }[];
  milestones?: { id: number; title?: string; daysFromStart?: number }[];
}

/**
 * Lays the AI's tailoring over the baseline plan, keeping only changes inside
 * safe bounds: known ids, open milestones dated after today, real weekdays,
 * sane minutes and titles. Anything else is ignored rather than trusted. The
 * deadline moves out if a milestone now lands past it.
 */
export function applyAiAdjustments(goal: Goal, plan: RecoveryPlan, ai: AiRecovery, now = Date.now()): RecoveryPlan {
  const start = startTs(goal, now);
  const todayIdx = Math.round((midnight(now) - start) / DAY);
  const changes = [...plan.changes];
  const clean = (s: unknown, max: number) => (typeof s === 'string' && s.trim() ? s.trim().slice(0, max) : undefined);

  const dailyTasks = plan.dailyTasks.map(t => {
    const a = ai.tasks?.find(x => Number(x.id) === t.id);
    if (!a) return t;
    const next = { ...t };
    const title = clean(a.title, 120);
    if (title && title !== t.title) { next.title = title; changes.push(`"${t.title}" is now "${title}".`); }
    if (Array.isArray(a.daysOfWeek)) {
      const days = Array.from(new Set(a.daysOfWeek.map(Number).filter(d => Number.isInteger(d) && d >= 0 && d <= 6))).sort((x, y) => x - y);
      if (days.length) next.daysOfWeek = days;
    }
    if (typeof a.estimatedMinutes === 'number' && Number.isFinite(a.estimatedMinutes)) {
      next.estimatedMinutes = Math.min(Math.max(Math.round(a.estimatedMinutes), 5), 240);
    }
    // The coach's schedule replaces the standard one, so its line replaces
    // the standard line rather than contradicting it.
    if (next.daysOfWeek !== t.daysOfWeek || next.estimatedMinutes !== t.estimatedMinutes) {
      const at = changes.findIndex(c => c.startsWith(`"${t.title}" lightened`));
      if (at >= 0) changes.splice(at, 1);
      const days = next.daysOfWeek?.length && next.daysOfWeek.length < 7 ? next.daysOfWeek.map(d => WEEKDAYS[d]).join(', ') : 'every day';
      changes.push(`"${next.title}" now runs ${days}${next.estimatedMinutes ? `, ${next.estimatedMinutes} min` : ''}.`);
    }
    return next;
  });

  let latest = 0;
  const subtasks = plan.subtasks.map(m => {
    const a = ai.milestones?.find(x => Number(x.id) === m.id);
    if (!a || m.completed) { latest = Math.max(latest, m.daysFromStart ?? 0); return m; }
    const next = { ...m };
    const title = clean(a.title, 160);
    if (title && title !== m.title) { next.title = title; changes.push(`Milestone "${m.title}" is now "${title}".`); }
    if (typeof a.daysFromStart === 'number' && Number.isFinite(a.daysFromStart)) {
      next.daysFromStart = Math.max(todayIdx + 1, Math.round(a.daysFromStart));
    }
    latest = Math.max(latest, next.daysFromStart ?? 0);
    return next;
  });

  let endDate = plan.endDate;
  const endIdx = endDate ? Math.round((midnight(new Date(endDate).getTime()) - start) / DAY) : NaN;
  if (Number.isFinite(endIdx) && latest > endIdx) {
    endDate = new Date(start + latest * DAY).toISOString();
    changes.push(`Deadline moved to ${fmt(start + latest * DAY)} to fit the tailored plan.`);
  }

  const summary = clean(ai.summary, 400);
  return { ...plan, subtasks, dailyTasks, endDate, changes: summary ? [summary, ...changes] : changes };
}
