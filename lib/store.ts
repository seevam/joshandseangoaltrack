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

  /** How brightly panels emit light. 0 turns the glow off entirely. */
  glowStrength: number;
  /** Whether the glow breathes. Independent of intensity. */
  glowAnimated: boolean;
  setGlowStrength: (v: number) => void;
  setGlowAnimated: (v: boolean) => void;
  hydrateAppearance: () => void;
  setCoachName: (name: string) => void;
  setCoachPersona: (p: CoachPersona) => void;
  hydrateCoachSettings: () => void;
}

export type CoachPersona = 'energetic' | 'calm' | 'direct';

/**
 * Appearance is written straight onto the document root, because the glow is
 * pure CSS driven by these two variables — no component needs to re-render for
 * the whole app to change.
 */
function applyAppearance(strength?: number, animated?: boolean) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (strength !== undefined) root.style.setProperty('--glow-strength', String(strength));
  if (animated !== undefined) root.style.setProperty('--glow-anim', animated ? 'glow-breathe' : 'none');
}

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

  glowStrength: 1,
  glowAnimated: true,
  setGlowStrength: (v) => {
    const n = Math.min(Math.max(v, 0), 2);
    applyAppearance(n, undefined);
    if (typeof window !== 'undefined') localStorage.setItem('gq_glow_strength', String(n));
    set({ glowStrength: n });
  },
  setGlowAnimated: (v) => {
    applyAppearance(undefined, v);
    if (typeof window !== 'undefined') localStorage.setItem('gq_glow_animated', v ? '1' : '0');
    set({ glowAnimated: v });
  },
  hydrateAppearance: () => {
    if (typeof window === 'undefined') return;
    const rawStrength = localStorage.getItem('gq_glow_strength');
    const rawAnimated = localStorage.getItem('gq_glow_animated');
    const strength = rawStrength === null ? 1 : Math.min(Math.max(Number(rawStrength) || 0, 0), 2);
    const animated = rawAnimated === null ? true : rawAnimated === '1';
    applyAppearance(strength, animated);
    set({ glowStrength: strength, glowAnimated: animated });
  },

  coachName: 'Forge',
  coachPersona: 'calm',
  setCoachName: (name) => {
    const v = name.trim() || 'Forge';
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

