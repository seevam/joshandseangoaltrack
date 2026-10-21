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

/** XP at which a level begins, on the shared curve below. */
export function levelStartXp(level: number): number {
  return (100 * (level - 1) * level) / 2;
}

/*
 * Rank emblems ("badges") upgrade at levels, at widening intervals: +4, +7,
 * +10, +13, +15, +20, +25, +30, +35. They used to sit at fixed XP marks that
 * landed every two or three levels early on, so the emblem changed almost
 * every time the level did and an upgrade meant nothing. Now a level-up is the
 * small reward and a new emblem is the rare one, and each gets rarer.
 */
const RANK_DEFS = [
  { name: 'Initiate',     minLevel: 1,   slug: 'initiate',     icon: 'sprout',     color: '#A1A1A1' },
  { name: 'Apprentice',   minLevel: 5,   slug: 'apprentice',   icon: 'footprints', color: '#5DBC70' },
  { name: 'Journeyman',   minLevel: 12,  slug: 'journeyman',   icon: 'zap',        color: '#3B82F6' },
  { name: 'Adept',        minLevel: 22,  slug: 'adept',        icon: 'flame',      color: '#A78BFA' },
  { name: 'Expert',       minLevel: 35,  slug: 'expert',       icon: 'gem',        color: '#F59E0B' },
  { name: 'Master',       minLevel: 50,  slug: 'master',       icon: 'crown',      color: '#EC4899' },
  { name: 'Grandmaster',  minLevel: 70,  slug: 'grandmaster',  icon: 'medal',      color: '#14B8A6' },
  { name: 'Legend',       minLevel: 95,  slug: 'legend',       icon: 'trophy',     color: '#FBBF24' },
  { name: 'Mythic',       minLevel: 125, slug: 'mythic',       icon: 'sparkles',   color: '#F87171' },
  { name: 'Transcendent', minLevel: 160, slug: 'transcendent', icon: 'star',       color: '#E8F0EC' },
];

/** `icon` is a key into the registry in components/ui/icons.tsx, not an emoji. */
export const RANK_TIERS = RANK_DEFS.map(r => ({ ...r, minXp: levelStartXp(r.minLevel) }));

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
  const safe = Math.max(0, xp);
  let level = Math.floor((-1 + Math.sqrt(1 + (8 * safe) / 100)) / 2) + 1;
  // XP can be fractional (a goal's XP is shared across its skills), so the
  // square root is checked against the integer boundaries: the bar and the
  // level number must always turn over together.
  while (levelStartXp(level + 1) <= safe) level++;
  while (level > 1 && levelStartXp(level) > safe) level--;
  const start = levelStartXp(level);
  const end = levelStartXp(level + 1);
  return { level, levelXp: safe - start, levelSpan: end - start };
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
