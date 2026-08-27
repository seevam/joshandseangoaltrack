import type { Goal } from './types';
import { taskXp, milestoneXp, levelFromXp, xpForLevel } from './xp';

/**
 * Video-game style attributes. Every goal feeds one or more skills, so working
 * a goal levels the skills behind it. Discipline is fed by every goal, since
 * consistency is what all of them share.
 */
export const SKILLS = [
  { id: 'fitness',    name: 'Fitness',    icon: 'dumbbell',   color: '#FF4B4B', blurb: 'Strength, endurance, movement' },
  { id: 'health',     name: 'Health',     icon: 'heart',      color: '#00CD4B', blurb: 'Nutrition, sleep, recovery' },
  { id: 'finance',    name: 'Finance',    icon: 'wallet',     color: '#FBBF24', blurb: 'Saving, budgeting, investing' },
  { id: 'knowledge',  name: 'Knowledge',  icon: 'graduation', color: '#3B82F6', blurb: 'Study, reading, new skills' },
  { id: 'creativity', name: 'Creativity', icon: 'palette',    color: '#A78BFA', blurb: 'Making, writing, performing' },
  { id: 'career',     name: 'Career',     icon: 'briefcase',  color: '#14B8A6', blurb: 'Craft, projects, progression' },
  { id: 'social',     name: 'Social',     icon: 'layers',     color: '#EC4899', blurb: 'Relationships and community' },
  { id: 'discipline', name: 'Discipline', icon: 'flame',      color: '#5DBC70', blurb: 'Showing up, day after day' },
] as const;

export type SkillId = (typeof SKILLS)[number]['id'];

/** Category alone is coarse, so the title is also scanned for stronger signals. */
const KEYWORDS: [RegExp, SkillId][] = [
  [/\b(run|marathon|5k|10k|gym|lift|strength|weight|muscle|swim|cycl|sport)/i, 'fitness'],
  [/\b(sleep|diet|nutrition|eat|meditat|mindful|therapy|water|smok|drink)/i, 'health'],
  [/\b(save|saving|invest|budget|debt|money|fund|financ|retire)/i, 'finance'],
  [/\b(read|book|learn|study|course|language|spanish|french|degree|exam|cod)/i, 'knowledge'],
  [/\b(write|novel|paint|draw|music|guitar|piano|art|photo|design|craft|creat)/i, 'creativity'],
  [/\b(career|promot|job|interview|portfolio|business|startup|network|salary)/i, 'career'],
  [/\b(friend|family|social|volunteer|communit|relationship|date|partner)/i, 'social'],
];

const CATEGORY_SKILLS: Record<string, SkillId[]> = {
  fitness:   ['fitness'],
  health:    ['health'],
  finance:   ['finance'],
  education: ['knowledge'],
  career:    ['career'],
  personal:  ['creativity'],
};

/** Which skills a goal feeds. Always includes discipline. */
export function skillsForGoal(goal: Goal): SkillId[] {
  const found = new Set<SkillId>(CATEGORY_SKILLS[goal.category] || []);
  const text = `${goal.title} ${goal.description || ''}`;
  for (const [re, skill] of KEYWORDS) if (re.test(text)) found.add(skill);
  found.add('discipline');
  return Array.from(found);
}

export interface SkillStat {
  id: SkillId;
  name: string;
  icon: string;
  color: string;
  blurb: string;
  xp: number;
  level: number;
  levelXp: number;
  levelSpan: number;
  goalCount: number;
  /** Days since this skill last earned anything; null when it never has. */
  daysSinceActive: number | null;
}

/** Skill levels use a gentler curve than the global one — 100 XP per step. */
function skillLevel(xp: number) {
  const level = Math.floor((-1 + Math.sqrt(1 + (8 * xp) / 100)) / 2) + 1;
  const start = (100 * (level - 1) * level) / 2;
  const end = (100 * level * (level + 1)) / 2;
  return { level, levelXp: xp - start, levelSpan: end - start };
}

