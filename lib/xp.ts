import type { Goal } from './types';
import { earnedSkillXp, GOAL_COMPLETE_XP } from './skills';
import { RANK_TIERS, rankFromXp, skillLevel, milestoneXp, completionXp, streaksFromCheckIns } from './xpCore';

/**
 * XP is derived entirely from goal data — never stored, never user-editable.
 * Difficulty is assigned by the AI when it creates a task/milestone; anything
 * missing falls back to a sensible default so older goals still score.
 *
 * The primitives live in xpCore.ts; they are re-exported here so callers keep
 * one import.
 */
export * from './xpCore';

export interface UserStats {
  /** Overall XP: average skill XP × balance. The rank and level are read from it. */
  totalXp: number;
  /** Everything earned across all goals, before it is shared over the skills. */
  earnedXp: number;
  /** 0.5–1: how evenly that XP is spread across the nine skills. */
  balance: number;
  level: number;
  levelXp: number;      // XP earned inside the current level
  levelSpan: number;    // XP needed to clear the current level
  rank: typeof RANK_TIERS[number];
  nextRank: typeof RANK_TIERS[number] | null;
  tasksCompleted: number;
  milestonesCompleted: number;
  goalsCompleted: number;
  currentStreak: number;
  longestStreak: number;
}

/*
 * The overall rank is read from the nine skills, so it can never outrun them.
 *
 * It used to be the raw total of everything — which is roughly the SUM of the
 * skills — so it climbed faster than any one of them: Josh, working only on
 * Health, was closer to an overall rank-up than to a Health one. Now:
 *
 *   overall = average skill XP × balance
 *
 * The average is at most the strongest skill, and balance is at most 1, so the
 * overall rank and level are never ahead of your best skill. Balance is how
 * evenly the XP is spread: (Σx)² / (n · Σx²) is 1 when all nine match and 1/9
 * when it all sits in one, mapped onto [FLOOR, 1] so a single focused goal
 * still moves you — just not as fast as the same work spread across your life.
 *
 * Self-assessed head starts never count here: a number you type about
 * yourself must not buy a rank.
 */
const BALANCE_FLOOR = 0.5;

function evenness(xs: number[]): number {
  const sum = xs.reduce((a, b) => a + b, 0);
  if (sum <= 0) return 1; // Nothing earned yet — nothing to be unbalanced about.
  const sumSq = xs.reduce((a, b) => a + b * b, 0);
  return (sum * sum) / (xs.length * sumSq);
}

/** 0–1. 1 is perfectly even across the nine skills, FLOOR is all in one. */
export function balanceFactor(goals: Goal[]): number {
  return BALANCE_FLOOR + (1 - BALANCE_FLOOR) * evenness(Object.values(earnedSkillXp(goals)));
}

/** Overall XP from per-skill XP, plus any reward shared out across the skills. */
function overallXp(skillXp: number[], shared = 0): { xp: number; balance: number } {
  const xs = skillXp.map(x => x + shared / skillXp.length);
  const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
  const balance = BALANCE_FLOOR + (1 - BALANCE_FLOOR) * evenness(xs);
  // The cap is belt and braces: mean × balance ≤ max(xs) already, but the
  // shared reward is not something any one skill shows, so it must not tip
  // the overall past the strongest skill the user can actually see.
  const strongest = Math.max(0, ...skillXp);
  return { xp: Math.min(Math.round(mean * balance), Math.round(strongest)), balance };
}

function buildStats(
  totalXp: number, earnedXp: number, balance: number,
  tasksCompleted: number, milestonesCompleted: number,
  goalsCompleted: number, allCheckIns: string[],
): UserStats {
  const { level, levelXp, levelSpan } = skillLevel(totalXp);
  const { current, longest } = streaksFromCheckIns(allCheckIns);
  return {
    totalXp, earnedXp, balance, level, levelXp, levelSpan,
    rank: rankFromXp(totalXp),
    nextRank: RANK_TIERS.find(t => t.minXp > totalXp) ?? null,
    tasksCompleted, milestonesCompleted, goalsCompleted,
    currentStreak: current, longestStreak: longest,
  };
}

export function computeStats(goals: Goal[]): UserStats {
  let earnedXp = 0;
  let tasksCompleted = 0;
  let milestonesCompleted = 0;
  let goalsCompleted = 0;
  const allCheckIns: string[] = [];

  for (const goal of goals) {
    for (const s of goal.subtasks || []) {
      if (s.completed) {
        milestonesCompleted++;
        earnedXp += milestoneXp(s.difficulty);
      }
    }

    const taskById = new Map((goal.dailyTasks || []).map(t => [String(t.id), t]));
    for (const day of Object.values(goal.taskCompletions || {})) {
      for (const [taskId, value] of Object.entries(day)) {
        if (!value) continue;
        tasksCompleted++;
        earnedXp += completionXp(value, taskById.get(taskId)?.difficulty);
      }
    }

    const checkIns = goal.checkIns || [];
    allCheckIns.push(...checkIns);
    earnedXp += checkIns.length * 5; // small daily-consistency bonus

    const subtasks = goal.subtasks || [];
    const done = subtasks.length > 0
      ? subtasks.every(s => s.completed)
      : goal.targetValue > 0 && goal.currentValue >= goal.targetValue;
    if (done) {
      goalsCompleted++;
      earnedXp += GOAL_COMPLETE_XP;
    }
  }

  const skillXp = Object.values(earnedSkillXp(goals));

  // Badge rewards depend on stats, and stats depend on XP — resolve in two
  // passes. Badges are judged before their own reward, on the work alone.
  const pre = overallXp(skillXp);
  const base = buildStats(pre.xp, earnedXp, pre.balance, tasksCompleted, milestonesCompleted, goalsCompleted, allCheckIns);
  const badgeXp = BADGES.reduce((sum, b) => sum + (b.earned(base, goals) ? b.xpReward : 0), 0);

  // A badge is not about any one subject, so its reward is shared across all
  // nine skills — which keeps it inside the balance weighting rather than a
  // way around it.
  const post = overallXp(skillXp, badgeXp);
  return buildStats(post.xp, earnedXp + badgeXp, post.balance, tasksCompleted, milestonesCompleted, goalsCompleted, allCheckIns);
}

