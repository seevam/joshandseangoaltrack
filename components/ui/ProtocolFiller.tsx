'use client';

import { useEffect } from 'react';
import { useGoalStore } from '@/lib/store';
import { activeTasks } from '@/lib/stages';
import { fillTaskProtocols, needsProtocol } from '@/lib/taskSteps';

/** Per page load: each set of tasks is asked about once, never in a loop. */
const attempted = new Set<string>();

/**
 * Writes the missing step-by-step protocols for whatever tasks are live now.
 *
 * A new plan is saved without them (so it is small enough never to be cut
 * off), and this fills them in a few seconds later. It also covers a stage
 * that has just opened, a fill that failed, and a tab closed too early: on the
 * next load, whatever is live and still bare gets written. Nothing blocks on
 * it — the task list renders from the plan meanwhile.
 */
export default function ProtocolFiller() {
  const goals = useGoalStore(s => s.goals);
  const loaded = useGoalStore(s => s.goalsLoaded);

  useEffect(() => {
    if (!loaded) return;
    for (const goal of goals) {
      const bare = activeTasks(goal).filter(needsProtocol).map(t => t.id);
      if (!bare.length) continue;
      const key = `${goal.id}:${bare.join(',')}`;
      if (attempted.has(key)) continue;
      attempted.add(key);
      fillTaskProtocols(goal.id, bare).catch(err => console.warn('Task protocols not written:', err));
    }
  }, [goals, loaded]);

  return null;
}
