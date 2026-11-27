import { getGoalProgress, type Goal } from './types';
import { activeTasks } from './stages';
import { dayKey } from './dates';

/*
 * GOAL HEALTH — two questions, one number out of 100.
 *
 *   1. Pace: is the user where the plan expects them to be by now?
 *        pace = min(actual progress / expected progress, 1)
 *      Actual progress is the share of milestones done. Expected progress is
 *      the share of milestones whose target date has already passed — so you
 *      are "behind" only once a date has actually been missed, never on day
 *      three of a plan whose first milestone is due on day ten. (Goals without
 *      milestones fall back to the share of the timeline that has elapsed.)
 *      Being ahead caps at 1: you can't bank pace. With nothing expected yet,
 *      pace is 1.
 *
 *   2. Consistency: of the recurring tasks scheduled in the last 14 days, what
 *      share was done?
 *        consistency = Σ wᵢ·doneᵢ / Σ wᵢ·scheduledᵢ,   wᵢ = 0.9^(days ago)
 *      Recent days weigh more, so a missed run fades over a couple of weeks
 *      and a good streak is felt quickly. Today only ever adds: tasks done
 *      today count, tasks not yet done today don't — the day isn't over.
 *      With nothing scheduled in the window, consistency is 1.
 *
 *   health = round(100 × (0.7 × pace + 0.3 × consistency))
 *
 * So pace dominates: a user ahead of schedule scores at least 70 however
 * patchy their habits, and a user behind scores in proportion to how far
 * behind. Consistency adjusts within the remaining 30.
 *
 * Recovery Mode resets both: it re-dates the open milestones into the future
 * (so none is overdue and pace is 1), and consistency only looks at days
 * after the recovery.
 */

/** Weight of pace in the score; consistency gets the rest. */
export const PACE_WEIGHT = 0.7;
/** How many past days consistency looks at. */
export const CONSISTENCY_DAYS = 14;
/** Each day back counts this much less than the day after it. */
export const CONSISTENCY_DECAY = 0.9;

