'use client';

import { useEffect, useMemo, useState } from 'react';
import { useGoalStore } from '@/lib/store';
import { computeStats, RANK_TIERS } from '@/lib/xp';
import { computeSkills } from '@/lib/skills';
import { loadSkillBaseline } from '@/lib/skillBaseline';
import { getGoalStatus } from '@/lib/types';
import { LevelUpOverlay } from '@/components/ui/motion';
import RankUpOverlay from '@/components/ui/RankUpOverlay';
import GoalCompleteOverlay from '@/components/ui/GoalCompleteOverlay';

const LEVEL_KEY = 'gq_celebrated_level';
const RANK_KEY = 'gq_celebrated_rank';
const GOALS_KEY = 'gq_celebrated_goals';
/** { base: the self-assessment it was recorded against, skills: id → [rank, level] } */
const SKILLS_KEY = 'gq_celebrated_skills';

interface SkillRecord { base: string; skills: Record<string, [number, number]> }

function readSkills(): SkillRecord | null {
  try {
    const raw = localStorage.getItem(SKILLS_KEY);
    return raw === null ? null : (JSON.parse(raw) as SkillRecord);
  } catch { return null; }
}

type Celebration =
  | { kind: 'goal'; title: string }
  | { kind: 'rank'; fromSlug: string; fromName: string; toSlug: string; toName: string; toColor: string; level: number; scope?: string }
  | { kind: 'level'; level: number; name: string; color: string; scope?: string };

function readIds(): string[] | null {
  try {
    const raw = localStorage.getItem(GOALS_KEY);
    return raw === null ? null : (JSON.parse(raw) as string[]);
  } catch { return null; }
}

function readNumber(key: string): number | null {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  } catch { return null; }
}

function write(key: string, value: string) {
  try { localStorage.setItem(key, value); } catch { /* private mode */ }
}

/**
 * Celebrates level-ups and rank-ups from anywhere in the app.
 *
 * This lived on the dashboard, so completing a task on a goal's own page, the
 * calendar or in Focus Mode could level you up in silence — which is exactly
 * what Josh saw: "I just ranked up again, you can barely tell."
 *
 * Skills are celebrated too. Their ranks and levels move far more often than
 * the player's — which is read from them and deliberately lags — so a
 * week of Health work that lifts Health to Apprentice now says so, instead of
 * nothing happening until the whole player moves.
 *
 * Three rules keep it honest:
 *  - Nothing fires until goals have actually loaded. Before that the derived
 *    level is 1, and the real data arriving would read as a jump.
 *  - The last celebrated level and rank are persisted, so a reload is silent
 *    and a genuine gain plays exactly once.
 *  - Going down is recorded silently, and only from a real, non-empty goal
 *    list. The balance weighting lowered some ranks when it shipped; that is a
 *    recalculation, not an event, and a failed fetch returning nothing must not
 *    reset the record either.
 */
