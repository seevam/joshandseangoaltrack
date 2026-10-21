import { getGoalProgress, type Goal } from './types';
import { activeTasks } from './stages';
import { dayKey } from './dates';

export interface GoalHealth {
  /** 0–100. Starts full and is spent by missed work. */
  score: number;
  status: 'Thriving' | 'Steady' | 'Slipping' | 'At Risk' | 'Stalled';
  color: string;
  /** Milestone completion as a percentage — the headline pace number. */
  completionRate: number;
  /** Where the goal *should* be by now given its timeline, or null if untimed. */
  expectedRate: number | null;
  /** Days since the last check-in or task completion, or null if never active. */
  daysSinceActivity: number | null;
  /** Human-readable explanations, most significant first. */
  reasons: string[];
  /** Days that ended with work left undone. */
  missedDays: number;
  /** Individual task instances missed across those days. */
  missedTasks: number;
  /** Milestones whose target date has passed while still open. */
  missedMilestones: number;
}

const TIERS: { min: number; status: GoalHealth['status']; color: string }[] = [
  { min: 85, status: 'Thriving', color: '#5DBC70' },
  { min: 65, status: 'Steady',   color: '#8FE3A3' },
  { min: 45, status: 'Slipping', color: '#FBBF24' },
  { min: 25, status: 'At Risk',  color: '#FB923C' },
  { min: 0,  status: 'Stalled',  color: '#F87171' },
];

const DAY = 86400000;

/*
 * Health is a balance out of 100, not a score out of a rubric.
 *
 * It opens at 100 the moment the goal is created and is only ever spent, by
 * days that ended with work left undone. The previous model graded a brand new
 * goal on pace, recency and check-in rhythm, all of which are necessarily zero
 * on day one — so every goal was born "Slipping", which told the user their
 * plan had failed before they had a chance to start it.
 *
 * Today is never judged: the day is not over, so nothing on it can be missed
 * yet. Only completed days can take points away.
 */

/*
 * Missed recurring work decays health exponentially rather than subtracting a
 * flat amount. Each day with work left undone multiplies health by (1 − rate),
 * and the rate grows with every consecutive missed day:
 *
 *   rate = BASE_DECAY × share of that day's tasks missed × GROWTH^(run − 1)
 *
 * One slip barely registers; a week of drift compounds fast. That is the
 * difference between "a bad day" and "this goal has been abandoned", which a
 * flat 1.5 points per task could never tell apart.
 */
/** Decay for a day with every task missed, on the first day of a run. */
export const BASE_DECAY = 0.05;
/** How much faster each consecutive missed day decays than the one before. */
export const DECAY_GROWTH = 1.35;
/** Ceiling on a single day's decay, so one day can never wipe a goal out. */
export const MAX_DAY_DECAY = 0.35;
/** A day cleared in full heals this share of the gap back to 100. */
export const CLEAR_DAY_HEAL = 0.08;
/** A missed milestone is a missed commitment, and costs accordingly. */
const MISS_MILESTONE = 8;
/** …growing while it stays open, up to this much on top. */
const MILESTONE_DRIFT_PER_DAY = 0.5;
const MAX_MILESTONE_PENALTY = 16;
/** Far enough back to be fair, near enough to stay cheap. */
const MAX_LOOKBACK_DAYS = 180;

const iso = (d: Date) => dayKey(d);

/**
 * Local midnight of a stored date, or null when there isn't a usable one.
 *
 * Goals store dates both ways — a bare "2026-09-23" from forms, a full
 * "2026-09-23T10:15:00.000Z" from the API — and appending "T00:00:00" to the
 * second produced an invalid date. Every figure downstream became NaN, and a
 * brand new goal showed "NaN/100, Stalled, 12 milestones past their date".
 */
