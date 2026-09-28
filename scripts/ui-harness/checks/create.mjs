// #10 / #11 — Quick Create and "Build Tailored Plan" build a plan, every
// failure says what went wrong, and the chat fills its column.
import { launch, BASE } from '../browser.mjs';
const b = await launch();
let fails = 0;
const t = (name, ok, extra = '') => { if (!ok) fails++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? '  ' + extra : ''}`); };
const shot = name => new URL(`../.out/${name}.png`, import.meta.url).pathname;

async function open(p, width = 1440, mode = /QUICK CREATE/) {
  await p.setViewportSize({ width, height: width < 600 ? 844 : 1000 });
  await p.goto(`${BASE}?reset#/home`);
  await p.waitForTimeout(1200);
  await p.evaluate(() => { window.__calls = []; window.__store.getState().setShowCreateGoal(true); });
  await p.getByRole('button', { name: mode }).click();
}
const goalCount = p => p.evaluate(() => window.__store.getState().goals.length);
const errorDialog = p => p.getByRole('alertdialog');
/** The dialog is really in front: the element at its centre belongs to it. */
const onTop = loc => loc.evaluate(el => {
  const r = el.getBoundingClientRect();
  return el.contains(document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2));
});

const p = await b.newPage();

// ── Quick Create ────────────────────────────────────────────────────────────
await open(p);
const before = await goalCount(p);
await p.getByPlaceholder(/Read 24 books/).fill('Run my first marathon');
await p.getByRole('button', { name: /Generate AI Plan/ }).click();
await p.waitForFunction(n => window.__store.getState().goals.length > n, before, { timeout: 5000 }).catch(() => {});
t('Quick Create saves a goal and closes', (await goalCount(p)) === before + 1 && (await p.getByRole('button', { name: /Generate AI Plan/ }).count()) === 0);
let calls = await p.evaluate(() => window.__calls);
const planReq = JSON.parse(calls.find(c => c.startsWith('AI ') && c.includes('"create_goal"')).slice(3));
t('asks for room for a whole plan', planReq.max_tokens >= 6000, String(planReq.max_tokens));
const posted = JSON.parse(calls.find(c => c.startsWith('POST /api/goals')).replace(/^POST \/api\/goals /, ''));
t('the plan has stages, milestones and per-stage tasks', posted.stages.length === 3 && posted.subtasks.length === 9 && posted.dailyTasks.length === 6);
// Protocols follow a moment later, for the live stage only.
await p.waitForFunction(() => window.__calls.some(c => c.includes('taskFields')), null, { timeout: 5000 }).catch(() => {});
calls = await p.evaluate(() => window.__calls);
const fill = calls.find(c => c.includes('"task_protocols"'));
t('protocols are written straight after, for the live stage', !!fill && (fill.match(/- id \d+:/g) || []).length === 2);
const g = await p.evaluate(() => window.__store.getState().goals[0]);
t('and saved onto those tasks', g.dailyTasks.slice(0, 2).every(x => x.executionSteps?.length === 3) && !g.dailyTasks[2].executionSteps);
await p.reload();
await p.waitForTimeout(1500);
t('no second fill once they exist', (await p.evaluate(() => window.__calls)).filter(c => c.includes('"task_protocols"')).length === 1);

// Failures: each says what went wrong, in front of the modal, and Retry works.
for (const [mode, text] of [['truncate', /too long to finish/], ['timeout', /took too long/]]) {
  await open(p);
  await p.evaluate(m => { window.__aiMode = m; }, mode);
  await p.getByPlaceholder(/Read 24 books/).fill('Run my first marathon');
  await p.getByRole('button', { name: /Generate AI Plan/ }).click();
  const dlg = errorDialog(p);
  await dlg.waitFor({ timeout: 4000 }).catch(() => {});
  const msg = await dlg.textContent().catch(() => '');
  t(`${mode}: explains itself`, text.test(msg), msg.replace(/\s+/g, ' ').slice(0, 90));
  t(`${mode}: the error is in front of the modal`, (await dlg.count()) === 1 && await onTop(dlg));
  if (mode === 'truncate') await p.screenshot({ path: shot('create-error') });
  const n = await goalCount(p);
  await p.evaluate(() => { window.__aiMode = undefined; });
  await dlg.getByRole('button', { name: /Try again|Retry/ }).click();
  await p.waitForFunction(n => window.__store.getState().goals.length > n, n, { timeout: 5000 }).catch(() => {});
  t(`${mode}: Retry builds it`, (await goalCount(p)) === n + 1);
}

// ── Detailed consultation ───────────────────────────────────────────────────
await open(p, 1440, /DETAILED CONSULTATION/);
const build = p.getByRole('button', { name: /Build Tailored Plan/ });
t('build waits for a named goal', await build.isDisabled() && (await p.getByText(/Name your goal to build a plan/).count()) === 1);
await p.getByRole('textbox', { name: /Reply to/ }).fill('Run my first marathon');
await p.getByRole('button', { name: 'Send' }).click();
await p.getByText(/run 30 minutes without walking/).waitFor({ timeout: 4000 });
await p.waitForTimeout(400);

