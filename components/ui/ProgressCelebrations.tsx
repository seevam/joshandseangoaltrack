'use client';

import { useEffect, useMemo, useState } from 'react';
import { useGoalStore } from '@/lib/store';
import { computeStats, RANK_TIERS } from '@/lib/xp';
import { LevelUpOverlay } from '@/components/ui/motion';
import RankUpOverlay from '@/components/ui/RankUpOverlay';

const LEVEL_KEY = 'gq_celebrated_level';
const RANK_KEY = 'gq_celebrated_rank';

type Celebration =
  | { kind: 'rank'; fromSlug: string; fromName: string; toSlug: string; toName: string; toColor: string; level: number }
  | { kind: 'level'; level: number; name: string; color: string };

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
  const [queue, setQueue] = useState<Celebration | null>(null);

  useEffect(() => {
    if (!loaded) return;

    const rankIdx = RANK_TIERS.findIndex(t => t.slug === stats.rank.slug);
    const lastLevel = readNumber(LEVEL_KEY);
    const lastRank = readNumber(RANK_KEY);

    // First visit on this device: record, don't celebrate history.
    if (lastLevel === null || lastRank === null) {
      write(LEVEL_KEY, String(stats.level));
      write(RANK_KEY, String(rankIdx));
      return;
    }

    if (rankIdx > lastRank) {
      const from = RANK_TIERS[Math.max(0, Math.min(lastRank, RANK_TIERS.length - 1))];
      setQueue({
        kind: 'rank',
        fromSlug: from.slug, fromName: from.name,
        toSlug: stats.rank.slug, toName: stats.rank.name, toColor: stats.rank.color,
        level: stats.level,
      });
    } else if (stats.level > lastLevel) {
      setQueue({ kind: 'level', level: stats.level, name: stats.rank.name, color: stats.rank.color });
    }

    const real = goals.length > 0;
    if (stats.level > lastLevel || real) write(LEVEL_KEY, String(stats.level));
    if (rankIdx > lastRank || real) write(RANK_KEY, String(rankIdx));
  }, [loaded, goals.length, stats.level, stats.rank]);

  if (!queue) return null;

  if (queue.kind === 'rank') {
    return (
      <RankUpOverlay
        fromSlug={queue.fromSlug}
        fromName={queue.fromName}
        toSlug={queue.toSlug}
        toName={queue.toName}
        toColor={queue.toColor}
        level={queue.level}
        onDone={() => setQueue(null)}
      />
    );
  }

  return (
    <LevelUpOverlay
      level={queue.level}
      rankName={queue.name}
      rankColor={queue.color}
      onDone={() => setQueue(null)}
    />
  );
}
