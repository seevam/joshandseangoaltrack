// #5 / #12 — Manual Entry and Edit Goal build and edit the real plan:
// stages, the milestones in each, each stage's tasks. XP is set by the AI.
import { launch, BASE } from '../browser.mjs';
const b = await launch();
let fails = 0;
const t = (name, ok, extra = '') => { if (!ok) fails++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? '  ' + extra : ''}`); };
const shot = name => new URL(`../.out/${name}.png`, import.meta.url).pathname;
const p = await b.newPage({ viewport: { width: 1440, height: 1000 } });
const stage = n => p.getByRole('listitem', { name: new RegExp(`^Stage ${n}\\b`) });
const lastCall = async re => { const c = (await p.evaluate(() => window.__calls)).filter(x => re.test(x)); return c[c.length - 1]; };

// ── Manual Entry ────────────────────────────────────────────────────────────
await p.goto(`${BASE}?reset#/home`);
await p.waitForTimeout(1200);
await p.evaluate(() => { window.__calls = []; window.__store.getState().setShowCreateGoal(true); });
await p.getByRole('button', { name: /QUICK CREATE/ }).click();
await p.getByRole('button', { name: 'Manual Entry' }).click();
const width = await p.getByRole('dialog').first().evaluate(el => el.getBoundingClientRect().width);
t('the modal widens for the plan builder', width >= 600, String(Math.round(width)));

// Blank names are caught, named, and outlined — and not "retried".
await p.getByRole('button', { name: 'Create Goal' }).click();
let err = p.getByRole('alertdialog');
await err.waitFor({ timeout: 2000 });
t('a missing title is explained', /Give your goal a title/.test(await err.textContent()) && (await err.getByRole('button', { name: /Try again/ }).count()) === 0);
await err.getByRole('button', { name: 'OK' }).click();

await p.locator('#manual-title').fill('Learn to play guitar');
await p.getByRole('textbox', { name: 'Stage 1 name' }).fill('Foundations');
await stage(1).getByRole('button', { name: 'Add milestone' }).click();
await stage(1).getByRole('textbox', { name: 'Milestone title' }).fill('Play five open chords cleanly');
await stage(1).getByRole('button', { name: 'Add task' }).click();
await stage(1).getByRole('textbox', { name: 'Task title' }).fill('Practise chord changes');
for (const d of ['Monday', 'Wednesday', 'Friday']) await stage(1).getByRole('button', { name: d }).click();
t('new steps show their XP is set on save', (await stage(1).getByText('XP on save').count()) === 2);

await p.getByRole('button', { name: 'Add stage' }).click();
await p.getByRole('textbox', { name: 'Stage 2 name' }).fill('First songs');
await stage(2).getByRole('button', { name: 'Add milestone' }).click();
await stage(2).getByRole('textbox', { name: 'Milestone title' }).fill('Play a full song start to finish');
// A milestone written in the wrong stage can be moved to another.
await stage(1).getByRole('button', { name: 'Add milestone' }).click();
await stage(1).getByRole('textbox', { name: 'Milestone title' }).nth(1).fill('Learn a second song');
await stage(1).getByRole('combobox', { name: 'Stage for Learn a second song' }).selectOption({ label: 'Stage 2 · First songs' });
t('a milestone can be assigned to another stage', (await stage(2).getByRole('textbox', { name: 'Milestone title' }).count()) === 2);
await p.screenshot({ path: shot('manual-entry'), fullPage: false });

