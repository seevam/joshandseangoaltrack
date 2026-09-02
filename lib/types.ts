export type Category = 'personal' | 'health' | 'career' | 'finance' | 'education' | 'fitness';

/**
 * A phase of the journey. Stages stop a long plan reading as one flat list:
 * every milestone and recurring task belongs to one, and the goal's current
 * stage is derived from which milestones are still outstanding.
 */
export interface GoalStage {
  id: string;
  title: string;
  /** Four to six words on what this phase achieves. */
  subtitle: string;
  /** Why this phase exists. */
  purpose?: string;
  /** Concrete approach for this phase. */
  guidance?: string;
}

export interface Subtask {
  id: number;
  title: string;
  /** Which stage this milestone belongs to. */
  stageId?: string;
  description?: string;
  daysFromStart: number;
  completed: boolean;
  /** Assigned by the AI from task difficulty — drives XP. Never user-editable. */
  difficulty?: 'easy' | 'medium' | 'hard' | 'epic';
}

export interface DailyTask {
  id: number;
  title: string;
  /** Which stage this recurring task belongs to. */
  stageId?: string;
  /** First concrete instruction, surfaced by Next Action. AI-populated. */
  description?: string;
  /** Planned minutes. Only rendered when present — never guessed. */
  estimatedMinutes?: number;
  /** What to have ready before starting. */
  setup?: string;
  /** Ordered actions that make up the task. */
  executionSteps?: string[];
  /** How the user knows the task is done. */
  successCriteria?: string;
  /**
   * A genuinely smaller version of this task, roughly ten minutes. Absent when
   * no honest reduction exists — the recovery action is then not offered
   * rather than inventing one.
   */
  fallback?: string;
  targetValue: number | null;
  unit: string;
  type: 'number' | 'checkbox';
  daysOfWeek?: number[]; // 0=Sun … 6=Sat; empty/missing = every day
  /** Assigned by the AI from task difficulty — drives XP. Never user-editable. */
  difficulty?: 'easy' | 'medium' | 'hard' | 'epic';
}

/**
 * How a recurring task was completed on a given day.
 *
 * 'fallback' marks the ten-minute recovery version. It is a *string* on
 * purpose: every existing "is this done?" check in the app is a truthiness
 * test, and a truthy string keeps all of them correct without modification,
 * while XP and the activity feed can still tell the two apart.
 */
export type TaskCompletionValue = boolean | number | 'fallback';

export interface ProgressEntry {
  date: string;
  value: number;
}

export interface Goal {
  id: string;
  userId: string;
  title: string;
  description: string;
  category: Category;
  targetValue: number;
  currentValue: number;
  unit: string;
  startDate: string | null;
  endDate: string | null;
  color: string;
  createdAt: string;
  updatedAt: string;
  stages: GoalStage[];
  subtasks: Subtask[];
  dailyTasks: DailyTask[];
  taskCompletions: Record<string, Record<string, TaskCompletionValue>>;
  checkIns: string[];
  progressHistory: ProgressEntry[];
  milestones: unknown[];
  sharedWith: string[];
}

/**
 * Dark-theme palette: `light` is a translucent tint of the hue that sits on the
 * dark surface, `text` is the hue itself (already bright enough to read on it).
 */
export const CATEGORY_COLORS: Record<Category, { bg: string; light: string; text: string; hex: string }> = {
  personal: { bg: 'bg-[#5DBC70]', light: 'bg-[#5DBC70]/15', text: 'text-[#7FD394]', hex: '#5DBC70' },
  health:   { bg: 'bg-[#00CD4B]', light: 'bg-[#00CD4B]/15', text: 'text-[#3BE07C]', hex: '#00CD4B' },
  career:   { bg: 'bg-[#7E3AF2]', light: 'bg-[#7E3AF2]/15', text: 'text-[#A78BFA]', hex: '#7E3AF2' },
  finance:  { bg: 'bg-[#FBBF24]', light: 'bg-[#FBBF24]/15', text: 'text-[#FCD34D]', hex: '#FBBF24' },
  education:{ bg: 'bg-[#3B82F6]', light: 'bg-[#3B82F6]/15', text: 'text-[#93B4FC]', hex: '#3B82F6' },
  fitness:  { bg: 'bg-[#FF4B4B]', light: 'bg-[#FF4B4B]/15', text: 'text-[#FF8080]', hex: '#FF4B4B' },
};

export function getGoalProgress(goal: Goal): number {
  const subtasks = goal.subtasks || [];
  if (subtasks.length > 0) {
    return Math.min((subtasks.filter(s => s.completed).length / subtasks.length) * 100, 100);
  }
  if (!goal.targetValue) return 0;
  return Math.min((goal.currentValue / goal.targetValue) * 100, 100);
}

export function getGoalStatus(goal: Goal): 'completed' | 'overdue' | 'in-progress' {
  const progress = getGoalProgress(goal);
  if (progress >= 100) return 'completed';
  if (goal.endDate && new Date(goal.endDate) < new Date()) return 'overdue';
  return 'in-progress';
}

export function getStreak(checkIns: string[] = []): number {
  if (!checkIns.length) return 0;
  const today = new Date().toISOString().split('T')[0];
  const set = new Set(checkIns);
  let streak = 0;
  const cursor = new Date();
  if (!set.has(today)) cursor.setDate(cursor.getDate() - 1);
  while (true) {
    const d = cursor.toISOString().split('T')[0];
    if (!set.has(d)) break;
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}
