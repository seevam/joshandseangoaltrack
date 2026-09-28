'use client';

import type { EditablePlan, Difficulty } from './planEdit';
import { unrated } from './planEdit';
import { milestoneKind } from './milestones';

/**
 * Sets the difficulty — and so the XP — of anything in a hand-built plan that
 * does not have one yet. The user builds the structure; they never set XP,
 * because a number you pick for your own work is not a measure of it.
 *
 * The AI judges effort from the goal and the wording, the same way it does
 * when it writes a plan itself. If it can't be reached the plan still saves:
 * a fallback rates from the minutes given and the item's place in the plan,
 * so saving never waits on the network.
 */
export async function ratePlan(goalTitle: string, plan: EditablePlan): Promise<EditablePlan> {
  const todo = unrated(plan);
  if (!todo.milestones.length && !todo.tasks.length) return plan;

  let rated: Record<string, { difficulty?: string; kind?: string; estimatedMinutes?: number }> = {};
  try {
    rated = await askAi(goalTitle, plan);
  } catch (err) {
    console.warn('Rating plan by fallback:', err);
  }
  const ok = (d?: string): d is Difficulty => d === 'easy' || d === 'medium' || d === 'hard' || d === 'epic';
  const stageIndex = new Map(plan.stages.map((s, i) => [s.key, i]));

  return {
    ...plan,
    milestones: plan.milestones.map(m => {
      if (m.difficulty) return m;
      const r = rated[m.key] ?? {};
      const kind = r.kind === 'action' || r.kind === 'cumulative' ? r.kind : milestoneKind({ title: m.title });
      return { ...m, difficulty: ok(r.difficulty) ? r.difficulty : fallbackMilestone(stageIndex.get(m.stageKey) ?? 0, plan.stages.length), kind };
    }),
    tasks: plan.tasks.map(t => {
      if (t.difficulty) return t;
      const r = rated[t.key] ?? {};
      const minutes = t.estimatedMinutes ?? (typeof r.estimatedMinutes === 'number' ? Math.min(Math.max(Math.round(r.estimatedMinutes), 5), 240) : undefined);
      return { ...t, estimatedMinutes: minutes, difficulty: ok(r.difficulty) ? r.difficulty : fallbackTask(minutes) };
    }),
  };
}

/** By length: a quarter hour is easy, a long session is hard. */
export function fallbackTask(minutes?: number): Difficulty {
  if (!minutes) return 'medium';
  if (minutes <= 20) return 'easy';
  if (minutes <= 50) return 'medium';
  if (minutes <= 100) return 'hard';
  return 'epic';
}

/** By place: early stages are lighter, the last stage is the hardest. */
export function fallbackMilestone(stage: number, stages: number): Difficulty {
  if (stages <= 1) return 'medium';
  if (stage === stages - 1) return 'hard';
  return stage === 0 ? 'easy' : 'medium';
}

async function askAi(goalTitle: string, plan: EditablePlan) {
  const todo = unrated(plan);
  const stageName = new Map(plan.stages.map((s, i) => [s.key, `Stage ${i + 1}: ${s.title}`]));
  const lines = [
    `Goal: ${goalTitle}`,
    ...plan.stages.map((s, i) => `Stage ${i + 1}: ${s.title}${s.subtitle ? ` — ${s.subtitle}` : ''}`),
    'Rate these:',
    ...todo.milestones.map(m => `- ${m.key} [milestone, ${stageName.get(m.stageKey)}]: ${m.title}`),
    ...todo.tasks.map(t => `- ${t.key} [recurring task, ${stageName.get(t.stageKey)}${t.estimatedMinutes ? `, ~${t.estimatedMinutes} min` : ''}]: ${t.title}`),
  ];
  const res = await fetch('/api/ai/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: [{ role: 'system', content: PROMPT }, { role: 'user', content: lines.join('\n') }],
      tools: [TOOL],
      tool_choice: { type: 'function', function: { name: 'rate_plan' } },
      max_tokens: 1500,
      temperature: 0.2,
    }),
  });
  if (!res.ok) throw new Error(`AI ${res.status}`);
  const call = (await res.json()).choices?.[0]?.message?.tool_calls?.[0];
  if (!call) throw new Error('No rating returned');
  const items = (JSON.parse(call.function.arguments).items ?? []) as { key: string; difficulty?: string; kind?: string; estimatedMinutes?: number }[];
  return Object.fromEntries(items.map(i => [i.key, i]));
}

const PROMPT = `You rate the effort of each step in someone's goal plan. The rating sets the
XP they earn, so be honest and varied — never make everything medium:
- easy: short, simple, early-stage work
- medium: a solid session of ordinary effort
- hard: demanding, long, or a real stretch for this stage
- epic: a peak effort — the longest run, the full exam, the launch
For each milestone also give its kind: "action" if it is one sitting the user
starts and finishes ("Run a half marathon", "Give the talk"), "cumulative" if it
is a total built up across many sessions ("Reach 30km in a week", "Read 5 books").
For a recurring task with no minutes given, estimate realistic minutes.
Answer for every key you are given, using the key exactly.`;

const TOOL = {
  type: 'function' as const,
  function: {
    name: 'rate_plan',
    description: 'The effort rating of each item, by key.',
    parameters: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              key: { type: 'string' },
              difficulty: { type: 'string', enum: ['easy', 'medium', 'hard', 'epic'] },
              kind: { type: 'string', enum: ['action', 'cumulative'] },
              estimatedMinutes: { type: 'number' },
            },
            required: ['key', 'difficulty'],
          },
        },
      },
      required: ['items'],
    },
  },
};