// Layout: the conversation runs to the bottom of the journey map.
const box = await p.evaluate(() => {
  const chat = document.querySelector('.thin-scroll.space-y-3');
  const aside = document.querySelector('[role=dialog] aside');
  const col = chat.parentElement;
  const last = col.lastElementChild.getBoundingClientRect().bottom;
  return { chatH: chat.getBoundingClientRect().height, gap: Math.round(aside.getBoundingClientRect().bottom - last) };
});
t('no empty band under the chat (desktop)', box.gap <= 4, JSON.stringify(box));
// It uses the height of the screen, without making the modal scroll.
const fit = async () => p.evaluate(() => {
  const d = document.querySelector('[role=dialog]');
  return { chat: Math.round(document.querySelector('.thin-scroll.space-y-3').getBoundingClientRect().height), scrolls: d.scrollHeight > d.clientHeight + 1 };
});
const tall = await fit();
t('tall screen: the chat grows into it, modal does not scroll', tall.chat >= 500 && !tall.scrolls, JSON.stringify(tall));
await p.setViewportSize({ width: 1366, height: 768 });
await p.waitForTimeout(200);
const short = await fit();
t('short laptop: chat stays usable, modal does not scroll', short.chat >= 280 && !short.scrolls, JSON.stringify(short));
await p.setViewportSize({ width: 1440, height: 1000 });
await p.waitForTimeout(200);
await p.screenshot({ path: shot('create-detailed') });

const n1 = await goalCount(p);
t('build is available right after naming the goal', !(await build.isDisabled()));
await p.evaluate(() => { window.__calls = []; });
await build.click();
await p.waitForFunction(n => window.__store.getState().goals.length > n, n1, { timeout: 5000 }).catch(() => {});
t('Build Tailored Plan builds it', (await goalCount(p)) === n1 + 1);
const forced = JSON.parse((await p.evaluate(() => window.__calls)).find(c => c.includes('"create_goal"')).slice(3));
const last = forced.messages[forced.messages.length - 1].content;
t('it builds from what was said, with defaults for the rest', forced.messages.some(m => m.content === 'Run my first marathon') && /sensible defaults/.test(last));
t('and keeps the chapters the user was shown', /Base Building \/ Building Distance \/ Race Ready/.test(last));

// The coach's reply fails — the goal was still named, so building still works.
await open(p, 1440, /DETAILED CONSULTATION/);
await p.evaluate(() => { const ai = window.__ai; window.__ai = r => { window.__ai = ai; return { __status: 500 }; }; });
await p.getByRole('textbox', { name: /Reply to/ }).fill('Read 24 books this year');
await p.getByRole('button', { name: 'Send' }).click();
await errorDialog(p).waitFor({ timeout: 4000 });
await errorDialog(p).getByRole('button', { name: /Close|OK|Dismiss/ }).first().click();
const n2 = await goalCount(p);
await build.click();
await p.waitForFunction(n => window.__store.getState().goals.length > n, n2, { timeout: 5000 }).catch(() => {});
t('builds even when the coach never replied', (await goalCount(p)) === n2 + 1);

// ── The floating coach can build a goal too ────────────────────────────────
await p.goto(`${BASE}?reset#/home`);
await p.waitForTimeout(1200);
await p.evaluate(() => window.__store.getState().setIsChatOpen(true));
const coachIn = p.locator('#ai-chat-input');
const n3 = await goalCount(p);
await p.evaluate(() => { window.__aiMode = 'truncate'; });
await coachIn.fill('Run my first marathon, build it');
await coachIn.press('Enter');
await p.getByText(/too long to finish/).waitFor({ timeout: 4000 }).catch(() => {});
t('coach: a cut-off plan says so, and claims nothing was made', (await p.getByText(/too long to finish/).count()) === 1 && (await p.getByText(/Done! Created/).count()) === 0);
await p.evaluate(() => { window.__aiMode = undefined; });
await coachIn.fill('Run my first marathon, build it');
await coachIn.press('Enter');
await p.getByText(/Done! Created your goal/).waitFor({ timeout: 4000 }).catch(() => {});
t('coach: builds and saves the goal', (await goalCount(p)) === n3 + 1 && (await p.getByText(/Done! Created your goal/).count()) === 1);

// Phone: the chat is a real working area, not a sliver.
await open(p, 390, /DETAILED CONSULTATION/);
const h = await p.evaluate(() => document.querySelector('.thin-scroll.space-y-3').getBoundingClientRect().height);
t('phone: chat is at least 16rem tall', h >= 256, String(Math.round(h)));
const sideways = await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
t('phone: nothing scrolls sideways', !sideways);
await p.screenshot({ path: shot('create-detailed-phone') });

await b.close();
console.log(fails ? `\n${fails} FAILING` : '\nall pass');
process.exit(fails ? 1 : 0);
