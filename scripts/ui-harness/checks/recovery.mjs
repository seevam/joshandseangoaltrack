// Fix list #1 — Recovery Mode changes the goal: one click, no typing; the
// plan, timeline and health visibly change; a typed explanation reaches the
// coach and its tailored changes are saved; Undo puts everything back.
import { launch, BASE } from '../browser.mjs';
const b = await launch();
let fails = 0;
const t = (name, ok, extra = '') => { if (!ok) fails++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? '  ' + extra : ''}`); };
const shots = process.env.SHOTS;
const p = await b.newPage({ viewport: { width: 1440, height: 1000 } });
const goal = () => p.evaluate(() => window.__store.getState().goals.find(g => g.id === 'g3'));
const health = () => p.locator('text=Goal Health').locator('xpath=ancestor::div[contains(@class,"rounded-xl")][1]').textContent();

// g3 started 20 days ago with milestones every 7 days and nothing done.
await p.goto(`${BASE}?reset#/goals/g3`); await p.waitForTimeout(300);
await p.goto(`${BASE}#/goals/g3`); await p.waitForTimeout(1500);
const before = await goal();
const healthBefore = Number((await health()).match(/(\d+)\/100/)?.[1]);

await p.getByRole('button', { name: 'Recover now' }).click();
const dlg = p.getByRole('dialog', { name: 'Plan rebuilt' });
await dlg.waitFor({ timeout: 4000 }).catch(() => {});
t('one click recovers, no typing needed', await dlg.count() === 1);
const text = (await dlg.textContent()) ?? '';
t('the result lists what changed', /overdue milestone/.test(text) && /lightened/.test(text), text.slice(0, 200));
if (shots) await p.screenshot({ path: `${shots}/recovery-result.png` });

const after = await goal();
const dates = g => g.subtasks.filter(m => !m.completed).map(m => m.daysFromStart).join(',');
t('milestones were re-dated and saved', dates(after) !== dates(before), `${dates(before)} → ${dates(after)}`);
t('a missed task was lightened and saved', after.dailyTasks[0].estimatedMinutes < before.dailyTasks[0].estimatedMinutes,
  `${before.dailyTasks[0].estimatedMinutes} → ${after.dailyTasks[0].estimatedMinutes}`);
t('recovery timestamp saved', !!after.recovery?.at);
const put = await p.evaluate(() => window.__calls.filter(c => c.startsWith('PUT /api/goals/g3') && c.includes('"recovery"')).length);
t('one PUT carried the new plan to the server', put === 1, String(put));

await dlg.getByRole('button', { name: 'Got it' }).click(); await p.waitForTimeout(300);
const healthAfter = Number((await health()).match(/(\d+)\/100/)?.[1]);
t('goal health updates on the page', healthAfter > healthBefore, `${healthBefore} → ${healthAfter}`);

// Undo restores the previous plan.
await p.getByRole('button', { name: 'Recover now' }).click();
await dlg.waitFor({ timeout: 4000 }).catch(() => {});
await dlg.getByRole('button', { name: 'Undo' }).click(); await p.waitForTimeout(500);
const undone = await goal();
t('Undo puts the previous recovery state back', undone.recovery?.at === after.recovery?.at && dates(undone) === dates(after));

// With an explanation: the coach's tailoring is applied to the goal.
await p.goto(`${BASE}?reset#/goals/g3`); await p.waitForTimeout(300);
await p.goto(`${BASE}#/goals/g3`); await p.waitForTimeout(1500);
const taskId = (await goal()).dailyTasks.find(x => x.stageId === 's0').id;
await p.evaluate(id => {
  window.__ai = req => {
    window.__lastRecoveryPrompt = JSON.stringify(req.messages);
    return { choices: [{ message: { tool_calls: [{ function: { name: 'apply_recovery', arguments: JSON.stringify({
      summary: 'Exams this month, so sessions are short and on weekends.',
      tasks: [{ id, title: 'Spend 15 minutes on the business plan', daysOfWeek: [0, 6], estimatedMinutes: 15 }],
    }) } }] } }] };
  };
}, taskId);
await p.getByRole('button', { name: 'Tell the coach what happened' }).click();
await p.getByRole('dialog', { name: 'Recovery Mode' }).locator('textarea').fill('I have exams all month');
await p.getByRole('dialog', { name: 'Recovery Mode' }).getByRole('button', { name: 'Recover now' }).click();
await dlg.waitFor({ timeout: 4000 }).catch(() => {});
const prompt = await p.evaluate(() => window.__lastRecoveryPrompt || '');
t('the explanation reaches the coach', prompt.includes('I have exams all month'));
const tailored = (await goal()).dailyTasks.find(x => x.id === taskId);
t('the tailored change is saved to the goal',
  tailored.title === 'Spend 15 minutes on the business plan' && JSON.stringify(tailored.daysOfWeek) === '[0,6]', JSON.stringify(tailored));
t('the coach’s summary is shown', ((await dlg.textContent()) ?? '').includes('Exams this month'));
if (shots) await p.screenshot({ path: `${shots}/recovery-tailored.png` });

await b.close();
console.log(fails ? `\n${fails} FAILING` : '\nall pass');
process.exit(fails ? 1 : 0);
