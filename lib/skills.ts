import type { Goal } from './types';
import { taskXp, milestoneXp, completionXp, levelFromXp, xpForLevel, streaksFromCheckIns, rankFromXp } from './xp';

/**
 * Skill domains, matching the reference app's set. Eight are goal-linked: a
 * goal feeds one or more of them, so working the goal levels the domains
 * behind it.
 *
 * Discipline is deliberately not in that list. It is *derived consistency* —
 * earned from follow-through and streak stability rather than from any goal's
 * subject matter — so it is computed separately and is never a goal category.
 */
export const GOAL_DOMAINS = [
  { id: 'health',       name: 'Health',       icon: 'heart',      color: '#00CD4B', blurb: 'Fitness, energy, recovery, physical resilience' },
  { id: 'intelligence', name: 'Intelligence', icon: 'brain',      color: '#3B82F6', blurb: 'Reading, learning, knowledge, mental sharpness' },
  { id: 'creativity',   name: 'Creativity',   icon: 'palette',    color: '#A78BFA', blurb: 'Expression, invention, original work' },
  { id: 'charisma',     name: 'Charisma',     icon: 'speech',     color: '#EC4899', blurb: 'Relationships, communication, social presence' },
  { id: 'vocation',     name: 'Vocation',     icon: 'briefcase',  color: '#14B8A6', blurb: 'Career momentum, financial capability, craft' },
  { id: 'resilience',   name: 'Resilience',   icon: 'shield',     color: '#FB923C', blurb: 'Endurance, adaptability, fortitude under pressure' },
  { id: 'leadership',   name: 'Leadership',   icon: 'swords',     color: '#FBBF24', blurb: 'Guiding teams, organising projects, taking command' },
  { id: 'exploration',  name: 'Exploration',  icon: 'compass',    color: '#38BDF8', blurb: 'Discovering new horizons, broadening perspectives' },
] as const;

export const DISCIPLINE = {
  id: 'discipline', name: 'Discipline', icon: 'flame', color: '#5DBC70',
  blurb: 'Derived from follow-through and streak stability',
} as const;

/** All nine, in display order, with Discipline last since it is derived. */
export const SKILLS = [...GOAL_DOMAINS, DISCIPLINE] as const;

export type GoalDomainId = (typeof GOAL_DOMAINS)[number]['id'];
export type SkillId = GoalDomainId | 'discipline';

/** Category alone is coarse, so the title and description are also scanned. */
const KEYWORDS: [RegExp, GoalDomainId][] = [
  [/\b(run|marathon|5k|10k|gym|lift|strength|weight|muscle|swim|cycl|sport|sleep|diet|nutrition|eat|water|smok|drink)/i, 'health'],
  [/\b(read|book|learn|study|course|language|spanish|french|degree|exam|cod|research|maths?)/i, 'intelligence'],
  [/\b(write|novel|paint|draw|music|guitar|piano|art|photo|design|craft|creat|compose|film)/i, 'creativity'],
  [/\b(friend|family|social|communit|relationship|date|partner|speak|present|confidence|network|converse)/i, 'charisma'],
  [/\b(career|promot|job|interview|portfolio|business|startup|salary|save|saving|invest|budget|debt|money|financ|retire)/i, 'vocation'],
  [/\b(meditat|mindful|therapy|quit|stress|anxiety|recover|endur|consistenc|sober|resilien)/i, 'resilience'],
  [/\b(lead|team|manage|mentor|organis|organiz|coach|volunteer|found|delegate)/i, 'leadership'],
  [/\b(travel|explor|visit|countr|adventure|discover|hike|camp|abroad)/i, 'exploration'],
];

/** Our goal categories mapped onto the domain set. */
const CATEGORY_DOMAINS: Record<string, GoalDomainId[]> = {
  fitness:   ['health'],
  health:    ['health', 'resilience'],
  education: ['intelligence'],
  career:    ['vocation'],
  finance:   ['vocation'],
  personal:  ['exploration'],
};

/**
 * Which domains a goal feeds. Never includes discipline — that is derived from
 * behaviour, not from what the goal is about.
 */
export function skillsForGoal(goal: Goal): GoalDomainId[] {
  const found = new Set<GoalDomainId>(CATEGORY_DOMAINS[goal.category] || []);
  const text = `${goal.title} ${goal.description || ''}`;
  for (const [re, domain] of KEYWORDS) if (re.test(text)) found.add(domain);
  if (found.size === 0) found.add('exploration');
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
  /** Recurring task completions credited to this domain. */
  tasks: number;
  /** Milestones ("clears") credited to this domain. */
  clears: number;
  /** This domain's own rank on the shared ladder, from its own XP. */
  rank: ReturnType<typeof rankFromXp>;
  /** True for the derived consistency domain, which no goal targets directly. */
  derived: boolean;
  /** Days since this domain last earned anything; null when it never has. */
  daysSinceActive: number | null;
}