function dayStartTs(value: string | null | undefined): number | null {
  if (!value) return null;
  const d = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T00:00:00`)      // bare date: local midnight, not UTC
    : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function startOfDay(ts: number) {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Most recent day the user did anything on this goal: checked in or logged a task. */
function lastActivity(goal: Goal): string | null {
  const days = [
    ...(goal.checkIns || []),
    ...Object.entries(goal.taskCompletions || {})
      .filter(([, tasks]) => Object.values(tasks).some(Boolean))
      .map(([date]) => date),
  ];
  if (!days.length) return null;
  return days.reduce((latest, d) => (d > latest ? d : latest));
}

export function computeGoalHealth(goal: Goal): GoalHealth {
  const now = Date.now();
  const progress = getGoalProgress(goal);
  const completionRate = Math.round(progress);
  const reasons: string[] = [];

  if (progress >= 100) {
    return {
      score: 100, status: 'Thriving', color: '#5DBC70',
      completionRate: 100, expectedRate: 100, daysSinceActivity: 0,
      reasons: ['Goal complete. Every milestone is done.'],
      missedDays: 0, missedTasks: 0, missedMilestones: 0,
    };
  }

  const startTs = dayStartTs(goal.startDate) ?? dayStartTs(goal.createdAt) ?? now;
  const endTs = dayStartTs(goal.endDate);

  // Kept for the card's "x% complete, y% expected by now" line. It is a
  // reference point the user can read, not a thing that moves the score.
  const expectedRate = endTs && endTs > startTs
    ? Math.round((Math.max(0, Math.min(now - startTs, endTs - startTs)) / (endTs - startTs)) * 100)
    : null;

  // ── Days that have already ended ────────────────────────────────────────
  const today = startOfDay(now);
  const firstDay = startOfDay(Math.max(startTs, now - MAX_LOOKBACK_DAYS * DAY));
  const completions = goal.taskCompletions || {};

  /** Health from recurring work alone, walked forward one finished day at a time. */
  let taskHealth = 100;
  let run = 0;
  let missedDays = 0;
  let missedTasks = 0;
  let clearedDays = 0;

  for (const cursor = new Date(firstDay); cursor < today; cursor.setDate(cursor.getDate() + 1)) {
    // Each day is judged against the stage the user was in ON that day — not
    // today's. Otherwise opening a new stage retroactively docks every past
    // day for tasks that did not exist yet, and never credits the old ones.
    const endOfDay = new Date(cursor); endOfDay.setHours(23, 59, 59, 999);
    const tasks = activeTasks(goal, endOfDay.getTime());
    const scheduled = tasks.filter(t => {
      const days = t.daysOfWeek;
      return !days || days.length === 0 || days.includes(cursor.getDay());
    });
    if (scheduled.length === 0) continue; // A rest day can't be missed, and doesn't break a run.

    const logged = completions[iso(cursor)] || {};
    const missed = scheduled.filter(t => !logged[t.id]).length;

    if (missed === 0) {
      clearedDays++;
      run = 0;
      // Heals towards 100 but never past it: credit never banks.
      taskHealth += (100 - taskHealth) * CLEAR_DAY_HEAL;
    } else {
      missedDays++;
      missedTasks += missed;
      run++;
      const rate = Math.min(BASE_DECAY * (missed / scheduled.length) * DECAY_GROWTH ** (run - 1), MAX_DAY_DECAY);
      taskHealth *= 1 - rate;
    }
  }

  // ── Milestones past their date ──────────────────────────────────────────
  let milestonePenalty = 0;
  let missedMilestones = 0;
  for (const m of goal.subtasks || []) {
    if (m.completed) continue;
    const due = startTs + (m.daysFromStart ?? 0) * DAY;
    if (due >= today.getTime()) continue;
    missedMilestones++;
    const daysLate = Math.floor((today.getTime() - due) / DAY);
    milestonePenalty += Math.min(
      MISS_MILESTONE + daysLate * MILESTONE_DRIFT_PER_DAY,
      MAX_MILESTONE_PENALTY,
    );
  }

  const raw = Math.round(taskHealth - milestonePenalty);
  const score = Number.isFinite(raw) ? Math.max(0, Math.min(100, raw)) : 100;

  // ── Reasons, most significant first ─────────────────────────────────────
  if (missedMilestones > 0) {
    reasons.push(
      `${missedMilestones} milestone${missedMilestones === 1 ? '' : 's'} past ${missedMilestones === 1 ? 'its' : 'their'} date and still open.`,
    );
  }
  if (missedDays > 0) {
    reasons.push(
      `${missedTasks} task${missedTasks === 1 ? '' : 's'} missed across ${missedDays} day${missedDays === 1 ? '' : 's'}.`,
    );
  }
  if (clearedDays > 0 && missedDays === 0) {
    reasons.push(`${clearedDays} day${clearedDays === 1 ? '' : 's'} cleared in full — nothing has slipped.`);
  } else if (clearedDays > 0) {
    reasons.push(`${clearedDays} day${clearedDays === 1 ? '' : 's'} cleared in full, which is holding the score up.`);
  }
  if (endTs && now > endTs) {
    reasons.push(`The deadline has passed with ${100 - completionRate}% still to go.`);
  } else if (endTs && expectedRate !== null && expectedRate - completionRate >= 25) {
    reasons.push(`Behind the timeline: ${completionRate}% done where it expects ${expectedRate}%.`);
  }
  if (reasons.length === 0) {
    reasons.push('Nothing missed yet. Health only moves at the end of a day with work left undone.');
  }

  const last = lastActivity(goal);
  const daysSinceActivity = last
    ? Math.max(0, Math.floor((now - new Date(`${last}T12:00:00`).getTime()) / DAY))
    : null;

  const tier = TIERS.find(t => score >= t.min) ?? TIERS[TIERS.length - 1];

  return {
    score,
    status: tier.status,
    color: tier.color,
    completionRate,
    expectedRate,
    daysSinceActivity,
    reasons,
    missedDays,
    missedTasks,
    missedMilestones,
  };
}
