import { create } from 'zustand';
import type { Goal } from './types';

interface GoalStore {
  goals: Goal[];
  setGoals: (goals: Goal[]) => void;
  addGoal: (goal: Goal) => void;
  updateGoal: (goal: Goal) => void;
  removeGoal: (id: string) => void;

  /** Two-mode "New Goal" chooser (Quick vs Detailed). Global so nav can open it anywhere. */
  showCreateGoal: boolean;
  setShowCreateGoal: (v: boolean) => void;

  /** Sidebar collapsed to icons only. Shared so the main column can offset itself. */
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  hydrateSidebar: () => void;

  isChatOpen: boolean;
  setIsChatOpen: (v: boolean) => void;
  chatSessionId: number;
  openChat: () => void; // increments session so panel resets

  selectedGoal: Goal | null;
  setSelectedGoal: (goal: Goal | null) => void;

  // AI coach settings — kept in the store so changes propagate instantly
  coachName: string;
  coachPersona: CoachPersona;
  setCoachName: (name: string) => void;
  setCoachPersona: (p: CoachPersona) => void;
  hydrateCoachSettings: () => void;
}

export type CoachPersona = 'energetic' | 'calm' | 'direct';

export const useGoalStore = create<GoalStore>((set) => ({
  goals: [],
  setGoals: (goals) => set({ goals }),
  addGoal: (goal) => set(s => ({ goals: [goal, ...s.goals] })),
  updateGoal: (goal) => set(s => ({ goals: s.goals.map(g => g.id === goal.id ? goal : g) })),
  removeGoal: (id) => set(s => ({ goals: s.goals.filter(g => g.id !== id) })),

  showCreateGoal: false,
  setShowCreateGoal: (v) => set({ showCreateGoal: v }),

  sidebarCollapsed: false,
  toggleSidebar: () => set(s => {
    const next = !s.sidebarCollapsed;
    if (typeof window !== 'undefined') localStorage.setItem('sidebar_collapsed', next ? '1' : '0');
    return { sidebarCollapsed: next };
  }),
  hydrateSidebar: () => {
    if (typeof window === 'undefined') return;
    set({ sidebarCollapsed: localStorage.getItem('sidebar_collapsed') === '1' });
  },

  isChatOpen: false,
  setIsChatOpen: (v) => set({ isChatOpen: v }),
  chatSessionId: 0,
  openChat: () => set(s => ({ isChatOpen: true, chatSessionId: s.chatSessionId + 1 })),

  selectedGoal: null,
  setSelectedGoal: (goal) => set({ selectedGoal: goal }),

  coachName: 'My Assistant',
  coachPersona: 'calm',
  setCoachName: (name) => {
    const v = name.trim() || 'My Assistant';
    if (typeof window !== 'undefined') localStorage.setItem('ai_assistant_name', v);
    set({ coachName: v });
  },
  setCoachPersona: (p) => {
    if (typeof window !== 'undefined') localStorage.setItem('ai_coach_persona', p);
    set({ coachPersona: p });
  },
  hydrateCoachSettings: () => {
    if (typeof window === 'undefined') return;
    const name = localStorage.getItem('ai_assistant_name');
    const persona = localStorage.getItem('ai_coach_persona') as CoachPersona | null;
    set({
      ...(name ? { coachName: name } : {}),
      ...(persona ? { coachPersona: persona } : {}),
    });
  },
}));

