import type { Goal } from './types';

/**
 * XP is derived entirely from goal data — never stored, never user-editable.
 * Difficulty is assigned by the AI when it creates a task/milestone; anything
 * missing falls back to a sensible default so older goals still score.
 */

export type Difficulty = 'easy' | 'medium' | 'hard' | 'epic';

export const DIFFICULTY_XP: Record<Difficulty, number> = {
  easy: 10,
  medium: 20,
  hard: 35,
  epic: 60,
};

export const DIFFICULTY_META: Record<Difficulty, { label: string; color: string }> = {
  easy:   { label: 'Easy',   color: '#6EE7A8' },
  medium: { label: 'Medium', color: '#5DBC70' },
  hard:   { label: 'Hard',   color: '#FBBF24' },
  epic:   { label: 'Epic',   color: '#F87171' },
};

/** XP for a recurring task completion. */
export function taskXp(difficulty?: string): number {
  return DIFFICULTY_XP[(difficulty as Difficulty)] ?? DIFFICULTY_XP.medium;
}

/**
 * The ten-minute recovery version earns real but reduced credit. Recovery is
 * progress, so it is never zero, and never so close to full that skipping the
 * real session is free.
 */
export function fallbackXp(difficulty?: string): number {
  return Math.max(5, Math.round(taskXp(difficulty) * 0.35));
}

/** XP for a completion, honouring the recovery mode when one was used. */
export function completionXp(value: unknown, difficulty?: string): number {
  return value === 'fallback' ? fallbackXp(difficulty) : taskXp(difficulty);
}

/** Milestones are worth ~5x a task — they represent weeks of work. */
export function milestoneXp(difficulty?: string): number {
  return taskXp(difficulty) * 5;
}

/** `icon` is a key into the registry in components/ui/icons.tsx, not an emoji. */
export const RANK_TIERS = [
  { name: 'Initiate',     minXp: 0,      slug: 'initiate',     icon: 'sprout',     color: '#A1A1A1' },
  { name: 'Apprentice',   minXp: 500,    slug: 'apprentice',   icon: 'footprints', color: '#5DBC70' },
  { name: 'Journeyman',   minXp: 1500,   slug: 'journeyman',   icon: 'zap',        color: '#3B82F6' },
  { name: 'Adept',        minXp: 3500,   slug: 'adept',        icon: 'flame',      color: '#A78BFA' },
  { name: 'Expert',       minXp: 7000,   slug: 'expert',       icon: 'gem',        color: '#F59E0B' },
  { name: 'Master',       minXp: 12000,  slug: 'master',       icon: 'crown',      color: '#EC4899' },
  { name: 'Grandmaster',  minXp: 20000,  slug: 'grandmaster',  icon: 'medal',      color: '#14B8A6' },
  { name: 'Legend',       minXp: 35000,  slug: 'legend',       icon: 'trophy',     color: '#FBBF24' },
  { name: 'Mythic',       minXp: 60000,  slug: 'mythic',       icon: 'sparkles',   color: '#F87171' },
  { name: 'Transcendent', minXp: 100000, slug: 'transcendent', icon: 'star',       color: '#E8F0EC' },
];

/** Each level costs 250 XP more than the last: 0, 250, 750, 1500, 2500 … */
export function levelFromXp(totalXp: number): number {
  return Math.floor((-1 + Math.sqrt(1 + (8 * totalXp) / 250)) / 2) + 1;
}

export function xpForLevel(level: number): number {
  const n = level - 1;
  return (250 * n * (n + 1)) / 2;
}

export function rankFromXp(totalXp: number) {
  let rank = RANK_TIERS[0];
  for (const t of RANK_TIERS) if (totalXp >= t.minXp) rank = t;
  return rank;
}

export interface UserStats {
  totalXp: number;
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

export function streaksFromCheckIns(all: string[]): { current: number; longest: number } {
  if (!all.length) return { current: 0, longest: 0 };
  const days = Array.from(new Set(all)).sort();
  let longest = 1, run = 1;
  for (let i = 1; i < days.length; i++) {
    const prev = new Date(days[i - 1]).getTime();
    const cur = new Date(days[i]).getTime();
    run = Math.round((cur - prev) / 86400000) === 1 ? run + 1 : 1;
    if (run > longest) longest = run;
  }
  const set = new Set(days);
  const today = new Date().toISOString().split('T')[0];
  const cursor = new Date();
  if (!set.has(today)) cursor.setDate(cursor.getDate() - 1);
  let current = 0;
  while (set.has(cursor.toISOString().split('T')[0])) {
    current++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return { current, longest };
}

function buildStats(
  totalXp: number, tasksCompleted: number, milestonesCompleted: number,
  goalsCompleted: number, allCheckIns: string[],
): UserStats {
  const level = levelFromXp(totalXp);
  const levelStart = xpForLevel(level);
  const levelEnd = xpForLevel(level + 1);
  const { current, longest } = streaksFromCheckIns(allCheckIns);
  return {
    totalXp, level,
    levelXp: totalXp - levelStart,
    levelSpan: levelEnd - levelStart,
    rank: rankFromXp(totalXp),
    nextRank: RANK_TIERS.find(t => t.minXp > totalXp) ?? null,
    tasksCompleted, milestonesCompleted, goalsCompleted,
    currentStreak: current, longestStreak: longest,
  };
}

export function computeStats(goals: Goal[]): UserStats {
  let totalXp = 0;
  let tasksCompleted = 0;
  let milestonesCompleted = 0;
  let goalsCompleted = 0;
  const allCheckIns: string[] = [];

  for (const goal of goals) {
    for (const s of goal.subtasks || []) {
      if (s.completed) {
        milestonesCompleted++;
        totalXp += milestoneXp(s.difficulty);
      }
    }

    const taskById = new Map((goal.dailyTasks || []).map(t => [String(t.id), t]));
    for (const day of Object.values(goal.taskCompletions || {})) {
      for (const [taskId, value] of Object.entries(day)) {
        if (!value) continue;
        tasksCompleted++;
        totalXp += completionXp(value, taskById.get(taskId)?.difficulty);
      }
    }

    const checkIns = goal.checkIns || [];
    allCheckIns.push(...checkIns);
    totalXp += checkIns.length * 5; // small daily-consistency bonus

    const subtasks = goal.subtasks || [];
    const done = subtasks.length > 0
      ? subtasks.every(s => s.completed)
      : goal.targetValue > 0 && goal.currentValue >= goal.targetValue;
    if (done) {
      goalsCompleted++;
      totalXp += 500; // goal completion bonus
    }
  }

  // Badge rewards depend on stats, and stats depend on XP — resolve in two passes.
  const base: UserStats = buildStats(totalXp, tasksCompleted, milestonesCompleted, goalsCompleted, allCheckIns);
  totalXp += BADGES.reduce((sum, b) => sum + (b.earned(base, goals) ? b.xpReward : 0), 0);

  const level = levelFromXp(totalXp);
  const levelStart = xpForLevel(level);
  const levelEnd = xpForLevel(level + 1);
  const rank = rankFromXp(totalXp);
  const nextRank = RANK_TIERS.find(t => t.minXp > totalXp) ?? null;
  const { current, longest } = streaksFromCheckIns(allCheckIns);

  return {
    totalXp,
    level,
    levelXp: totalXp - levelStart,
    levelSpan: levelEnd - levelStart,
    rank,
    nextRank,
    tasksCompleted,
    milestonesCompleted,
    goalsCompleted,
    currentStreak: current,
    longestStreak: longest,
  };
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
