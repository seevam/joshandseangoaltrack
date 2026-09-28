import { dayKey } from './dates';

/**
 * The scoring primitives: what a task, milestone or rank is worth.
 *
 * Kept apart from lib/xp.ts so lib/skills.ts can use them without a cycle —
 * the overall rank in xp.ts is now read from the skills, not beside them.
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

export function rankFromXp(totalXp: number) {
  let rank = RANK_TIERS[0];
  for (const t of RANK_TIERS) if (totalXp >= t.minXp) rank = t;
  return rank;
}

/**
 * The level curve for skills — and, since the overall rank is read from the
 * skills, for the player too: each level costs 100 XP more than the last.
 * Sharing one curve is what makes "overall never outruns a skill" hold for
 * levels as well as ranks.
 */
export function skillLevel(xp: number) {
  const level = Math.floor((-1 + Math.sqrt(1 + (8 * Math.max(0, xp)) / 100)) / 2) + 1;
  const start = (100 * (level - 1) * level) / 2;
  const end = (100 * level * (level + 1)) / 2;
  return { level, levelXp: xp - start, levelSpan: end - start };
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
  const today = dayKey();
  const cursor = new Date();
  if (!set.has(today)) cursor.setDate(cursor.getDate() - 1);
  let current = 0;
  while (set.has(dayKey(cursor))) {
    current++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return { current, longest };
}
