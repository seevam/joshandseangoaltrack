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
 * Health is a balance, not a score out of a rubric.
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

/** One skipped daily task. Small on purpose — a missed task is a bad day, not a crisis. */
const MISS_TASK = 1.5;
/** Ceiling per day, so a goal with ten daily tasks can't lose everything in one go. */
const MAX_DAY_PENALTY = 6;
/** A missed milestone is a missed commitment, and costs accordingly. */
const MISS_MILESTONE = 8;
/** …growing while it stays open, up to this much on top. */
const MILESTONE_DRIFT_PER_DAY = 0.5;
const MAX_MILESTONE_PENALTY = 16;
/** A day cleared in full pays a little back, so health can be rebuilt. */
const CLEAR_DAY_CREDIT = 1;
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
  // Only the live stage's work counts. Penalising for tasks that belong to a
  // phase the user has finished would mean the app docks you for missing
  // something it stopped asking you to do.
  const tasks = activeTasks(goal);
  const completions = goal.taskCompletions || {};

  let dayPenalty = 0;
  let credit = 0;
  let missedDays = 0;
  let missedTasks = 0;
  let clearedDays = 0;

  for (const cursor = new Date(firstDay); cursor < today; cursor.setDate(cursor.getDate() + 1)) {
    const scheduled = tasks.filter(t => {
      const days = t.daysOfWeek;
      return !days || days.length === 0 || days.includes(cursor.getDay());
    });
    if (scheduled.length === 0) continue; // A rest day can't be missed.

    const logged = completions[iso(cursor)] || {};
    const missed = scheduled.filter(t => !logged[t.id]).length;

    if (missed === 0) {
      clearedDays++;
      credit += CLEAR_DAY_CREDIT;
    } else {
      missedDays++;
      missedTasks += missed;
      dayPenalty += Math.min(missed * MISS_TASK, MAX_DAY_PENALTY);
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

  /*
   * Credit heals, it never banks. Capping it at the debt means a long clean run
   * can bring a damaged goal back to full, but a run of good days before a miss
   * cannot pre-pay for it — the miss still shows.
   */
  const debt = dayPenalty + milestonePenalty;
  const raw = Math.round(100 - debt + Math.min(credit, debt));
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
