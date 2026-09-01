import { getGoalProgress, getStreak, type Goal } from './types';

export interface GoalHealth {
  /** 0–100. Higher is healthier. */
  score: number;
  status: 'Thriving' | 'Steady' | 'Slipping' | 'At Risk' | 'Stalled';
  color: string;
  /** Milestone completion as a percentage — the headline pace number. */
  completionRate: number;
  /** Where the goal *should* be by now given its timeline, or null if untimed. */
  expectedRate: number | null;
  /** Days since the last check-in or task completion, or null if never active. */
  daysSinceActivity: number | null;
  /** Human-readable explanations for the deductions, most significant first. */
  reasons: string[];
}

const TIERS: { min: number; status: GoalHealth['status']; color: string }[] = [
  { min: 80, status: 'Thriving', color: '#5DBC70' },
  { min: 60, status: 'Steady',   color: '#8FE3A3' },
  { min: 40, status: 'Slipping', color: '#FBBF24' },
  { min: 20, status: 'At Risk',  color: '#FB923C' },
  { min: 0,  status: 'Stalled',  color: '#F87171' },
];

const DAY = 86400000;

function daysBetween(a: number, b: number) {
  return Math.floor((a - b) / DAY);
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

/**
 * Scores how well a goal is actually going, so the user gets a single honest
 * signal plus the reasons behind it. Three independent components, each of
 * which can only subtract from a full score:
 *
 *   pace (50)     — is progress keeping up with the elapsed timeline?
 *   recency (30)  — has the user touched this goal lately?
 *   rhythm (20)   — is there a consistent check-in habit?
 *
 * A goal with no deadline can't be judged on pace, so that component is
 * re-weighted onto recency and rhythm rather than scoring a phantom zero.
 */
export function computeGoalHealth(goal: Goal): GoalHealth {
  const now = Date.now();
  const progress = getGoalProgress(goal);
  const completionRate = Math.round(progress);
  const reasons: string[] = [];

  if (progress >= 100) {
    return {
      score: 100,
      status: 'Thriving',
      color: '#5DBC70',
      completionRate: 100,
      expectedRate: 100,
      daysSinceActivity: 0,
      reasons: ['Goal complete. Every milestone is done.'],
    };
  }

  // ── Pace ────────────────────────────────────────────────────────────────
  const start = goal.startDate ? new Date(goal.startDate).getTime() : new Date(goal.createdAt).getTime();
  const end = goal.endDate ? new Date(goal.endDate).getTime() : null;
  let expectedRate: number | null = null;
  let paceScore: number | null = null;

  if (end && end > start) {
    const elapsed = Math.max(0, Math.min(now - start, end - start));
    expectedRate = Math.round((elapsed / (end - start)) * 100);

    if (now > end) {
      paceScore = 0;
      reasons.push(`Deadline passed with ${100 - completionRate}% still to go.`);
    } else if (expectedRate <= 0) {
      paceScore = 50; // Not started yet — nothing to be behind on.
    } else {
      const ratio = progress / expectedRate;
      paceScore = Math.round(Math.max(0, Math.min(ratio, 1)) * 50);
      if (ratio < 0.6) {
        reasons.push(`Behind pace — ${completionRate}% done where the timeline expects ${expectedRate}%.`);
      } else if (ratio < 0.9) {
        reasons.push(`Slightly behind pace (${completionRate}% vs ${expectedRate}% expected).`);
      } else if (ratio >= 1) {
        reasons.push(`Ahead of schedule — ${completionRate}% done against ${expectedRate}% expected.`);
      }

      const daysLeft = daysBetween(end, now);
      if (daysLeft <= 7 && progress < 80) {
        reasons.push(`Only ${daysLeft} day${daysLeft === 1 ? '' : 's'} left. Cut scope or move the deadline.`);
      }
    }
  }

  // ── Recency ─────────────────────────────────────────────────────────────
  const last = lastActivity(goal);
  const daysSinceActivity = last
    ? Math.max(0, daysBetween(now, new Date(`${last}T12:00:00`).getTime()))
    : null;

  let recencyScore: number;
  if (daysSinceActivity === null) {
    recencyScore = 0;
    const age = daysBetween(now, start);
    reasons.push(age > 2
      ? `No activity logged in the ${age} days since this goal was created.`
      : 'No activity logged yet. Check in once to start the streak.');
  } else if (daysSinceActivity <= 1) {
    recencyScore = 30;
  } else if (daysSinceActivity <= 3) {
    recencyScore = 22;
  } else if (daysSinceActivity <= 7) {
    recencyScore = 12;
    reasons.push(`Quiet for ${daysSinceActivity} days.`);
  } else if (daysSinceActivity <= 14) {
    recencyScore = 5;
    reasons.push(`No activity for ${daysSinceActivity} days — momentum is gone.`);
  } else {
    recencyScore = 0;
    reasons.push(`Untouched for over two weeks.`);
  }

  // ── Rhythm ──────────────────────────────────────────────────────────────
  const streak = getStreak(goal.checkIns);
  const checkIns = (goal.checkIns || []).length;
  const rhythmScore = Math.round(Math.min(streak / 7, 1) * 12 + Math.min(checkIns / 10, 1) * 8);
  if (streak >= 7) {
    reasons.push(`${streak}-day check-in streak is carrying this one.`);
  } else if (checkIns > 0 && streak === 0) {
    reasons.push('Check-in streak broken — restart it today to rebuild rhythm.');
  }

  // ── Combine ─────────────────────────────────────────────────────────────
  // Untimed goals redistribute pace's 50 points across the other two, so they
  // aren't permanently capped at 50/100 for the crime of having no deadline.
  const score = paceScore === null
    ? Math.round(((recencyScore + rhythmScore) / 50) * 100)
    : paceScore + recencyScore + rhythmScore;

  const clamped = Math.max(0, Math.min(100, score));
  const tier = TIERS.find(t => clamped >= t.min) ?? TIERS[TIERS.length - 1];

  return {
    score: clamped,
    status: tier.status,
    color: tier.color,
    completionRate,
    expectedRate,
    daysSinceActivity,
    reasons,
  };
}