export function computeSkills(goals: Goal[]): SkillStat[] {
  const xp: Record<string, number> = {};
  const goalCount: Record<string, number> = {};
  const lastActive: Record<string, string> = {};

  for (const goal of goals) {
    const skills = skillsForGoal(goal);
    for (const s of skills) goalCount[s] = (goalCount[s] || 0) + 1;

    // XP is split across the skills a goal feeds, so multi-skill goals do not
    // inflate the totals relative to focused ones.
    const share = 1 / skills.length;
    const credit = (amount: number, date?: string) => {
      for (const s of skills) {
        xp[s] = (xp[s] || 0) + amount * share;
        if (date && (!lastActive[s] || date > lastActive[s])) lastActive[s] = date;
      }
    };

    const taskById = new Map((goal.dailyTasks || []).map(t => [String(t.id), t]));
    for (const [date, day] of Object.entries(goal.taskCompletions || {})) {
      for (const [taskId, value] of Object.entries(day)) {
        if (value) credit(taskXp(taskById.get(taskId)?.difficulty), date);
      }
    }
    for (const s of goal.subtasks || []) {
      if (s.completed) credit(milestoneXp(s.difficulty), goal.updatedAt?.split('T')[0]);
    }
    for (const date of goal.checkIns || []) credit(5, date);
  }

  const today = new Date();
  return SKILLS.map(s => {
    const total = Math.round(xp[s.id] || 0);
    const { level, levelXp, levelSpan } = skillLevel(total);
    const last = lastActive[s.id];
    return {
      id: s.id, name: s.name, icon: s.icon, color: s.color, blurb: s.blurb,
      xp: total, level, levelXp, levelSpan,
      goalCount: goalCount[s.id] || 0,
      daysSinceActive: last
        ? Math.floor((today.getTime() - new Date(last).getTime()) / 86400000)
        : null,
    };
  });
}

export interface SkillGap {
  skill: SkillStat;
  reason: string;
  suggestion: string;
}

/**
 * Skills the user is neglecting — either never touched, or gone quiet while
 * others advanced. Drives the AI's proactive goal suggestions.
 */
export function findSkillGaps(skills: SkillStat[]): SkillGap[] {
  const active = skills.filter(s => s.xp > 0);
  if (active.length === 0) return [];
  const avg = active.reduce((sum, s) => sum + s.xp, 0) / active.length;

  const gaps: SkillGap[] = [];
  for (const s of skills) {
    if (s.id === 'discipline') continue;
    if (s.goalCount === 0 && s.xp === 0) {
      gaps.push({
        skill: s,
        reason: 'No goals feed this skill yet',
        suggestion: `Set a ${s.name.toLowerCase()} goal to start building it`,
      });
    } else if (s.daysSinceActive !== null && s.daysSinceActive >= 14) {
      gaps.push({
        skill: s,
        reason: `Quiet for ${s.daysSinceActive} days`,
        suggestion: `Pick this back up, or set a smaller ${s.name.toLowerCase()} goal`,
      });
    } else if (s.xp > 0 && s.xp < avg * 0.35) {
      gaps.push({
        skill: s,
        reason: 'Falling behind your other skills',
        suggestion: `A focused ${s.name.toLowerCase()} goal would even things out`,
      });
    }
  }
  return gaps.sort((a, b) => a.skill.xp - b.skill.xp).slice(0, 3);
}

/** Compact summary the AI coach can read to make proactive suggestions. */
export function skillsContext(goals: Goal[]): string {
  const skills = computeSkills(goals);
  const gaps = findSkillGaps(skills);
  const lines = skills
    .filter(s => s.xp > 0)
    .sort((a, b) => b.xp - a.xp)
    .map(s => `${s.name} Lv.${s.level} (${s.xp} XP)`);

  let out = lines.length ? `SKILLS: ${lines.join(', ')}.` : 'SKILLS: none developed yet.';
  if (gaps.length) {
    out += `\nNEGLECTED: ${gaps.map(g => `${g.skill.name} — ${g.reason}`).join('; ')}.`
      + ' If it fits naturally, suggest ONE goal that would build a neglected skill. Never force it.';
  }
  return out;
}

export { levelFromXp, xpForLevel };
