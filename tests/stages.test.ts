import { test } from 'node:test';
import assert from 'node:assert/strict';
import { visibleMilestones, activeTasks, currentStage } from '../lib/stages';
import { makeGoal } from '../scripts/ui-harness/fixtures';

const titles = (g: ReturnType<typeof makeGoal>) => visibleMilestones(g).map(v => v.milestone.stageId);

test('only the current stage’s milestones are visible', () => {
  const g = makeGoal({ id: 'a', title: 'x', category: 'fitness', stages: 4, milestonesDone: 1 });
  assert.equal(currentStage(g)?.stage.id, 's0');
  assert.deepEqual(Array.from(new Set(titles(g))), ['s0']);
  assert.equal(visibleMilestones(g).length, 3);
});

test('finishing a stage swaps the list to the next stage', () => {
  const g = makeGoal({ id: 'a', title: 'x', category: 'fitness', stages: 4, milestonesDone: 3 });
  assert.equal(currentStage(g)?.stage.id, 's1');
  assert.deepEqual(Array.from(new Set(titles(g))), ['s1']);
  // …and the tasks follow.
  assert.deepEqual(Array.from(new Set(activeTasks(g).map(t => t.stageId))), ['s1']);
});

test('indexes point back into goal.subtasks, so ticks hit the right one', () => {
  const g = makeGoal({ id: 'a', title: 'x', category: 'fitness', stages: 4, milestonesDone: 3 });
  for (const { milestone, index } of visibleMilestones(g)) assert.equal(g.subtasks[index], milestone);
});

test('a finished plan shows every milestone as its record', () => {
  const g = makeGoal({ id: 'a', title: 'x', category: 'fitness', stages: 2, milestonesDone: 6 });
  assert.equal(currentStage(g), null);
  assert.equal(visibleMilestones(g).length, 6);
});

test('no stages: everything shows; unstaged milestones always show', () => {
  const g = makeGoal({ id: 'a', title: 'x', category: 'fitness', stages: 2 });
  assert.equal(visibleMilestones({ ...g, stages: [] }).length, 6);
  const extra = { ...g, subtasks: [...g.subtasks, { id: 1, title: 'loose', daysFromStart: 1, completed: false }] };
  assert.ok(visibleMilestones(extra).some(v => v.milestone.title === 'loose'));
});
