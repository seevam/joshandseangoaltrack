import type { DailyTask, Goal, GoalStage, Subtask } from './types';
import { dayKey } from './dates';

/**
 * The editable shape of a plan — stages, the milestones in each, the
 * recurring tasks in each — shared by Manual Entry and Edit Goal, so both
 * build exactly what an AI plan is made of.
 *
 * Pure: no React, no fetch. The editor works on this, and only on save is it
 * turned back into a goal's stages / subtasks / dailyTasks. Everything the
 * editor does not show (completion, completedAt, protocols, logged minutes) is
 * carried through untouched by id, so editing a plan never loses history.
 *
 * Difficulty — and so XP — is never set here. It is assigned by the AI on save
 * (lib/planRating.ts) for anything new or re-worded.
 */

export type Difficulty = NonNullable<Subtask['difficulty']>;

export interface EditStage {
  /** Stable React key; also the stage id for new stages. */
  key: string;
  id: string;
  title: string;
  subtitle: string;
  purpose?: string;
  guidance?: string;
}

export interface EditMilestone {
  key: string;
  /** Present for milestones that already exist. */
  id?: number;
  stageKey: string;
  title: string;
  /** YYYY-MM-DD, or '' to be spaced automatically on save. */
  due: string;
  completed: boolean;
  difficulty?: Difficulty;
  kind?: Subtask['kind'];
}

export interface EditTask {
  key: string;
  id?: number;
  stageKey: string;
  title: string;
  /** 0=Sun … 6=Sat; empty means every day. */
  daysOfWeek: number[];
  estimatedMinutes?: number;
  difficulty?: Difficulty;
}

export interface EditablePlan {
  stages: EditStage[];
  milestones: EditMilestone[];
  tasks: EditTask[];
}

