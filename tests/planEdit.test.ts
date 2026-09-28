import { test } from 'node:test';
import assert from 'node:assert/strict';
import { planFromGoal, planToGoalFields, emptyPlan, validatePlan, unrated, dueFromDays, daysFromDue, newKey } from '../lib/planEdit';
import { makeGoal } from '../scripts/ui-harness/fixtures';

const goal = () => {
  const g = makeGoal({ id: 'e', title: 'Run my first marathon', category: 'fitness', stages: 2, milestonesDone: 1, completionsDaysBack: 3 });
  g.subtasks[0] = { ...g.subtasks[0], completedAt: '2026-09-01T10:00:00.000Z', setup: 'kit', executionSteps: ['a'] };
  return g;
};

test('a round trip with no edits changes nothing that matters', () => {
  const g = goal();
  const out = planToGoalFields(planFromGoal(g), g.startDate, g);
  assert.deepEqual(out.stages.map(s => s.id), g.stages!.map(s => s.id));
  assert.deepEqual(out.subtasks.map(m => [m.id, m.stageId, m.daysFromStart, m.completed, m.difficulty]),
    g.subtasks.map(m => [m.id, m.stageId, m.daysFromStart, m.completed, m.difficulty]));
  assert.equal(out.subtasks[0].completedAt, g.subtasks[0].completedAt, 'history survives');
  assert.deepEqual(out.subtasks[0].executionSteps, ['a']);
  assert.deepEqual(out.dailyTasks.map(t => t.id), g.dailyTasks.map(t => t.id), 'task ids survive, so completions still match');
  assert.deepEqual(out.dailyTasks[0].executionSteps, g.dailyTasks[0].executionSteps);
});

test('re-wording an item drops what described the old wording', () => {
  const g = goal();
  const plan = planFromGoal(g);
  plan.milestones[0] = { ...plan.milestones[0], title: 'Run a 10k race', difficulty: undefined, kind: undefined };
  plan.tasks[0] = { ...plan.tasks[0], title: 'Swim 1km', difficulty: undefined };
  assert.equal(unrated(plan).milestones.length, 1);
  assert.equal(unrated(plan).tasks.length, 1);
  const out = planToGoalFields(plan, g.startDate, g);
  assert.equal(out.subtasks[0].executionSteps, undefined);
  assert.equal(out.subtasks[0].difficulty, undefined);
  assert.equal(out.subtasks[0].completedAt, g.subtasks[0].completedAt, 'but not its history');
  assert.equal(out.dailyTasks[0].executionSteps, undefined);
  assert.equal(out.dailyTasks[0].id, g.dailyTasks[0].id);
});

test('moving a milestone to another stage re-files it and re-orders the plan', () => {
  const g = goal();
  const plan = planFromGoal(g);
  const moved = plan.milestones[0];
  moved.stageKey = plan.stages[1].key;
  const out = planToGoalFields(plan, g.startDate, g);
  const m = out.subtasks.find(x => x.id === moved.id)!;
  assert.equal(m.stageId, g.stages![1].id);
  const firstStage2 = out.subtasks.findIndex(x => x.stageId === g.stages![1].id);
  assert.ok(out.subtasks.slice(firstStage2).every(x => x.stageId === g.stages![1].id), 'stage 1 items all come first');
});

test('new items get fresh ids that never collide, and undated milestones are spaced', () => {
  const g = goal();
  const plan = planFromGoal(g);
  const stage = plan.stages[1].key;
  plan.milestones.push({ key: newKey('m'), stageKey: stage, title: 'New one', due: '', completed: false });
  plan.tasks.push({ key: newKey('t'), stageKey: stage, title: 'New task', daysOfWeek: [5, 1] });
  const out = planToGoalFields(plan, g.startDate, g);
  const ids = [...out.subtasks.map(m => m.id), ...out.dailyTasks.map(t => t.id)];
  assert.equal(new Set(ids).size, ids.length);
  const nm = out.subtasks.find(m => m.title === 'New one')!;
  const before = out.subtasks[out.subtasks.indexOf(nm) - 1];
  assert.equal(nm.daysFromStart, before.daysFromStart + 14);
  const nt = out.dailyTasks.find(t => t.title === 'New task')!;
  assert.deepEqual(nt.daysOfWeek, [1, 5]);
  assert.equal(nt.type, 'checkbox');
});

test('a goal without stages opens with one holding everything', () => {
  const g = { ...goal(), stages: [] };
  const plan = planFromGoal(g);
  assert.equal(plan.stages.length, 1);
  assert.ok(plan.milestones.every(m => m.stageKey === plan.stages[0].key));
});

test('due dates and days from start convert both ways', () => {
  const start = '2026-09-01T09:30:00.000Z';
  for (const d of [0, 1, 13, 200]) assert.equal(daysFromDue(start, dueFromDays(start, d)), d);
});

test('blank names are caught before saving', () => {
  const plan = emptyPlan();
  assert.equal(validatePlan(plan).length, 0);
  plan.stages[0].title = ' ';
  plan.tasks.push({ key: 'x', stageKey: plan.stages[0].key, title: '', daysOfWeek: [] });
  assert.equal(validatePlan(plan).length, 2);
});
