import type { DailyTask } from './types';

/**
 * Decides whether to ask "how long did that take?" after a completion.
 *
 * A permanently visible "Correct the estimate" field asked the question at the
 * wrong moment — before the work, when the user has nothing to report — and
 * read as an accusation that the estimate was wrong. Asking straight after a
 * completion is the only moment the answer is actually known.
 *
 * Asking every time is worse than not asking: it turns every completion into a
 * form. So the first completion of a task is always asked, because that is the
 * one with no data at all, and after that the question is sampled — somewhere
 * between every fifth and every tenth completion, across all tasks.
 */

const COUNT_KEY = 'gq_est_since_ask';
const GAP_KEY = 'gq_est_next_gap';

const MIN_GAP = 5;
const MAX_GAP = 10;

function read(key: string): number {
  try {
    const n = Number(localStorage.getItem(key));
    return Number.isFinite(n) ? n : 0;
  } catch { return 0; }
}

function write(key: string, n: number) {
  try { localStorage.setItem(key, String(n)); } catch { /* private mode */ }
}

function drawGap() {
  return MIN_GAP + Math.floor(Math.random() * (MAX_GAP - MIN_GAP + 1));
}

/**
 * Call once per genuine completion — not on undo, and not on the ten-minute
 * recovery version, whose duration says nothing about the real task.
 *
 * Advances the sampling counter as a side effect, so it must not be called
 * from render.
 */
export function noteCompletionAndMaybeAsk(task: DailyTask): boolean {
  // Never timed: this is the completion that has something to tell us.
  if (!(task.actualMinutes || []).length) {
    write(COUNT_KEY, 0);
    write(GAP_KEY, drawGap());
    return true;
  }

  const gap = read(GAP_KEY) || drawGap();
  const count = read(COUNT_KEY) + 1;

  if (count >= gap) {
    write(COUNT_KEY, 0);
    write(GAP_KEY, drawGap());
    return true;
  }

  write(COUNT_KEY, count);
  write(GAP_KEY, gap);
  return false;
}
