import type { Subtask } from './types';

/*
 * Totals, thresholds and tallies: things that accumulate over many sessions.
 * Checked first, because "Run 100km total" contains the action verb "run" but
 * is not one sitting.
 */
const CUMULATIVE = [
  /\btotal\b/i, /\bin total\b/i, /\bcumulative\b/i, /\boverall\b/i,
  /\b(per|a|each|every) (day|week|month)\b/i, /\bweekly\b/i, /\bmonthly\b/i,
  /\bin a row\b/i, /\bconsecutive\b/i, /\bstreak\b/i, /\bdays? straight\b/i,
  /\bfor \d+ (days|weeks|months)\b/i, /\baverage\b/i,
  /\b(save|saved|lose|lost|gain|gained|reach|hit)\b.*\d/i,
  /\b\d+\s*(books|sessions|workouts|lessons|chapters|articles|posts|episodes|days|weeks)\b/i,
];

/**
 * Whether a milestone is one sitting (gets Start + steps) or a running total
 * (gets neither). The AI now says which when it builds a plan; older goals
 * don't carry the field, so their titles are read instead. Existing steps win
 * over the heuristic — if a milestone has a protocol, it is an action.
 */
export function milestoneKind(m: Pick<Subtask, 'kind' | 'title' | 'executionSteps'>): 'action' | 'cumulative' {
  if (m.kind) return m.kind;
  if (m.executionSteps?.length) return 'action';
  return CUMULATIVE.some(re => re.test(m.title)) ? 'cumulative' : 'action';
}

export function hasProtocol(m: Pick<Subtask, 'executionSteps'>): boolean {
  return !!m.executionSteps?.filter(Boolean).length;
}
