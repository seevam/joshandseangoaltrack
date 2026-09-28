import { test } from 'node:test';
import assert from 'node:assert/strict';
import { milestoneKind } from '../lib/milestones';

const kind = (title: string) => milestoneKind({ title });

test('single sittings are actions', () => {
  for (const t of [
    'Complete a 2.5 hour run', 'Complete a continuous 8km run', 'Run a half marathon',
    'Finish your first chapter', 'Give a talk at a local meetup', 'Pass the practice exam',
    'Ship the landing page', 'Race simulation: 10km at marathon pace', 'Run/walk 24km long run',
  ]) assert.equal(kind(t), 'action', t);
});

test('totals, tallies and thresholds are cumulative', () => {
  for (const t of [
    'Reach 30km total in a week', 'Run 100km in total', 'Read 5 books', 'Save $1,000',
    'Lose 5kg', 'Meditate 10 days in a row', 'Run 4 times a week for 3 weeks',
    'Hit a 14-day streak', 'Complete 20 sessions', 'Average 8 hours of sleep',
  ]) assert.equal(kind(t), 'cumulative', t);
});

test('an explicit kind wins, and existing steps mean action', () => {
  assert.equal(milestoneKind({ title: 'Reach 30km total', kind: 'action' }), 'action');
  assert.equal(milestoneKind({ title: 'Read 5 books', executionSteps: ['a'] }), 'action');
  assert.equal(milestoneKind({ title: 'Complete a run', kind: 'cumulative' }), 'cumulative');
});