export interface BadgeDef {
  id: string;
  /** Filename slug in public/achievement-badges. */
  slug: string;
  name: string;
  icon: string;
  color: string;
  description: string;
  /** Awarded once when the badge unlocks; folded into totalXp. */
  xpReward: number;
  earned: (s: UserStats, goals: Goal[]) => boolean;
}

/** `icon` is a key into the registry in components/ui/icons.tsx, not an emoji. */
export const BADGES: BadgeDef[] = [
  { id: 'first-task',   slug: 'first-step',      name: 'First Step',      icon: 'footprints', color: '#5DBC70', xpReward: 50,   description: 'Complete your first task', earned: s => s.tasksCompleted >= 1 },
  { id: 'steady',       slug: 'steady-hand',     name: 'Steady Hand',     icon: 'target',     color: '#5DBC70', xpReward: 250,  description: 'Complete 25 tasks',        earned: s => s.tasksCompleted >= 25 },
  { id: 'tasks-100',    slug: 'centurion',       name: 'Centurion',       icon: 'dumbbell',   color: '#3B82F6', xpReward: 300,  description: 'Complete 100 tasks',       earned: s => s.tasksCompleted >= 100 },
  { id: 'tasks-500',    slug: 'unstoppable',     name: 'Unstoppable',     icon: 'rocket',     color: '#F87171', xpReward: 1000, description: 'Complete 500 tasks',       earned: s => s.tasksCompleted >= 500 },
  { id: 'streak-3',     slug: 'on-a-roll',       name: 'On a Roll',       icon: 'flame',      color: '#FB923C', xpReward: 75,   description: 'Maintain a 3-day streak',  earned: s => s.longestStreak >= 3 },
  { id: 'streak-7',     slug: 'week-warrior',    name: 'Week Warrior',    icon: 'zap',        color: '#FB923C', xpReward: 150,  description: 'Maintain a 7-day streak',  earned: s => s.longestStreak >= 7 },
  { id: 'streak-30',    slug: 'iron-will',       name: 'Iron Will',       icon: 'gem',        color: '#FB923C', xpReward: 500,  description: 'Maintain a 30-day streak', earned: s => s.longestStreak >= 30 },
  { id: 'first-goal',   slug: 'north-star',      name: 'North Star',      icon: 'target',     color: '#5DBC70', xpReward: 50,   description: 'Create your first goal',   earned: (_s, g) => g.length >= 1 },
  { id: 'multi-3',      slug: 'balanced-force',  name: 'Balanced Force',  icon: 'layers',     color: '#14B8A6', xpReward: 150,  description: 'Run 3 goals at once',      earned: (_s, g) => g.length >= 3 },
  { id: 'milestone-5',  slug: 'milestone-man',   name: 'Milestone Maker', icon: 'flag',       color: '#3B82F6', xpReward: 200,  description: 'Complete 5 milestones',    earned: s => s.milestonesCompleted >= 5 },
  { id: 'milestone-25', slug: 'conqueror',       name: 'Conqueror',       icon: 'crown',      color: '#FBBF24', xpReward: 800,  description: 'Complete 25 milestones',   earned: s => s.milestonesCompleted >= 25 },
  { id: 'goal-done',    slug: 'pathfinder',      name: 'Pathfinder',      icon: 'trophy',     color: '#FBBF24', xpReward: 250,  description: 'Complete a goal',          earned: s => s.goalsCompleted >= 1 },
  { id: 'goals-5',      slug: 'guardian-light',  name: 'Guardian',        icon: 'sparkles',   color: '#A78BFA', xpReward: 600,  description: 'Complete 5 goals',         earned: s => s.goalsCompleted >= 5 },
  { id: 'level-5',      slug: 'rising-star',     name: 'Rising Star',     icon: 'star',       color: '#FBBF24', xpReward: 150,  description: 'Reach Level 5',            earned: s => s.level >= 5 },
  { id: 'level-10',     slug: 'veteran',         name: 'Veteran',         icon: 'medal',      color: '#A78BFA', xpReward: 400,  description: 'Reach Level 10',           earned: s => s.level >= 10 },
  { id: 'checkins-30',  slug: 'calendar-keeper', name: 'Calendar Keeper', icon: 'calendar',   color: '#3B82F6', xpReward: 200,  description: 'Log 30 check-ins',         earned: (_s, g) => g.reduce((n, x) => n + (x.checkIns?.length || 0), 0) >= 30 },
];

export function earnedBadges(stats: UserStats, goals: Goal[]) {
  return BADGES.map(b => ({ ...b, isEarned: b.earned(stats, goals) }));
}