const before = await p.evaluate(() => window.__store.getState().goals.length);
await p.getByRole('button', { name: 'Create Goal' }).click();
await p.waitForFunction(n => window.__store.getState().goals.length > n, before, { timeout: 5000 }).catch(() => {});
t('Manual Entry creates the goal', (await p.evaluate(() => window.__store.getState().goals.length)) === before + 1);
t('the AI was asked to rate every step', (await lastCall(/"rate_plan"/))?.match(/- \S+ \[/g)?.length === 4);
const posted = JSON.parse((await lastCall(/^POST \/api\/goals/)).replace(/^POST \/api\/goals /, ''));
t('saved with its stages', posted.stages.map(s => s.title).join('|') === 'Foundations|First songs');
t('milestones filed under their stages', posted.subtasks.filter(m => m.stageId === posted.stages[1].id).length === 2 && posted.subtasks[0].stageId === posted.stages[0].id);
t('tasks filed under their stage with their days', posted.dailyTasks[0].stageId === posted.stages[0].id && posted.dailyTasks[0].daysOfWeek.join() === '1,3,5');
t('XP set by the AI, never by the user', posted.subtasks.every(m => m.difficulty === 'hard') && posted.dailyTasks[0].difficulty === 'easy' && posted.dailyTasks[0].estimatedMinutes === 15);

// The rating can fail; the goal still saves, on the fallback.
await p.evaluate(() => { window.__calls = []; window.__store.getState().setShowCreateGoal(true); const ai = window.__ai; window.__ai = r => (r.tool_choice?.function?.name === 'rate_plan' ? { __status: 500 } : ai(r)); });
await p.getByRole('button', { name: /QUICK CREATE/ }).click();
await p.getByRole('button', { name: 'Manual Entry' }).click();
await p.locator('#manual-title').fill('Save an emergency fund');
await stage(1).getByRole('button', { name: 'Add task' }).click();
await stage(1).getByRole('textbox', { name: 'Task title' }).fill('Move money to savings');
await stage(1).getByRole('spinbutton').fill('10');
await p.getByRole('button', { name: 'Create Goal' }).click();
await p.waitForTimeout(800);
const fb = JSON.parse((await lastCall(/^POST \/api\/goals/)).replace(/^POST \/api\/goals /, ''));
t('rating offline: saves anyway, rated by the fallback', fb.title === 'Save an emergency fund' && fb.dailyTasks[0].difficulty === 'easy');

// ── Edit Goal ───────────────────────────────────────────────────────────────
await p.goto(`${BASE}?reset#/goals/g1`);
await p.waitForTimeout(1500);
await p.evaluate(() => { window.__calls = []; });
await p.getByRole('button', { name: 'Edit goal' }).click();
const dlg = p.getByRole('dialog', { name: 'Edit goal' });
await dlg.waitFor();
t('the editor shows the goal’s four stages', (await dlg.getByRole('textbox', { name: /^Stage \d name$/ }).count()) === 4);
t('each with its own milestones and tasks', (await stage(1).getByRole('textbox', { name: 'Milestone title' }).count()) === 3 && (await stage(1).getByRole('textbox', { name: 'Task title' }).count()) === 2);
t('finished milestones are marked', (await stage(1).getByLabel('Completed').count()) === 1);
t('existing XP is shown, read-only', (await stage(1).getByText('+100 XP').count()) === 3 && (await stage(1).getByText('+20 XP').count()) === 2);
await p.screenshot({ path: shot('edit-goal') });

// Discard guard.
await dlg.getByRole('textbox', { name: 'Goal title' }).fill('Run my first marathon!');
await dlg.getByRole('button', { name: 'Cancel' }).click();
const discard = p.getByRole('alertdialog', { name: /Discard your changes/ });
t('unsaved changes ask before closing', await discard.count() === 1);
await discard.getByRole('button', { name: 'Keep editing' }).click();
t('Keep editing keeps them', (await dlg.getByRole('textbox', { name: 'Goal title' }).inputValue()) === 'Run my first marathon!');

// Re-word a task, move a milestone, add a task, delete a stage.
const task0 = stage(1).getByRole('textbox', { name: 'Task title' }).first();
await task0.fill('Run 4km at an easy pace');
t('re-wording clears its XP for re-rating', (await stage(1).getByText('XP on save').count()) === 1);
await stage(2).getByRole('combobox').first().selectOption({ index: 0 });
await stage(1).getByRole('button', { name: 'Add task' }).click();
await stage(1).getByRole('textbox', { name: 'Task title' }).last().fill('Stretch for 10 minutes');
await p.getByRole('button', { name: 'Delete stage 4' }).click();
const del = p.getByRole('alertdialog', { name: /Delete Stage 4/ });
t('deleting a stage with work in it asks first, and says what goes', await del.count() === 1 && /3 milestones and 2 tasks/.test(await del.textContent()));
await del.getByRole('button', { name: 'Delete stage' }).click();
t('the stage is gone', (await dlg.getByRole('textbox', { name: /^Stage \d name$/ }).count()) === 3);

await dlg.getByRole('button', { name: 'Save Changes' }).click();
await dlg.waitFor({ state: 'detached', timeout: 5000 }).catch(() => {});
t('saves and closes', await dlg.count() === 0);
const put = JSON.parse((await lastCall(/^PUT \/api\/goals\/g1 .*"stages"/)).replace(/^PUT \/api\/goals\/g1 /, ''));
t('saved three stages', put.stages.length === 3);
t('the re-worded task keeps its id (so its history), loses its old steps', put.dailyTasks.some(x => x.id === 1000 && x.title === 'Run 4km at an easy pace' && !x.executionSteps && x.difficulty === 'easy'));
t('the moved milestone is in stage 1, kept its id', put.subtasks.filter(m => m.stageId === 's0').length === 4);
t('the finished milestone kept its completion', put.subtasks.find(m => m.id === 5000).completed === true);
t('only new and re-worded steps were rated', (await lastCall(/"rate_plan"/))?.match(/- \S+ \[/g)?.length === 2);
t('completions were not sent (so none can be overwritten)', put.taskCompletions === undefined);
await p.waitForTimeout(600);
t('the re-worded and new tasks then get fresh steps', !!(await lastCall(/taskFields/)));
const g1 = await p.evaluate(() => window.__store.getState().goals.find(g => g.id === 'g1'));
t('the goal page has the new plan', g1.stages.length === 3 && g1.title === 'Run my first marathon!');

// ── Phone ───────────────────────────────────────────────────────────────────
await p.setViewportSize({ width: 390, height: 844 });
await p.getByRole('button', { name: 'Edit goal' }).click();
await dlg.waitFor();
await p.waitForTimeout(400);
const spill = await dlg.evaluate(el => {
  const out = [];
  for (const x of el.querySelectorAll('*')) { const r = x.getBoundingClientRect(); if (r.width && (r.right > window.innerWidth + 1 || r.left < -1)) out.push(x.tagName + '.' + x.className.toString().slice(0, 40)); }
  return out.slice(0, 5);
});
t('phone: nothing spills sideways', spill.length === 0, spill.join(' | '));
await p.screenshot({ path: shot('edit-goal-phone') });

await b.close();
console.log(fails ? `\n${fails} FAILING` : '\nall pass');
process.exit(fails ? 1 : 0);