/** Domain levels use a gentler curve than the global one — 100 XP per step. */
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
  const taskHits: Record<string, number> = {};
  const clearHits: Record<string, number> = {};

  // Discipline inputs, accumulated across every goal.
  let checkInCount = 0;
  let tasksDone = 0;
  let tasksExpected = 0;
  let bestStreak = 0;
  let disciplineLast: string | undefined;

  for (const goal of goals) {
    const domains = skillsForGoal(goal);
    for (const d of domains) goalCount[d] = (goalCount[d] || 0) + 1;

    // XP is split across the domains a goal feeds, so a goal touching many
    // domains does not out-earn a focused one.
    const share = 1 / domains.length;
    const credit = (amount: number, date?: string) => {
      for (const d of domains) {
        xp[d] = (xp[d] || 0) + amount * share;
        if (date && (!lastActive[d] || date > lastActive[d])) lastActive[d] = date;
      }
      if (date && (!disciplineLast || date > disciplineLast)) disciplineLast = date;
    };

    const taskById = new Map((goal.dailyTasks || []).map(t => [String(t.id), t]));
    for (const [date, day] of Object.entries(goal.taskCompletions || {})) {
      for (const [taskId, value] of Object.entries(day)) {
        if (value) {
          credit(completionXp(value, taskById.get(taskId)?.difficulty), date);
          for (const d of domains) taskHits[d] = (taskHits[d] || 0) + 1;
          tasksDone++;
        }
      }
    }
    for (const s of goal.subtasks || []) {
      if (!s.completed) continue;
      credit(milestoneXp(s.difficulty), goal.updatedAt?.split('T')[0]);
      for (const d of domains) clearHits[d] = (clearHits[d] || 0) + 1;
    }
    for (const date of goal.checkIns || []) {
      credit(5, date);
      checkInCount++;
    }

    // How many recurring completions the goal *could* have had since it began.
    const days = Object.keys(goal.taskCompletions || {}).length;
    tasksExpected += days * Math.max((goal.dailyTasks || []).length, 1);

    const { longest } = streaksFromCheckIns(goal.checkIns || []);
    if (longest > bestStreak) bestStreak = longest;
  }

  /*
   * Discipline is consistency, not subject matter: showing up (check-ins),
   * following through on the work you scheduled (completion rate), and holding
   * a streak. It deliberately cannot be farmed by simply owning more goals.
   */
  const followThrough = tasksExpected > 0 ? Math.min(tasksDone / tasksExpected, 1) : 0;
  const disciplineXp = Math.round(
    checkInCount * 8
    + tasksDone * 4
    + followThrough * 250
    + Math.min(bestStreak, 30) * 12,
  );

  const today = new Date();
  const daysSince = (iso?: string) =>
    iso ? Math.floor((today.getTime() - new Date(`${iso}T12:00:00`).getTime()) / 86400000) : null;

  const domainStats: SkillStat[] = GOAL_DOMAINS.map(d => {
    const total = Math.round(xp[d.id] || 0);
    const { level, levelXp, levelSpan } = skillLevel(total);
    return {
      id: d.id, name: d.name, icon: d.icon, color: d.color, blurb: d.blurb,
      xp: total, level, levelXp, levelSpan,
      goalCount: goalCount[d.id] || 0,
      tasks: taskHits[d.id] || 0,
      clears: clearHits[d.id] || 0,
      rank: rankFromXp(total),
      derived: false,
      daysSinceActive: daysSince(lastActive[d.id]),
    };
  });

  const dl = skillLevel(disciplineXp);
  domainStats.push({
    id: 'discipline', name: DISCIPLINE.name, icon: DISCIPLINE.icon,
    color: DISCIPLINE.color, blurb: DISCIPLINE.blurb,
    xp: disciplineXp, level: dl.level, levelXp: dl.levelXp, levelSpan: dl.levelSpan,
    goalCount: goals.length,
    tasks: tasksDone,
    clears: 0,
    rank: rankFromXp(disciplineXp),
    derived: true,
    daysSinceActive: daysSince(disciplineLast),
  });

  return domainStats;
}

export interface SkillGap {
  skill: SkillStat;
  reason: string;
  suggestion: string;
}

/**
 * Domains the user is neglecting — never touched, or gone quiet while others
 * advanced. Drives the coach's proactive suggestions. Discipline is excluded:
 * it is derived, so there is no goal you could set to "raise Discipline".
 */
export function findSkillGaps(skills: SkillStat[]): SkillGap[] {
  const active = skills.filter(s => !s.derived && s.xp > 0);
  if (active.length === 0) return [];
  const avg = active.reduce((sum, s) => sum + s.xp, 0) / active.length;

  const gaps: SkillGap[] = [];
  for (const s of skills) {
    if (s.derived) continue;
    if (s.goalCount === 0 && s.xp === 0) {
      gaps.push({
        skill: s,
        reason: 'No goals feed this domain yet',
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
        reason: 'Falling behind your other domains',
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
      + ' If it fits naturally, suggest ONE goal that would build a neglected domain. Never force it.';
  }
  return out;
}

export { levelFromXp, xpForLevel };
