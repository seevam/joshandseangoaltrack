export type Category = 'personal' | 'health' | 'career' | 'finance' | 'education' | 'fitness';

export interface Subtask {
  id: number;
  title: string;
  description?: string;
  daysFromStart: number;
  completed: boolean;
}

export interface DailyTask {
  id: number;
  title: string;
  targetValue: number | null;
  unit: string;
  type: 'number' | 'checkbox';
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
}

export const CATEGORY_COLORS: Record<Category, { bg: string; light: string; text: string; hex: string }> = {
  personal: { bg: 'bg-[#58CC02]', light: 'bg-[#D7FFB8]', text: 'text-[#2E8B00]', hex: '#58CC02' },
  health:   { bg: 'bg-[#00CD4B]', light: 'bg-[#CCFFDD]', text: 'text-[#00A03E]', hex: '#00CD4B' },
  career:   { bg: 'bg-[#7E3AF2]', light: 'bg-[#E9D5FF]', text: 'text-[#5B21B6]', hex: '#7E3AF2' },
  finance:  { bg: 'bg-[#FBBF24]', light: 'bg-[#FEF3C7]', text: 'text-[#B45309]', hex: '#FBBF24' },
  education:{ bg: 'bg-[#3B82F6]', light: 'bg-[#DBEAFE]', text: 'text-[#1E40AF]', hex: '#3B82F6' },
  fitness:  { bg: 'bg-[#FF4B4B]', light: 'bg-[#FECACA]', text: 'text-[#DC2626]', hex: '#FF4B4B' },
};

export function getGoalProgress(goal: Goal): number {
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
