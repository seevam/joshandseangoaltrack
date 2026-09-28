// #7 — overdue reads as red; today comes first; past days show the stage
// that was live then, so a new stage doesn't flood "missed" with its tasks.
import { launch, BASE } from '../browser.mjs';
const b = await launch();
let fails = 0;
const t = (name, ok, extra = '') => { if (!ok) fails++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? '  ' + extra : ''}`); };
const p = await b.newPage({ viewport: { width: 1440, height: 1000 } });
await p.goto(`${BASE}?reset#/calendar`); await p.waitForTimeout(300);
await p.goto(`${BASE}#/calendar`); await p.waitForTimeout(1600);

const row = p.locator('section').filter({ has: p.getByRole('heading', { name: /Overdue/ }) });
const firstRow = row.locator('div.rounded-xl').first();
const rc = await firstRow.evaluate(el => ({ border: getComputedStyle(el).borderTopColor, bg: getComputedStyle(el).backgroundColor, label: el.querySelector('.text-red-400')?.textContent }));
t('overdue rows have a red border and tint', /rgba\(239, 68, 68/.test(rc.border) && /rgba\(239, 68, 68/.test(rc.bg), JSON.stringify(rc));
t('each says when it was missed, in red', /^Missed \w+ \d+/.test(rc.label ?? ''), rc.label);
const pill = await row.getByText(/\d+ missed/).textContent();
t('header shows the true total', /^\d+ missed$/.test(pill), pill);

const order = await p.evaluate(() => {
  const secs = [...document.querySelectorAll('section')].map(s => s.querySelector('h2')?.textContent ?? '');
  return { today: secs.findIndex(x => /TODAY|Today/.test(x) || /September|October/.test(x)), overdue: secs.findIndex(x => /Overdue/i.test(x)) };
});
t("today's section comes before overdue", order.today > -1 && order.today < order.overdue, JSON.stringify(order));

const y = new Date(); y.setDate(y.getDate() - 1);
const yLabel = y.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
const cell = p.getByRole('button', { name: yLabel });
if (await cell.count()) {
  const chip = await cell.locator('span.rounded-md').first().evaluate(el => getComputedStyle(el).borderTopColor);
  t('a past day with work left is red in the grid', /rgba\(239, 68, 68/.test(chip), chip);
}
const flag = p.locator('[aria-label$="due"]').first();
if (await flag.count()) t('milestone chip is not truncated', await flag.evaluate(el => el.scrollWidth <= el.clientWidth + 1));

// Open stage 2 of the marathon, then look back at yesterday.
await p.goto(`${BASE}#/goals/g1`); await p.waitForTimeout(1400);
for (const title of ['continuous 6km', '30km total']) {
  await p.locator('li').filter({ hasText: title }).getByRole('button', { name: /^Mark .* complete$/ }).dispatchEvent('click');
  await p.waitForTimeout(350);
}
await p.goto(`${BASE}#/calendar`); await p.waitForTimeout(1500);
if (await cell.count()) await cell.click();
await p.waitForTimeout(300);
const dayText = await p.locator('section').first().textContent();
t("yesterday still shows stage 1's tasks", dayText.includes('Run 3km') && !/Run 5km at an easy conversational pace\s*(Missed \w+ \d+ · )?Run my first marathon/.test(dayText));
const missedText = await row.textContent();
t("stage 2's tasks are not listed as missed", !/Run [56]km at an easy conversational paceMissed \w+ \d+ · Run my first marathon/.test(missedText));
await b.close();
console.log(fails ? `\n${fails} FAILING` : '\nall pass');
process.exit(fails ? 1 : 0);