const DAY = 86400000;
let seq = 0;
/** A key no other item in this session has. */
export const newKey = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${(seq++).toString(36)}`;

/** Local midnight of a stored date, tolerant of full ISO strings and junk. */
function startOf(date?: string | null): Date {
  const d = date ? new Date(/^\d{4}-\d{2}-\d{2}$/.test(date) ? `${date}T00:00:00` : date) : new Date();
  const base = Number.isNaN(d.getTime()) ? new Date() : d;
  base.setHours(0, 0, 0, 0);
  return base;
}

export function dueFromDays(startDate: string | null | undefined, days: number): string {
  return dayKey(new Date(startOf(startDate).getTime() + Math.max(0, days) * DAY));
}

export function daysFromDue(startDate: string | null | undefined, due: string): number {
  const d = new Date(`${due}T00:00:00`);
  if (Number.isNaN(d.getTime())) return 0;
  return Math.max(0, Math.round((d.getTime() - startOf(startDate).getTime()) / DAY));
}

export function emptyStage(): EditStage {
  const key = newKey('stage');
  return { key, id: key, title: '', subtitle: '' };
}

/** What Manual Entry starts from: one empty stage, ready to fill. */
export function emptyPlan(): EditablePlan {
  return { stages: [{ ...emptyStage(), title: 'Stage 1' }], milestones: [], tasks: [] };
}

/**
 * A goal's plan as the editor shows it. A goal with no stages (made before
 * stages existed, or by the old manual form) gets one, holding everything —
 * the editor is always stage-first.
 */
export function planFromGoal(goal: Goal): EditablePlan {
  const stages: EditStage[] = (goal.stages?.length ? goal.stages : [{ id: 'stage-1', title: 'Stage 1', subtitle: '' }])
    .map(s => ({ key: s.id, id: s.id, title: s.title, subtitle: s.subtitle || '', purpose: s.purpose, guidance: s.guidance }));
  const known = new Set(stages.map(s => s.key));
  // Anything pointing at no stage lands in the first one.
  const home = (stageId?: string) => (stageId && known.has(stageId) ? stageId : stages[0].key);

  return {
    stages,
    milestones: (goal.subtasks || []).map((m, i) => ({
      key: `m-${m.id ?? i}`,
      id: m.id,
      stageKey: home(m.stageId),
      title: m.title,
      due: dueFromDays(goal.startDate || goal.createdAt, m.daysFromStart ?? 0),
      completed: !!m.completed,
      difficulty: m.difficulty,
      kind: m.kind,
    })),
    tasks: (goal.dailyTasks || []).map((t, i) => ({
      key: `t-${t.id ?? i}`,
      id: t.id,
      stageKey: home(t.stageId),
      title: t.title,
      daysOfWeek: t.daysOfWeek || [],
      estimatedMinutes: t.estimatedMinutes,
      difficulty: t.difficulty,
    })),
  };
}

export interface PlanProblem { key: string; message: string }

/** Everything that would make the saved plan wrong or empty-looking. */
export function validatePlan(plan: EditablePlan): PlanProblem[] {
  const out: PlanProblem[] = [];
  if (!plan.stages.length) out.push({ key: 'plan', message: 'Add at least one stage.' });
  for (const s of plan.stages) if (!s.title.trim()) out.push({ key: s.key, message: 'Every stage needs a name.' });
  for (const m of plan.milestones) if (!m.title.trim()) out.push({ key: m.key, message: 'Every milestone needs a title.' });
  for (const t of plan.tasks) if (!t.title.trim()) out.push({ key: t.key, message: 'Every task needs a title.' });
  return out;
}

/** Items whose XP still has to be set — new, or re-worded since it was rated. */
export function unrated(plan: EditablePlan): { milestones: EditMilestone[]; tasks: EditTask[] } {
  return {
    milestones: plan.milestones.filter(m => !m.difficulty),
    tasks: plan.tasks.filter(t => !t.difficulty),
  };
}

/**
 * Back to what a goal stores. `original` supplies everything the editor does
 * not show, matched by id; a re-worded item drops what described the old
 * wording (its steps, its milestone kind), so they are rewritten for the new.
 */
export function planToGoalFields(
  plan: EditablePlan,
  startDate: string | null | undefined,
  original?: Pick<Goal, 'subtasks' | 'dailyTasks'>,
): { stages: GoalStage[]; subtasks: Subtask[]; dailyTasks: DailyTask[] } {
  const stageOrder = new Map(plan.stages.map((s, i) => [s.key, i]));
  const stageId = new Map(plan.stages.map(s => [s.key, s.id]));
  const stages: GoalStage[] = plan.stages.map(s => ({
    id: s.id, title: s.title.trim(), subtitle: s.subtitle.trim(),
    ...(s.purpose ? { purpose: s.purpose } : {}),
    ...(s.guidance ? { guidance: s.guidance } : {}),
  }));

  // New ids that cannot collide with any existing one.
  const taken = new Set<number>([
    ...(original?.subtasks || []).map(m => m.id),
    ...(original?.dailyTasks || []).map(t => t.id),
  ]);
  let next = Date.now();
  const freshId = () => { while (taken.has(next)) next++; taken.add(next); return next++; };

  // Milestones in plan order: by stage, then by date. An undated one follows
  // the one before it by two weeks.
  const sorted = [...plan.milestones].sort((a, b) =>
    (stageOrder.get(a.stageKey)! - stageOrder.get(b.stageKey)!) || (a.due && b.due ? a.due.localeCompare(b.due) : 0));
  let lastDays = 0;
  const subtasks: Subtask[] = sorted.map(m => {
    const prev = original?.subtasks?.find(x => m.id !== undefined && x.id === m.id);
    const reworded = !!prev && prev.title.trim() !== m.title.trim();
    const days = m.due ? daysFromDue(startDate, m.due) : lastDays + 14;
    lastDays = days;
    const base: Subtask = prev ? { ...prev } : { id: freshId(), title: '', daysFromStart: 0, completed: false };
    if (reworded) {
      delete base.difficulty;
      delete base.kind; delete base.setup; delete base.executionSteps;
      delete base.successCriteria; delete base.estimatedMinutes;
      if (base.description === prev!.title) delete base.description;
    }
    const kind = m.kind ?? (reworded ? undefined : base.kind);
    return {
      ...base,
      title: m.title.trim(),
      stageId: stageId.get(m.stageKey),
      daysFromStart: days,
      completed: m.completed,
      ...(m.difficulty ? { difficulty: m.difficulty } : {}),
      ...(kind ? { kind } : {}),
    };
  });

  const dailyTasks: DailyTask[] = [...plan.tasks]
    .sort((a, b) => stageOrder.get(a.stageKey)! - stageOrder.get(b.stageKey)!)
    .map(t => {
      const prev = original?.dailyTasks?.find(x => t.id !== undefined && x.id === t.id);
      const reworded = !!prev && prev.title.trim() !== t.title.trim();
      const base: DailyTask = prev
        ? { ...prev }
        : { id: freshId(), title: '', targetValue: null, unit: '', type: 'checkbox' };
      if (reworded) {
        delete base.difficulty;
        delete base.description; delete base.setup; delete base.executionSteps;
        delete base.successCriteria; delete base.fallback;
      }
      return {
        ...base,
        title: t.title.trim(),
        stageId: stageId.get(t.stageKey),
        daysOfWeek: [...t.daysOfWeek].sort(),
        ...(t.estimatedMinutes ? { estimatedMinutes: t.estimatedMinutes } : {}),
        ...(t.difficulty ? { difficulty: t.difficulty } : {}),
      };
    });

  return { stages, subtasks, dailyTasks };
}
