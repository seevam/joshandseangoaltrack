import type { Goal, GoalStage, Subtask } from './types';

export interface StageProgress {
  stage: GoalStage;
  index: number;
  milestones: Subtask[];
  done: number;
  total: number;
  /** 0-100. A stage with no milestones reports 0 rather than dividing by zero. */
  percent: number;
  status: 'complete' | 'current' | 'upcoming';
}

/**
 * Stages with their milestones and completion, in plan order.
 *
 * The current stage is the earliest one still carrying unfinished work — not
 * simply "the next incomplete stage", because a user can complete a later
 * milestone early and that should not skip the phase they are actually in.
 */
export function stageBreakdown(goal: Goal): StageProgress[] {
  const stages = goal.stages || [];
  if (!stages.length) return [];

  const milestones = goal.subtasks || [];
  const byStage = new Map<string, Subtask[]>();
  for (const s of stages) byStage.set(s.id, []);
  for (const m of milestones) {
    if (m.stageId && byStage.has(m.stageId)) byStage.get(m.stageId)!.push(m);
  }

  const rows = stages.map((stage, index) => {
    const list = byStage.get(stage.id) ?? [];
    const done = list.filter(m => m.completed).length;
    const total = list.length;
    return {
      stage, index, milestones: list, done, total,
      percent: total ? Math.round((done / total) * 100) : 0,
      status: 'upcoming' as StageProgress['status'],
    };
  });

  const currentIdx = rows.findIndex(r => r.total === 0 || r.done < r.total);
  return rows.map((r, i) => ({
    ...r,
    status: currentIdx === -1
      ? 'complete'
      : i < currentIdx ? 'complete' : i === currentIdx ? 'current' : 'upcoming',
  }));
}

/** The phase the user is actually in, or null when the goal has no stages. */
export function currentStage(goal: Goal): StageProgress | null {
  return stageBreakdown(goal).find(s => s.status === 'current') ?? null;
}

/** Milestones with no stage — kept visible rather than silently dropped. */
export function unstagedMilestones(goal: Goal): Subtask[] {
  const ids = new Set((goal.stages || []).map(s => s.id));
  return (goal.subtasks || []).filter(m => !m.stageId || !ids.has(m.stageId));
}
