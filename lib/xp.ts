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

/** Milestones are worth ~5x a task — they represent weeks of work. */
export function milestoneXp(difficulty?: string): number {
  return taskXp(difficulty) * 5;
}

export const RANK_TIERS = [
  { name: 'Novice',    minXp: 0,     icon: '🌱', color: '#8A9B93' },
  { name: 'Apprentice', minXp: 500,  icon: '⚡', color: '#5DBC70' },
  { name: 'Adept',     minXp: 1500,  icon: '🔥', color: '#3B82F6' },
  { name: 'Expert',    minXp: 4000,  icon: '💎', color: '#7E3AF2' },
  { name: 'Master',    minXp: 10000, icon: '👑', color: '#FBBF24' },
  { name: 'Legend',    minXp: 25000, icon: '🏆', color: '#F87171' },
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

function streaksFromCheckIns(all: string[]): { current: number; longest: number } {
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
        totalXp += taskXp(taskById.get(taskId)?.difficulty);
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
  name: string;
  icon: string;
  description: string;
  earned: (s: UserStats, goals: Goal[]) => boolean;
}

export const BADGES: BadgeDef[] = [
  { id: 'first-goal',   name: 'Goal Setter',  icon: '🎯', description: 'Create your first goal',       earned: (_s, g) => g.length >= 1 },
  { id: 'first-task',   name: 'First Step',   icon: '👟', description: 'Complete your first task',     earned: s => s.tasksCompleted >= 1 },
  { id: 'streak-7',     name: 'Consistent',   icon: '🔥', description: 'Hit a 7-day streak',           earned: s => s.longestStreak >= 7 },
  { id: 'streak-30',    name: 'Unstoppable',  icon: '⚡', description: 'Hit a 30-day streak',          earned: s => s.longestStreak >= 30 },
  { id: 'milestone-10', name: 'Trailblazer',  icon: '🏁', description: 'Clear 10 milestones',          earned: s => s.milestonesCompleted >= 10 },
  { id: 'tasks-50',     name: 'Grinder',      icon: '💪', description: 'Complete 50 tasks',            earned: s => s.tasksCompleted >= 50 },
  { id: 'tasks-200',    name: 'Machine',      icon: '🤖', description: 'Complete 200 tasks',           earned: s => s.tasksCompleted >= 200 },
  { id: 'goal-done',    name: 'Finisher',     icon: '🏆', description: 'Complete a goal',              earned: s => s.goalsCompleted >= 1 },
  { id: 'goal-5',       name: 'Champion',     icon: '👑', description: 'Complete 5 goals',             earned: s => s.goalsCompleted >= 5 },
  { id: 'level-10',     name: 'Veteran',      icon: '💎', description: 'Reach level 10',               earned: s => s.level >= 10 },
  { id: 'multi',        name: 'Juggler',      icon: '🎪', description: 'Run 3 goals at once',          earned: (_s, g) => g.length >= 3 },
  { id: 'xp-5000',      name: 'XP Hoarder',   icon: '⭐', description: 'Bank 5,000 XP',                earned: s => s.totalXp >= 5000 },
];

export function earnedBadges(stats: UserStats, goals: Goal[]) {
  return BADGES.map(b => ({ ...b, isEarned: b.earned(stats, goals) }));
}
