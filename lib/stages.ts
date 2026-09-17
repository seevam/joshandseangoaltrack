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
  /**
   * Upcoming stages are locked: their milestones stay hidden until every
   * milestone in the current stage is done. A goal shows one phase of work at
   * a time rather than ten milestones at once.
   */
  locked: boolean;
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
  return rows.map((r, i) => {
    const status: StageProgress['status'] = currentIdx === -1
      ? 'complete'
      : i < currentIdx ? 'complete' : i === currentIdx ? 'current' : 'upcoming';
    return { ...r, status, locked: status === 'upcoming' };
  });
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

/**
 * The recurring tasks that are live right now: the ones belonging to the stage
 * the user is actually in, plus any task with no stage at all.
 *
 * A plan's stages carry different work — base building is not race week — so a
 * finished stage's tasks have no business still appearing on today's board.
 * They stayed in the list before, which meant the day's work only ever grew and
 * finishing a phase changed nothing about what you were asked to do.
 *
 * Unstaged tasks are always live: they belong to the goal rather than to a
 * phase of it, and silently hiding them would lose work the user can see in the
 * plan.
 */
export function activeTasks(goal: Goal): Goal['dailyTasks'] {
  const tasks = goal.dailyTasks || [];
  const stages = goal.stages || [];
  if (!stages.length) return tasks;

  const stageIds = new Set(stages.map(s => s.id));
  const current = currentStage(goal);

  const live = tasks.filter(t => {
    // No stage, or a stage that no longer exists: belongs to the goal itself.
    if (!t.stageId || !stageIds.has(t.stageId)) return true;
    return current ? t.stageId === current.stage.id : false;
  });

  /*
   * A phase with no work of its own leaves the user with an empty board, which
   * is worse than showing them a task from the wrong phase. Plans written
   * before stages existed, and plans where the model hung every task off the
   * first stage, both land here — so fall back to the whole set rather than
   * showing nothing.
   */
  return live.length ? live : tasks;
}

/** Recurring tasks belonging to one stage, for showing a phase's own plan. */
export function tasksForStage(goal: Goal, stageId: string): Goal['dailyTasks'] {
  return (goal.dailyTasks || []).filter(t => t.stageId === stageId);
}
