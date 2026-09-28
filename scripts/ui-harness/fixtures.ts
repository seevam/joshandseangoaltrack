/**
 * Goals shaped exactly like the ones the app stores: full ISO timestamps
 * (what materialiseGoal POSTs), stage ids on every milestone and task,
 * day-keyed completions. Used by the UI harness and the tests, so both
 * exercise the real data shape rather than a tidier imitation of it.
 */
import type { Goal } from '../../lib/types';
import { dayKey } from '../../lib/dates';

const DAY = 86400000;

const STAGE_NAMES = ['Base Endurance Building', 'Increasing Weekly Volume', 'Marathon-Specific Preparation', 'Taper and Race Day'];

export function makeGoal(opts: {
  id: string;
  title: string;
  category: Goal['category'];
  stages?: number;
  milestonesDone?: number;
  daysAgo?: number;
  description?: string;
  completionsDaysBack?: number;
}): Goal {
  const now = Date.now();
  const nStages = opts.stages ?? 4;
  const start = new Date(now - (opts.daysAgo ?? 20) * DAY).toISOString();
  const stages = Array.from({ length: nStages }, (_, i) => ({
    id: `s${i}`,
    title: STAGE_NAMES[i] ?? `Stage ${i + 1}`,
    subtitle: 'Build stamina and consistency',
    purpose: 'Lay the aerobic foundation for marathon training.',
    guidance: 'Focus on easy, steady runs and walking intervals to boost endurance.',
  }));
  const subtasks = Array.from({ length: nStages * 3 }, (_, i) => ({
    id: 5000 + i,
    title: i % 3 === 2 ? `Reach ${20 + i * 5}km total in a week` : `Complete a continuous ${5 + i}km run`,
    stageId: `s${Math.floor(i / 3)}`,
    description: 'What happens in this part of the plan, and why it matters.',
    daysFromStart: 7 * (i + 1),
    completed: i < (opts.milestonesDone ?? 0),
    difficulty: 'medium' as const,
  }));
  const dailyTasks = Array.from({ length: nStages * 2 }, (_, i) => ({
    id: 1000 + i,
    title: `Run ${3 + i}km at an easy conversational pace`,
    stageId: `s${Math.floor(i / 2)}`,
    targetValue: null,
    unit: '',
    type: 'checkbox' as const,
    daysOfWeek: [],
    difficulty: 'medium' as const,
    estimatedMinutes: 30 + i * 5,
    description: 'Head out before you think about it.',
    setup: 'Shoes, water, a route you know.',
    executionSteps: ['Warm up for 5 minutes', 'Run at conversational pace', 'Cool down and stretch'],
    successCriteria: 'Distance covered without stopping.',
    fallback: 'Run 10 minutes easy',
  }));
  const taskCompletions: Goal['taskCompletions'] = {};
  for (let d = 1; d <= (opts.completionsDaysBack ?? 0); d++) {
    taskCompletions[dayKey(new Date(now - d * DAY))] = { 1000: true, 1001: d % 2 === 0 };
  }
  return {
    id: opts.id, userId: 'u', title: opts.title, description: opts.description ?? '',
    category: opts.category, targetValue: 42, currentValue: 0, unit: 'km',
    startDate: start, endDate: new Date(now + 150 * DAY).toISOString(), color: '#fff',
    createdAt: start, updatedAt: new Date().toISOString(),
    stages, subtasks, dailyTasks, taskCompletions,
    checkIns: [], progressHistory: [], milestones: [], sharedWith: [],
  };
}

export const SAMPLE_GOALS: Goal[] = [
  makeGoal({ id: 'g1', title: 'Run my first marathon', category: 'fitness', milestonesDone: 1, completionsDaysBack: 14,
    description: 'I want to challenge myself, build endurance, and achieve a major fitness milestone.' }),
  makeGoal({ id: 'g2', title: 'Read twenty-four books this year across fiction and non-fiction', category: 'education', stages: 3, milestonesDone: 4 }),
  makeGoal({ id: 'g3', title: 'Build and ship a side business', category: 'career', stages: 3 }),
];
