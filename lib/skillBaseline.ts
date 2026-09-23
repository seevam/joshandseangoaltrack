import { GOAL_DOMAINS, type GoalDomainId } from './domains';

/**
 * Where the user says they are starting from.
 *
 * Without this, everyone begins at Level 1 in all eight domains, which is a lie
 * for anyone who arrives mid-life: a working musician's Creativity is not zero
 * because they have not yet logged a task in this app. Progression only feels
 * like a measure of the person if it starts near where the person actually is.
 *
 * Self-assessed XP is credited to the SKILL levels only. It is deliberately
 * kept out of the overall rank, because a number you type about yourself must
 * not buy a rank — otherwise the honest answer is the losing one.
 */

export type SkillBaseline = Partial<Record<GoalDomainId, number>>;

const KEY = 'gq_skill_baseline';

/** Ratings are 1–10, where 1 is "never done this" and 10 is "this is my thing". */
export const MIN_RATING = 1;
export const MAX_RATING = 10;

/** Skill levels cost 100 XP more than the last, matching skillLevel() in skills.ts. */
function xpForSkillLevel(level: number): number {
  const n = Math.max(1, level);
  return (100 * (n - 1) * n) / 2;
}

/**
 * A 1–10 rating as starting XP. 1 earns nothing — a rating of "I have never
 * done this" should not be worth a level — and 10 opens at level 7, which is
 * high enough to feel recognised and low enough that real work still dominates.
 */
export function baselineXp(rating: number): number {
  const r = Math.min(Math.max(Math.round(rating), MIN_RATING), MAX_RATING);
  if (r <= 1) return 0;
  return xpForSkillLevel(1 + Math.round((r - 1) * 0.67));
}

export function loadSkillBaseline(): SkillBaseline {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const out: SkillBaseline = {};
    for (const d of GOAL_DOMAINS) {
      const n = Number(parsed[d.id]);
      if (Number.isFinite(n)) out[d.id] = Math.min(Math.max(Math.round(n), MIN_RATING), MAX_RATING);
    }
    return out;
  } catch {
    return {};
  }
}

export function saveSkillBaseline(baseline: SkillBaseline) {
  try { localStorage.setItem(KEY, JSON.stringify(baseline)); } catch { /* private mode */ }
}

/** True once the user has actually rated themselves, so we can stop asking. */
export function hasSkillBaseline(): boolean {
  return Object.keys(loadSkillBaseline()).length > 0;
}

/**
 * The domains the user rated lowest — what the coach should push them towards.
 *
 * A domain they never rated counts as the weakest: no claim is not the same as
 * a good claim, and onboarding writes all eight anyway.
 */
export function weakestDomains(baseline: SkillBaseline, count = 3): GoalDomainId[] {
  return GOAL_DOMAINS
    .map(d => ({ id: d.id, rating: baseline[d.id] ?? MIN_RATING }))
    .sort((a, b) => a.rating - b.rating)
    .slice(0, count)
    .map(d => d.id);
}