export default function ProgressCelebrations() {
  const goals = useGoalStore(s => s.goals);
  const loaded = useGoalStore(s => s.goalsLoaded);
  const stats = useMemo(() => computeStats(goals), [goals]);
  /*
   * A queue, not a single slot: finishing a goal pays 500 XP, which often
   * levels or ranks you up in the same moment. Each gets its own turn —
   * goal first, then what it earned — instead of one overwriting the other.
   */
  const [queue, setQueue] = useState<Celebration[]>([]);
  const enqueue = (c: Celebration[]) => { if (c.length) setQueue(q => [...q, ...c]); };

  useEffect(() => {
    if (!loaded) return;

    const rankIdx = RANK_TIERS.findIndex(t => t.slug === stats.rank.slug);
    const lastLevel = readNumber(LEVEL_KEY);
    const lastRank = readNumber(RANK_KEY);
    const doneIds = goals.filter(g => getGoalStatus(g) === 'completed').map(g => g.id);
    const seenIds = readIds();

    // Skill standings, head start included, since that is what the skill cards
    // show. The record remembers which self-assessment it was made against:
    // re-rating yourself moves skills without any work, which is not an event.
    const baseline = loadSkillBaseline();
    const base = JSON.stringify(baseline);
    const skills = computeSkills(goals, baseline);
    const nowSkills: SkillRecord['skills'] = Object.fromEntries(
      skills.map(sk => [sk.id, [RANK_TIERS.findIndex(t => t.slug === sk.rank.slug), sk.level]]),
    );
    const lastSkills = readSkills();

    // First visit on this device: record, don't celebrate history.
    if (lastLevel === null || lastRank === null || seenIds === null) {
      write(LEVEL_KEY, String(stats.level));
      write(RANK_KEY, String(rankIdx));
      write(GOALS_KEY, JSON.stringify(doneIds));
      write(SKILLS_KEY, JSON.stringify({ base, skills: nowSkills }));
      return;
    }

    const next: Celebration[] = [];

    // A goal finished anywhere — its last milestone ticked on the goal page,
    // or its target reached. This used to live on the dashboard, wired only
    // to two handlers nothing called any more, so it never played at all.
    //
    // Only from a real, non-empty list: a failed fetch yields [], and treating
    // that as truth would forget every goal already celebrated and replay them
    // all on the next good load.
    const real = goals.length > 0;
    if (real) {
      const fresh = goals.filter(g => doneIds.includes(g.id) && !seenIds.includes(g.id));
      for (const g of fresh) next.push({ kind: 'goal', title: g.title });
      // Celebrated stays celebrated: un-ticking and re-ticking the last
      // milestone does not replay it. Deleted goals drop out, so it can't grow.
      const existing = new Set(goals.map(g => g.id));
      const seen = Array.from(new Set([...seenIds.filter(id => existing.has(id)), ...doneIds]));
      if (seen.length !== seenIds.length || fresh.length) write(GOALS_KEY, JSON.stringify(seen));
    }

    // The player's rank first: it is the rarest and the biggest.
    if (rankIdx > lastRank) {
      const from = RANK_TIERS[Math.max(0, Math.min(lastRank, RANK_TIERS.length - 1))];
      next.push({
        kind: 'rank',
        fromSlug: from.slug, fromName: from.name,
        toSlug: stats.rank.slug, toName: stats.rank.name, toColor: stats.rank.color,
        level: stats.level,
      });
    }

    // Then each skill that crossed into a new rank.
    const comparable = lastSkills !== null && lastSkills.base === base;
    const skillLevelUps: Celebration[] = [];
    if (comparable) {
      for (const sk of skills) {
        const [wasRank, wasLevel] = lastSkills.skills[sk.id] ?? [0, 1];
        const [isRank, isLevel] = nowSkills[sk.id];
        if (isRank > wasRank) {
          const from = RANK_TIERS[Math.max(0, Math.min(wasRank, RANK_TIERS.length - 1))];
          next.push({
            kind: 'rank', scope: sk.name,
            fromSlug: from.slug, fromName: from.name,
            toSlug: sk.rank.slug, toName: sk.rank.name, toColor: sk.color,
            level: sk.level,
          });
        } else if (isLevel > wasLevel) {
          skillLevelUps.push({ kind: 'level', scope: sk.name, level: sk.level, name: sk.rank.name, color: sk.color });
        }
      }
    }

    // Levels last, and only where no rank-up already told the same story.
    if (rankIdx <= lastRank && stats.level > lastLevel) {
      next.push({ kind: 'level', level: stats.level, name: stats.rank.name, color: stats.rank.color });
    }
    next.push(...skillLevelUps);
    enqueue(next);

    if (stats.level > lastLevel || real) write(LEVEL_KEY, String(stats.level));
    if (rankIdx > lastRank || real) write(RANK_KEY, String(rankIdx));
    // From a real list the record is simply replaced — gains, falls and a
    // changed self-assessment alike. From an empty one (possibly a failed
    // fetch) only gains are kept, and nothing is re-based on it.
    if (real) {
      write(SKILLS_KEY, JSON.stringify({ base, skills: nowSkills }));
    } else if (comparable) {
      const merged = { ...lastSkills.skills };
      for (const [id, [r, l]] of Object.entries(nowSkills)) {
        const [pr, pl] = merged[id] ?? [0, 1];
        merged[id] = [Math.max(r, pr), Math.max(l, pl)];
      }
      write(SKILLS_KEY, JSON.stringify({ base, skills: merged }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, goals, stats.level, stats.rank]);

  const current = queue[0];
  if (!current) return null;
  const done = () => setQueue(q => q.slice(1));

  if (current.kind === 'goal') {
    return <GoalCompleteOverlay title={current.title} onDone={done} />;
  }

  if (current.kind === 'rank') {
    return (
      <RankUpOverlay
        fromSlug={current.fromSlug}
        fromName={current.fromName}
        toSlug={current.toSlug}
        toName={current.toName}
        toColor={current.toColor}
        level={current.level}
        scope={current.scope}
        onDone={done}
      />
    );
  }

  return (
    <LevelUpOverlay
      level={current.level}
      rankName={current.name}
      rankColor={current.color}
      scope={current.scope}
      onDone={done}
    />
  );
}
