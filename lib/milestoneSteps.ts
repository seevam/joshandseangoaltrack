'use client';

import { useGoalStore } from './store';
import type { Goal, Subtask } from './types';
import { milestoneProtocol } from './aiGoal';

/**
 * Writes the Start-button steps for one milestone, for plans made before
 * milestones carried them. Called once, on the first press of Start; the
 * result is saved to the milestone so it is never generated twice.
 *
 * The model may decide the milestone is really a running total. That answer
 * is saved too (kind: 'cumulative'), and the UI then stops offering Start.
 */
export async function ensureMilestoneProtocol(goalId: string, index: number): Promise<Subtask | null> {
  const goal = useGoalStore.getState().goals.find(g => g.id === goalId);
  const m = goal?.subtasks?.[index];
  if (!goal || !m) return null;
  if (m.executionSteps?.length || m.kind === 'cumulative') return m;

  const res = await fetch('/api/ai/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: [
        { role: 'system', content: PROMPT },
        { role: 'user', content: context(goal, m) },
      ],
      tools: [TOOL],
      tool_choice: { type: 'function', function: { name: 'milestone_protocol' } },
      max_tokens: 900,
      temperature: 0.3,
    }),
  });
  if (!res.ok) throw new Error(`AI ${res.status}`);
  const call = (await res.json()).choices?.[0]?.message?.tool_calls?.[0];
  if (!call) throw new Error('No steps returned');
  const fields = milestoneProtocol({ ...JSON.parse(call.function.arguments), title: m.title, daysFromStart: m.daysFromStart });
  if (fields.kind !== 'cumulative' && !fields.executionSteps?.length) throw new Error('No steps returned');

  const save = await fetch(`/api/goals/${goalId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ milestoneFields: { index, id: m.id ?? null, fields } }),
  });
  if (!save.ok) throw new Error(`Save ${save.status}`);

  // Merge into the latest copy rather than replacing the goal with the
  // response, so a tick made meanwhile is not undone on screen.
  const { goals, updateGoal } = useGoalStore.getState();
  const latest = goals.find(g => g.id === goalId);
  if (latest) {
    updateGoal({
      ...latest,
      subtasks: latest.subtasks.map((x, i) => (i === index && x.id === m.id ? { ...x, ...fields } : x)),
    });
  }
  return { ...m, ...fields };
}

const PROMPT = `You write the step-by-step protocol for one milestone in someone's goal plan.
They will press Start and follow it in a single session, so write for that one sitting:
- setup: what to have ready, one sentence
- executionSteps: 2-5 ordered, concrete steps, each one sentence
- successCriteria: how they know it is done, one sentence
- estimatedMinutes: realistic length of the session
If the milestone is really a running total built across many sessions (a weekly
distance, a number of books, a streak, an amount saved), set kind "cumulative"
and give no steps — there is no single session to walk through.`;

function context(goal: Goal, m: Subtask): string {
  const stage = goal.stages?.find(s => s.id === m.stageId);
  return [
    `Goal: ${goal.title}`,
    goal.description ? `Why: ${goal.description}` : '',
    stage ? `Current stage: ${stage.title}${stage.guidance ? ` — ${stage.guidance}` : ''}` : '',
    `Milestone: ${m.title}`,
    m.description && m.description !== m.title ? `About it: ${m.description}` : '',
  ].filter(Boolean).join('\n');
}

const TOOL = {
  type: 'function' as const,
  function: {
    name: 'milestone_protocol',
    description: 'The protocol for one milestone session.',
    parameters: {
      type: 'object',
      properties: {
        kind: { type: 'string', enum: ['action', 'cumulative'] },
        setup: { type: 'string' },
        executionSteps: { type: 'array', items: { type: 'string' } },
        successCriteria: { type: 'string' },
        estimatedMinutes: { type: 'number' },
      },
      required: ['kind'],
    },
  },
};
