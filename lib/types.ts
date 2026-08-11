export type Category = 'personal' | 'health' | 'career' | 'finance' | 'education' | 'fitness';

export interface Subtask {
  id: number;
  title: string;
  description?: string;
  daysFromStart: number;
  completed: boolean;
  /** Assigned by the AI from task difficulty — drives XP. Never user-editable. */
  difficulty?: 'easy' | 'medium' | 'hard' | 'epic';
}

export interface DailyTask {
  id: number;
  title: string;
  targetValue: number | null;
  unit: string;
  type: 'number' | 'checkbox';
  daysOfWeek?: number[]; // 0=Sun … 6=Sat; empty/missing = every day
  /** Assigned by the AI from task difficulty — drives XP. Never user-editable. */
  difficulty?: 'easy' | 'medium' | 'hard' | 'epic';
}

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
  subtasks: Subtask[];
  dailyTasks: DailyTask[];
  taskCompletions: Record<string, Record<string, number | boolean>>;
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
