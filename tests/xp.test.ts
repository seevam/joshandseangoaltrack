import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeStats, RANK_TIERS } from '../lib/xp';
import { computeSkills, skillsForGoal } from '../lib/skills';
import { dayKey } from '../lib/dates';
import { makeGoal } from '../scripts/ui-harness/fixtures';
import type { Goal } from '../lib/types';

const DAY = 86400000;
const rankIdx = (slug: string) => RANK_TIERS.findIndex(t => t.slug === slug);

/** A goal with every task ticked on each of the last `days` days. */
function worked(g: Goal, days: number, milestonesDone = 0): Goal {
  const taskCompletions: Goal['taskCompletions'] = {};
  for (let d = 1; d <= days; d++) {
    taskCompletions[dayKey(new Date(Date.now() - d * DAY))] =
      Object.fromEntries(g.dailyTasks.map(t => [t.id, true]));
  }
  const checkIns = Object.keys(taskCompletions);
  return { ...g, taskCompletions, checkIns, subtasks: g.subtasks.map((m, i) => ({ ...m, completed: i < milestonesDone })) };
}

test('a marathon goal feeds Health only, whatever its description says', () => {
  const g = makeGoal({
    id: 'm', title: 'Run my first marathon', category: 'fitness',
    description: 'Get ready for race day: learn your pacing, read up on fuelling, and of course build endurance. For example, study the course.',
  });
  assert.deepEqual(skillsForGoal(g), ['health']);

  const skills = computeSkills([worked(g, 30, 3)], {});
  for (const s of skills) {
    if (s.id === 'health' || s.id === 'discipline') assert.ok(s.xp > 0, `${s.id} should have earned`);
    else assert.equal(s.xp, 0, `${s.name} earned ${s.xp} from Health-only work`);
  }
});

test('the title can add a domain it plainly names', () => {
  const g = makeGoal({ id: 'l', title: 'Learn to play guitar', category: 'education' });
  assert.deepEqual(skillsForGoal(g).sort(), ['creativity', 'intelligence']);
});

test('a vague personal goal takes its single strongest domain from the description', () => {
  const g = makeGoal({
    id: 'p', title: 'Become a better version of myself', category: 'personal',
    description: 'Travel more, visit new countries, and read on the plane.',
  });
  assert.deepEqual(skillsForGoal(g), ['exploration']);
  const blank = makeGoal({ id: 'b', title: 'Something new', category: 'personal' });
  assert.deepEqual(skillsForGoal(blank), ['exploration']);
});

test('words that merely start like a keyword do not count', () => {
  const titles = ['Get ready for the move', 'Update my example portfolio site', 'Restart my startup'];
  const g = (title: string) => makeGoal({ id: 'w', title, category: 'career' });
  assert.deepEqual(skillsForGoal(g(titles[0])), ['vocation']);
  assert.deepEqual(skillsForGoal(g(titles[1])), ['vocation']);
  assert.deepEqual(skillsForGoal(g(titles[2])), ['vocation']);
});

test('the overall rank and level never run ahead of the strongest skill', () => {
  const titles: [string, Goal['category']][] = [
    ['Run my first marathon', 'fitness'], ['Read 24 books', 'education'],
    ['Ship a side business', 'career'], ['Learn guitar', 'education'],
    ['Visit three new countries', 'personal'], ['Meditate daily', 'personal'],
  ];
  // Deterministic spread of scenarios: from one goal to all six, lightly to
  // heavily worked, with and without finished goals.
  for (let n = 1; n <= titles.length; n++) {
    for (const days of [0, 1, 5, 30, 120, 365]) {
      for (const done of [0, 2, 12]) {
        const goals = titles.slice(0, n).map(([title, category], i) =>
          worked(makeGoal({ id: `g${i}`, title, category }), i === 0 ? days : Math.floor(days / (i + 1)), done));
        const stats = computeStats(goals);
        const skills = computeSkills(goals, {});
        const best = skills.reduce((a, b) => (b.xp > a.xp ? b : a));
        const label = `${n} goals, ${days} days, ${done} milestones`;
        assert.ok(stats.totalXp <= best.xp, `${label}: overall ${stats.totalXp} > ${best.name} ${best.xp}`);
        assert.ok(stats.level <= best.level, `${label}: level ${stats.level} > ${best.level}`);
        assert.ok(rankIdx(stats.rank.slug) <= rankIdx(best.rank.slug), `${label}: rank ahead of ${best.name}`);
      }
    }
  }
});

test('the same work spread across two domains ranks higher than all in one', () => {
  const run = makeGoal({ id: 'a', title: 'Run a 10k', category: 'fitness', stages: 1 });
  const read = makeGoal({ id: 'b', title: 'Read 12 books', category: 'education', stages: 1 });
  const focused = computeStats([worked(run, 60), worked({ ...run, id: 'a2' }, 60)]);
  const spread = computeStats([worked(run, 60), worked(read, 60)]);
  assert.equal(focused.earnedXp, spread.earnedXp);
  assert.ok(spread.totalXp > focused.totalXp, `${spread.totalXp} should beat ${focused.totalXp}`);
  assert.ok(spread.balance > focused.balance);
});

test('finishing a goal pays its skills, not just the overall total', () => {
  const g = makeGoal({ id: 'f', title: 'Run a 10k', category: 'fitness', stages: 1 });
  const before = computeSkills([worked(g, 0, g.subtasks.length - 1)], {}).find(s => s.id === 'health')!;
  const after = computeSkills([worked(g, 0, g.subtasks.length)], {}).find(s => s.id === 'health')!;
  assert.equal(after.xp - before.xp, 100 + 500); // the last milestone + the finish
});

test('a new user starts at level 1, Initiate', () => {
  const s = computeStats([]);
  assert.equal(s.totalXp, 0);
  assert.equal(s.level, 1);
  assert.equal(s.rank.slug, 'initiate');
});

test('a self-rated head start lifts the skill but never the overall rank', () => {
  const g = worked(makeGoal({ id: 'h', title: 'Run a 10k', category: 'fitness', stages: 1 }), 10);
  const rated = computeSkills([g], { health: 10, intelligence: 10 });
  const plain = computeSkills([g], {});
  assert.ok(rated.find(s => s.id === 'intelligence')!.xp > 0);
  assert.equal(plain.find(s => s.id === 'intelligence')!.xp, 0);
  // The overall is at most the strongest EARNED skill, whatever was rated.
  const earnedBest = Math.max(...plain.map(s => s.xp));
  assert.ok(computeStats([g]).totalXp <= earnedBest);
});