export interface GoalHealth {
  /** 0–100. */
  score: number;
  status: 'Thriving' | 'Steady' | 'Slipping' | 'At Risk' | 'Stalled';
  color: string;
  /** Milestone completion as a percentage — actual progress. */
  completionRate: number;
  /** Where the goal should be by now given its timeline, or null if untimed. */
  expectedRate: number | null;
  /** 0–1: actual / expected, capped at 1. */
  pace: number;
  /** 0–1: weighted share of recent scheduled tasks done. */
  consistency: number;
  /** Days since the last check-in or task completion, or null if never active. */
  daysSinceActivity: number | null;
  /** Human-readable explanations, most significant first. */
  reasons: string[];
  /** Days in the consistency window that ended with work left undone. */
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

/**
 * Local midnight of a stored date, or null when there isn't a usable one.
 * Goals store dates both as a bare "2026-09-23" (forms) and a full ISO
 * timestamp (the API); both must work.
 */
function dayStartTs(value: string | null | undefined): number | null {
  if (!value) return null;
  const d = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00`) : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function startOfDay(ts: number) {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d;
}

const scheduledOn = (t: Goal['dailyTasks'][number], dow: number) =>
  !t.daysOfWeek || t.daysOfWeek.length === 0 || t.daysOfWeek.includes(dow);

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

/** Where the plan expects the goal to be at `now`, 0–100, or null if it can't say. */
export function expectedProgress(goal: Goal, now = Date.now()): number | null {
  const startTs = dayStartTs(goal.startDate) ?? dayStartTs(goal.createdAt);
  if (startTs === null) return null;
  const today = startOfDay(now).getTime();
  const subtasks = goal.subtasks || [];
  if (subtasks.length) {
    const due = subtasks.filter(m => startTs + (m.daysFromStart ?? 0) * DAY < today).length;
    return (due / subtasks.length) * 100;
  }
  const endTs = dayStartTs(goal.endDate);
  if (!endTs || endTs <= startTs) return null;
  // Whole days only, so the day a goal is created expects nothing.
  return (Math.max(0, Math.min(today - startTs, endTs - startTs)) / (endTs - startTs)) * 100;
}

export function computeGoalHealth(goal: Goal, now = Date.now()): GoalHealth {
  const progress = getGoalProgress(goal);
  const completionRate = Math.round(progress);
  const last = lastActivity(goal);
  const daysSinceActivity = last
    ? Math.max(0, Math.floor((now - new Date(`${last}T12:00:00`).getTime()) / DAY))
    : null;

  if (progress >= 100) {
    return {
      score: 100, status: 'Thriving', color: '#5DBC70',
      completionRate: 100, expectedRate: 100, pace: 1, consistency: 1, daysSinceActivity,
      reasons: ['Goal complete. Every milestone is done.'],
      missedDays: 0, missedTasks: 0, missedMilestones: 0,
    };
  }

  const startTs = dayStartTs(goal.startDate) ?? dayStartTs(goal.createdAt) ?? now;
  const endTs = dayStartTs(goal.endDate);
  const today = startOfDay(now);

  // ── Pace ────────────────────────────────────────────────────────────────
  const expectedRaw = expectedProgress(goal, now);
  const expectedRate = expectedRaw === null ? null : Math.round(expectedRaw);
  const pace = expectedRaw === null || expectedRaw <= 0 ? 1 : Math.min(progress / expectedRaw, 1);

  // ── Consistency ─────────────────────────────────────────────────────────
  const completions = goal.taskCompletions || {};
  const recoveredTs = goal.recovery?.at ? dayStartTs(goal.recovery.at) : null;
  // Recovery wipes the slate: the window starts on the day after it.
  const windowStart = Math.max(
    startTs,
    recoveredTs !== null ? recoveredTs + DAY : -Infinity,
    today.getTime() - CONSISTENCY_DAYS * DAY,
  );
  let doneW = 0;
  let dueW = 0;
  let missedDays = 0;
  let missedTasks = 0;

  for (const cursor = startOfDay(windowStart); cursor < today; cursor.setDate(cursor.getDate() + 1)) {
    // Judged against the stage the user was in ON that day, not today's.
    const endOfDay = new Date(cursor); endOfDay.setHours(23, 59, 59, 999);
    const scheduled = activeTasks(goal, endOfDay.getTime()).filter(t => scheduledOn(t, cursor.getDay()));
    if (!scheduled.length) continue;
    const logged = completions[dayKey(cursor)] || {};
    const done = scheduled.filter(t => logged[t.id]).length;
    const age = Math.round((today.getTime() - cursor.getTime()) / DAY);
    const w = CONSISTENCY_DECAY ** age;
    doneW += w * done;
    dueW += w * scheduled.length;
    if (done < scheduled.length) { missedDays++; missedTasks += scheduled.length - done; }
  }
  // Today: credit only.
  const loggedToday = completions[dayKey(today)] || {};
  const doneToday = activeTasks(goal).filter(t => scheduledOn(t, today.getDay()) && loggedToday[t.id]).length;
  doneW += doneToday;
  dueW += doneToday;

  const consistency = dueW > 0 ? doneW / dueW : 1;

  // ── Score ───────────────────────────────────────────────────────────────
  const raw = Math.round(100 * (PACE_WEIGHT * pace + (1 - PACE_WEIGHT) * consistency));
  const score = Number.isFinite(raw) ? Math.max(0, Math.min(100, raw)) : 100;

  // Milestones past their date — for the explanation; pace already charges for it.
  let missedMilestones = 0;
  for (const m of goal.subtasks || []) {
    if (!m.completed && startTs + (m.daysFromStart ?? 0) * DAY < today.getTime()) missedMilestones++;
  }

  // ── Reasons, most significant first ─────────────────────────────────────
  const reasons: string[] = [];
  if (endTs && now > endTs) {
    reasons.push(`The deadline has passed with ${100 - completionRate}% still to go.`);
  } else if (expectedRate !== null && pace >= 1) {
    reasons.push(completionRate > expectedRate
      ? `Ahead of plan: ${completionRate}% done where ${expectedRate}% is expected.`
      : `On schedule: ${completionRate}% done, ${expectedRate}% expected.`);
  } else if (expectedRate !== null) {
    reasons.push(`Behind plan: ${completionRate}% done where ${expectedRate}% is expected by now.`);
  }
  if (missedMilestones > 0 && pace < 1) {
    reasons.push(`${missedMilestones} milestone${missedMilestones === 1 ? ' is' : 's are'} past ${missedMilestones === 1 ? 'its' : 'their'} date.`);
  }
  if (dueW > 0) {
    reasons.push(`${Math.round(consistency * 100)}% of recent scheduled tasks done`
      + (missedTasks ? ` (${missedTasks} missed in the last ${CONSISTENCY_DAYS} days).` : '.'));
  }
  if (doneToday > 0) reasons.push(`${doneToday} task${doneToday === 1 ? '' : 's'} done today — already counted.`);
  if (goal.recovery?.at && recoveredTs !== null && today.getTime() - recoveredTs < 7 * DAY) {
    reasons.push('Recovered recently — the plan and the score were reset from that day.');
  }
  if (!reasons.length) reasons.push('Nothing due yet. Health moves with milestones and recurring tasks.');

  const tier = TIERS.find(t => score >= t.min) ?? TIERS[TIERS.length - 1];
  return {
    score, status: tier.status, color: tier.color,
    completionRate, expectedRate, pace, consistency, daysSinceActivity,
    reasons, missedDays, missedTasks, missedMilestones,
  };
}
