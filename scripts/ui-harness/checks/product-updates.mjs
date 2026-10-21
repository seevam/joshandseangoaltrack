// Product-update round: tutorial tour, coach button, Next Action colour,
// calendar sync on Today's Schedule, auto check-in, overdue milestones,
// health out of 100, no accountability partners, skill → coach.
import { launch, BASE } from '../browser.mjs';
const b = await launch();
let fails = 0;
const t = (name, ok, extra = '') => { if (!ok) fails++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? '  ' + extra : ''}`); };
const shots = process.env.SHOTS;
const p = await b.newPage({ viewport: { width: 1440, height: 1000 } });

// ── Dashboard ───────────────────────────────────────────────────────────────
await p.goto(`${BASE}?gcal&reset#/home`); await p.waitForTimeout(300);
await p.goto(`${BASE}?gcal#/home`); await p.waitForTimeout(1500);

const coach = p.locator('aside [data-tour="coach"]');
const coachStyle = await coach.evaluate(el => ({ border: getComputedStyle(el).borderTopWidth, color: getComputedStyle(el).color }));
t('sidebar AI Coach is not highlighted', coachStyle.border === '0px', JSON.stringify(coachStyle));

const glow = await p.locator('[data-tour="next-action"]').evaluate(el => getComputedStyle(el).getPropertyValue('--glow').trim());
t('Next Action glows green, not blue', !/38BDF8/i.test(glow), glow);

const sched = await p.locator('[data-tour="schedule"]').textContent();
t("Today's Schedule lists calendar events by name", sched.includes('Football practice') && sched.includes('School'));
t('suggested slots say why they sit there', /before Football practice|after School/.test(sched));
t('the coach can plan the day', await p.getByRole('button', { name: 'Plan my day with AI' }).count() === 1);
if (shots) await p.locator('[data-tour="schedule"]').screenshot({ path: `${shots}/schedule.png` });

await p.getByRole('button', { name: 'Tutorial' }).first().click();
await p.waitForTimeout(500);
const card = p.getByRole('dialog');
t('Tutorial opens a guided tour', /Tutorial · 1 of \d+/.test(await card.textContent()));
if (shots) await p.screenshot({ path: `${shots}/tour-1.png` });
await card.getByRole('button', { name: 'Next' }).click(); await p.waitForTimeout(500);
t('Next moves to the second stop', (await card.textContent()).includes('Next Action'));
// Clicks outside the lit stop are absorbed.
const before = p.url();
await p.mouse.click(5, 990); await p.waitForTimeout(200);
t('the page under the tour is not clickable', p.url() === before);
if (shots) await p.screenshot({ path: `${shots}/tour-2.png` });
await p.keyboard.press('Escape'); await p.waitForTimeout(200);
t('Escape ends the tour', await p.getByRole('dialog').count() === 0);

// Tick every task of the marathon goal due today → checked in automatically.
await p.goto(`${BASE}#/goals/g1`); await p.waitForTimeout(1400);
t('goal page has no manual "Check in today" while tasks are due', await p.getByRole('button', { name: 'Check in today' }).count() === 0);
t('accountability partners are gone', !(await p.textContent('body')).includes('Accountability'));
// The recurring tasks' ticks are labelled with the task title ("Run 3km…").
const ticks = p.getByRole('button', { name: /^Mark Run .* complete$/ });
const n = await ticks.count();
for (let i = 0; i < n; i++) { await ticks.first().dispatchEvent('click'); await p.waitForTimeout(400); }
const body = await p.textContent('body');
t('finishing today\u2019s tasks checks in automatically', n > 0 && body.includes('Checked in today'), `${n} ticked`);
const puts = await p.evaluate(() => window.__calls.filter(c => c.includes('"checkIn"')).length);
t('…and the check-in is saved', puts === 1, `${puts} check-in writes`);
if (shots) await p.screenshot({ path: `${shots}/goal.png`, fullPage: false });

// ── Goals list: health as X/100 ─────────────────────────────────────────────
await p.goto(`${BASE}#/goals`); await p.waitForTimeout(1200);
t('goal cards show health out of 100', /\d+\/100/.test(await p.textContent('body')));

// ── Calendar: overdue is milestones only ────────────────────────────────────
await p.goto(`${BASE}#/calendar`); await p.waitForTimeout(1400);
const cal = await p.textContent('body');
t('overdue section is about milestones', !cal.includes('missed') || cal.includes('Overdue milestones'));
t('no recurring task is listed as missed', !/Missed \w+ \d+ ·/.test(cal));
if (shots) await p.screenshot({ path: `${shots}/calendar.png` });

// ── Progression: level on skills; a weak skill opens the coach ──────────────
await p.goto(`${BASE}#/progress`); await p.waitForTimeout(1400);
t('skill cards show their level', /Lv\. \d+ · \d+%/.test(await p.textContent('body')));
const worth = p.getByText('Worth starting next');
if (await worth.count()) {
  await p.locator('button').filter({ hasText: /·/ }).filter({ has: p.locator('svg') }).last().click().catch(() => {});
  await p.waitForTimeout(800);
  const calls = await p.evaluate(() => window.__calls.filter(c => c.startsWith('AI')).length);
  t('tapping a skill asks the coach for goal ideas', calls > 0);
}
if (shots) await p.screenshot({ path: `${shots}/progress.png` });

await b.close();
console.log(fails ? `\n${fails} FAILING` : '\nall pass');
process.exit(fails ? 1 : 0);
