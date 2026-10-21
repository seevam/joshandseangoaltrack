import type { Goal } from './types';
import { activeTasks } from './stages';
import { dayKey } from './dates';
import { getGoalStatus } from './types';

/**
 * Learns when the user actually gets their work done.
 *
 * Reads the last few weeks of completions and finds recurring tasks that are
 * reliably missed on one particular weekday ("the long run never happens on a
 * Thursday") while being done on others. For each, it suggests the weekday the
 * user is most reliable on, so the plan can be bent to fit the person rather
 * than the person being nagged to fit the plan.
 *
 * Pure and deterministic, so the dashboard card, the coach's context and the
 * tests all see the same patterns.
 */

export const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export interface MissPattern {
  goalId: string;
  goalTitle: string;
  taskId: number;
  taskTitle: string;
  /** The weekday this task keeps being missed on. */
  weekday: number;
  missed: number;
  scheduled: number;
  /** How often the same task is done on its other days, 0–1. */
  otherRate: number;
  /** The weekday the user is most reliable on that this task isn't already on, if any. */
  suggestDay: number | null;
}

/** Enough occurrences of a weekday to call it a pattern rather than a bad week. */
const MIN_SAMPLES = 3;
/** Missed at least this often on the weak day… */
const MIN_MISS_RATE = 0.6;
/** …and done at least this much more often on its other days. */
const MIN_GAP = 0.3;
/** A day only counts as a good replacement if work gets done on it this often. */
const GOOD_DAY_RATE = 0.6;

const DAY = 86400000;

function scheduledOn(task: Goal['dailyTasks'][number], dow: number) {
  const days = task.daysOfWeek;
  return !days || days.length === 0 || days.includes(dow);
}

/** Walks finished days only — today is not over, so it can't be missed yet. */
function pastDays(goal: Goal, weeks: number, now: number): Date[] {
  const today = new Date(now); today.setHours(0, 0, 0, 0);
  const startRaw = goal.startDate ? new Date(goal.startDate) : new Date(goal.createdAt);
  const start = Number.isNaN(startRaw.getTime()) ? new Date(today.getTime() - weeks * 7 * DAY) : startRaw;
  start.setHours(0, 0, 0, 0);
  const out: Date[] = [];
  // Stepped by calendar date, not by 24h, so a DST change never skips a day.
  const d = new Date(Math.max(start.getTime(), today.getTime() - weeks * 7 * DAY));
  d.setHours(0, 0, 0, 0);
  for (; d < today; d.setDate(d.getDate() + 1)) out.push(new Date(d));
  return out;
}

/** Share of scheduled work actually completed on each weekday, across every goal. */
export function weekdayReliability(goals: Goal[], weeks = 8, now = Date.now()): { rate: number; samples: number }[] {
  const done = Array(7).fill(0);
  const due = Array(7).fill(0);
  for (const goal of goals) {
    for (const d of pastDays(goal, weeks, now)) {
      const end = new Date(d); end.setHours(23, 59, 59, 999);
      const logged = goal.taskCompletions?.[dayKey(d)] || {};
      for (const t of activeTasks(goal, end.getTime())) {
        if (!scheduledOn(t, d.getDay())) continue;
        due[d.getDay()]++;
        if (logged[t.id]) done[d.getDay()]++;
      }
    }
  }
  return due.map((n, i) => ({ rate: n ? done[i] / n : 0, samples: n }));
}

export function findMissPatterns(goals: Goal[], weeks = 8, now = Date.now()): MissPattern[] {
  const active = goals.filter(g => getGoalStatus(g) !== 'completed');
  const reliability = weekdayReliability(active, weeks, now);
  const out: MissPattern[] = [];

  for (const goal of active) {
    // Only tasks the user is still being asked to do.
    for (const task of activeTasks(goal)) {
      const due = Array(7).fill(0);
      const missed = Array(7).fill(0);
      for (const d of pastDays(goal, weeks, now)) {
        if (!scheduledOn(task, d.getDay())) continue;
        const end = new Date(d); end.setHours(23, 59, 59, 999);
        // Only days this task was actually live — not before its stage opened.
        if (!activeTasks(goal, end.getTime()).some(t => t.id === task.id)) continue;
        due[d.getDay()]++;
        if (!goal.taskCompletions?.[dayKey(d)]?.[task.id]) missed[d.getDay()]++;
      }

      for (let dow = 0; dow < 7; dow++) {
        if (due[dow] < MIN_SAMPLES) continue;
        const missRate = missed[dow] / due[dow];
        const otherDue = due.reduce((a, n, i) => (i === dow ? a : a + n), 0);
        const otherMissed = missed.reduce((a, n, i) => (i === dow ? a : a + n), 0);
        if (otherDue === 0) continue; // Done on only one day: nothing to compare against.
        const otherRate = 1 - otherMissed / otherDue;
        if (missRate < MIN_MISS_RATE || otherRate - (1 - missRate) < MIN_GAP) continue;

        // The most reliable weekday this task isn't already on.
        const taken = new Set(task.daysOfWeek?.length ? task.daysOfWeek : [0, 1, 2, 3, 4, 5, 6]);
        let suggestDay: number | null = null;
        for (let c = 0; c < 7; c++) {
          if (taken.has(c) || reliability[c].samples < MIN_SAMPLES || reliability[c].rate < GOOD_DAY_RATE) continue;
          if (suggestDay === null || reliability[c].rate > reliability[suggestDay].rate) suggestDay = c;
        }

        out.push({
          goalId: goal.id, goalTitle: goal.title,
          taskId: task.id, taskTitle: task.title,
          weekday: dow, missed: missed[dow], scheduled: due[dow],
          otherRate, suggestDay,
        });
      }
    }
  }

  return out.sort((a, b) => b.missed / b.scheduled - a.missed / a.scheduled).slice(0, 3);
}

/**
 * The task's new schedule once a pattern is acted on: the weak day dropped and
 * the suggested day added. A task scheduled "every day" becomes every day but
 * the weak one.
 */
export function rescheduledDays(task: Goal['dailyTasks'][number], p: MissPattern): number[] {
  const current = task.daysOfWeek?.length ? task.daysOfWeek : [0, 1, 2, 3, 4, 5, 6];
  const next = new Set(current.filter(d => d !== p.weekday));
  if (p.suggestDay !== null) next.add(p.suggestDay);
  return Array.from(next).sort((a, b) => a - b);
}

/** One line per pattern, for the coach to reason from. */
export function patternsContext(goals: Goal[]): string {
  const patterns = findMissPatterns(goals);
  if (!patterns.length) return '';
  return 'COMPLETION PATTERNS (learned from the last 8 weeks): '
    + patterns.map(p =>
      `"${p.taskTitle}" (${p.goalTitle}) is missed ${p.missed}/${p.scheduled} ${WEEKDAYS[p.weekday]}s`
      + ` but done ${Math.round(p.otherRate * 100)}% of the time on other days`
      + (p.suggestDay !== null ? `; ${WEEKDAYS[p.suggestDay]} is their most reliable day` : ''),
    ).join('; ')
    + '. When it is relevant, suggest restructuring around these (move or shrink that day’s work) rather than asking them to try harder.';
}
