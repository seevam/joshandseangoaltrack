'use client';

import { useGoalStore } from './store';
import type { DailyTask, Goal } from './types';

/**
 * Writes the step-by-step protocol for a stage's recurring tasks.
 *
 * Plans used to carry every protocol inside the one create_goal call, which
 * made it ~5k tokens: past the 2k limit, so it was cut off mid-JSON and Quick
 * Create and "Build Tailored Plan" both failed. The plan is now compact, and
 * the protocols are written here, one small call per stage, straight after it
 * is saved — and again later for any stage whose tasks still lack them.
 */
export function needsProtocol(t: DailyTask): boolean {
  return !t.executionSteps?.length;
}

export async function fillTaskProtocols(goalId: string, taskIds: number[]): Promise<void> {
  const goal = useGoalStore.getState().goals.find(g => g.id === goalId);
  if (!goal) return;
  const tasks = goal.dailyTasks.filter(t => taskIds.includes(t.id) && needsProtocol(t));
  if (!tasks.length) return;

  const res = await fetch('/api/ai/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: [
        { role: 'system', content: PROMPT },
        { role: 'user', content: context(goal, tasks) },
      ],
      tools: [TOOL],
      tool_choice: { type: 'function', function: { name: 'task_protocols' } },
      max_tokens: 2500,
      temperature: 0.3,
    }),
  });
  if (!res.ok) throw new Error(`AI ${res.status}`);
  const call = (await res.json()).choices?.[0]?.message?.tool_calls?.[0];
  if (!call) throw new Error('No protocols returned');
  const out = (JSON.parse(call.function.arguments).tasks ?? []) as (Partial<DailyTask> & { id?: unknown })[];

  // Only ids that were asked about, only the protocol fields.
  const wanted = new Set(tasks.map(t => String(t.id)));
  const byId: Record<string, Partial<DailyTask>> = {};
  for (const p of out) {
    const id = String(p.id);
    if (!wanted.has(id)) continue;
    const steps = Array.isArray(p.executionSteps) ? p.executionSteps.map(s => String(s).trim()).filter(Boolean) : [];
    if (!steps.length) continue;
    byId[id] = {
      executionSteps: steps,
      ...(p.setup ? { setup: String(p.setup) } : {}),
      ...(p.successCriteria ? { successCriteria: String(p.successCriteria) } : {}),
      ...(p.fallback ? { fallback: String(p.fallback) } : {}),
    };
  }
  if (!Object.keys(byId).length) throw new Error('No protocols returned');

  const save = await fetch(`/api/goals/${goalId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ taskFields: byId }),
  });
  if (!save.ok) throw new Error(`Save ${save.status}`);

  // Merge into the latest copy, so a tick made meanwhile is not undone.
  const { goals, updateGoal } = useGoalStore.getState();
  const latest = goals.find(g => g.id === goalId);
  if (latest) {
    updateGoal({
      ...latest,
      dailyTasks: latest.dailyTasks.map(t => (byId[String(t.id)] ? { ...t, ...byId[String(t.id)] } : t)),
    });
  }
}

const PROMPT = `You write the step-by-step protocol for recurring tasks in someone's goal plan,
so they never have to invent the missing steps. For EACH task, keyed by its id:
- setup: what to have ready, one sentence (omit if nothing needs preparing)
- executionSteps: 2-5 ordered, concrete steps, each one sentence
- successCriteria: how they know it is done, one sentence
- fallback: a genuinely smaller ~10-minute version ("Run 10 minutes easy" for a
  45-minute run) ONLY when an honest one exists. Omit it when the task cannot be
  shrunk; a fabricated fallback is worse than none.
Write for the stage they are in, at the amounts in each task's title.`;

function context(goal: Goal, tasks: DailyTask[]): string {
  const stage = goal.stages?.find(s => s.id === tasks[0].stageId);
  return [
    `Goal: ${goal.title}`,
    goal.description ? `Why: ${goal.description}` : '',
    stage ? `Stage: ${stage.title}${stage.guidance ? ` — ${stage.guidance}` : ''}` : '',
    'Tasks:',
    ...tasks.map(t => `- id ${t.id}: ${t.title}${t.estimatedMinutes ? ` (~${t.estimatedMinutes} min)` : ''}${t.description ? ` — ${t.description}` : ''}`),
  ].filter(Boolean).join('\n');
}

const TOOL = {
  type: 'function' as const,
  function: {
    name: 'task_protocols',
    description: 'The protocol for each task, by id.',
    parameters: {
      type: 'object',
      properties: {
        tasks: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'number' },
              setup: { type: 'string' },
              executionSteps: { type: 'array', items: { type: 'string' } },
              successCriteria: { type: 'string' },
              fallback: { type: 'string' },
            },
            required: ['id', 'executionSteps', 'successCriteria'],
          },
        },
      },
      required: ['tasks'],
    },
  },
};
