import { create } from 'zustand';
import type { Goal } from './types';

interface GoalStore {
  goals: Goal[];
  setGoals: (goals: Goal[]) => void;
  addGoal: (goal: Goal) => void;
  updateGoal: (goal: Goal) => void;
  removeGoal: (id: string) => void;

  showAddGoal: boolean;
  setShowAddGoal: (v: boolean) => void;

  isChatOpen: boolean;
  setIsChatOpen: (v: boolean) => void;
  chatSessionId: number;
  openChat: () => void; // increments session so panel resets

  selectedGoal: Goal | null;
  setSelectedGoal: (goal: Goal | null) => void;
}

export const useGoalStore = create<GoalStore>((set) => ({
  goals: [],
  setGoals: (goals) => set({ goals }),
  addGoal: (goal) => set(s => ({ goals: [goal, ...s.goals] })),
  updateGoal: (goal) => set(s => ({ goals: s.goals.map(g => g.id === goal.id ? goal : g) })),
  removeGoal: (id) => set(s => ({ goals: s.goals.filter(g => g.id !== id) })),

  showAddGoal: false,
  setShowAddGoal: (v) => set({ showAddGoal: v }),

  isChatOpen: false,
  setIsChatOpen: (v) => set({ isChatOpen: v }),
  chatSessionId: 0,
  openChat: () => set(s => ({ isChatOpen: true, chatSessionId: s.chatSessionId + 1 })),

  selectedGoal: null,
  setSelectedGoal: (goal) => set({ selectedGoal: goal }),
}));

