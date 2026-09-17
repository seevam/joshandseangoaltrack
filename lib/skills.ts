import type { Goal } from './types';
import { taskXp, milestoneXp, completionXp, levelFromXp, xpForLevel, streaksFromCheckIns, rankFromXp } from './xp';
import { GOAL_DOMAINS, DISCIPLINE, skillsForGoal, domainGoalIdea, type GoalDomainId, type SkillId } from './domains';
import { baselineXp, loadSkillBaseline, weakestDomains, type SkillBaseline } from './skillBaseline';

/**
 * Skill domains, matching the reference app's set. Eight are goal-linked: a
 * goal feeds one or more of them, so working the goal levels the domains
 * behind it.
 *
 * Discipline is deliberately not in that list. It is *derived consistency* —
 * earned from follow-through and streak stability rather than from any goal's
 * subject matter — so it is computed separately and is never a goal category.
 */
export {
  GOAL_DOMAINS, DISCIPLINE, skillsForGoal,
  type GoalDomainId, type SkillId,
} from './domains';

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
  /** Head start credited from the user's own self-assessment, if any. */
  baselineXp: number;
}

/** Domain levels use a gentler curve than the global one — 100 XP per step. */
function skillLevel(xp: number) {
  const level = Math.floor((-1 + Math.sqrt(1 + (8 * xp) / 100)) / 2) + 1;
  const start = (100 * (level - 1) * level) / 2;
  const end = (100 * level * (level + 1)) / 2;
  return { level, levelXp: xp - start, levelSpan: end - start };
}

export function computeSkills(goals: Goal[], baseline?: SkillBaseline): SkillStat[] {
  /*
   * The self-assessment is a head start on the SKILL ladder only. It never
   * reaches the overall rank: a number you type about yourself must not buy a
   * rank, or the honest answer becomes the losing one.
   */
  const rated = baseline ?? loadSkillBaseline();
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
    const head = rated[d.id] ? baselineXp(rated[d.id]!) : 0;
    const total = Math.round((xp[d.id] || 0) + head);
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
      baselineXp: head,
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
    // Discipline is earned by showing up. There is no self-assessed shortcut.
    baselineXp: 0,
  });

  return domainStats;
}

export interface SkillGap {
  skill: SkillStat;
  reason: string;
  /** A specific goal worth setting, not an instruction to think of one. */
  suggestion: string;
}

/**
 * Domains the user is neglecting — never touched, or gone quiet while others
 * advanced. Drives the coach's proactive suggestions. Discipline is excluded:
 * it is derived, so there is no goal you could set to "raise Discipline".
 */
export function findSkillGaps(skills: SkillStat[]): SkillGap[] {
  // Measured on earned XP, so a domain the user merely rated highly does not
  // raise the bar that every other domain is judged against.
  const active = skills.filter(s => !s.derived && s.xp - s.baselineXp > 0);
  if (active.length === 0) return [];
  const avg = active.reduce((sum, s) => sum + (s.xp - s.baselineXp), 0) / active.length;

  const gaps: SkillGap[] = [];
  for (const s of skills) {
    if (s.derived) continue;
    /*
     * The idea is picked from the domain's own list rather than described in
     * the abstract. "Set a creativity goal" restates the problem and leaves
     * the hard part to the person who has already not done it.
     *
     * Seeded by the domain's XP and goal count so it is stable across renders
     * but changes as the picture does.
     */
    const idea = domainGoalIdea(s.id as GoalDomainId, s.xp + s.goalCount * 7);
    // goalCount alone, not xp: a self-assessed head start is not work done.
    if (s.goalCount === 0) {
      gaps.push({ skill: s, reason: 'Nothing feeds this domain yet', suggestion: idea });
    } else if (s.daysSinceActive !== null && s.daysSinceActive >= 14) {
      gaps.push({ skill: s, reason: `Quiet for ${s.daysSinceActive} days`, suggestion: idea });
    } else if (s.xp - s.baselineXp > 0 && s.xp - s.baselineXp < avg * 0.35) {
      gaps.push({ skill: s, reason: 'Falling behind your other domains', suggestion: idea });
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

  /*
   * What the user said about themselves at sign-up. The coach should recommend
   * goals for the areas they rated lowest — that is the whole point of having
   * asked — while knowing that a high rating is a claim, not an achievement.
   */
  const rated = loadSkillBaseline();
  const weak = weakestDomains(rated, 3)
    .map(id => GOAL_DOMAINS.find(d => d.id === id)?.name)
    .filter(Boolean);
  if (Object.keys(rated).length && weak.length) {
    out += `\nSELF-RATED WEAKEST: ${weak.join(', ')}.`
      + ' Prioritise goal ideas here when the user is open to a new goal.';
  }

  if (gaps.length) {
    out += `\nNEGLECTED: ${gaps.map(g => `${g.skill.name} (${g.reason}) — e.g. "${g.suggestion}"`).join('; ')}.`
      + ' If it fits naturally, suggest ONE concrete goal that would build a neglected domain —'
      + ' name an actual goal, not "set a goal in this area". Offer it once and never force it.';
  }
  return out;
}

export { levelFromXp, xpForLevel };
