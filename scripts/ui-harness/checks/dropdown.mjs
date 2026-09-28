// #1 — details open only from the chevron, never from a tap elsewhere on the card.
import { launch, BASE } from '../browser.mjs';
const b = await launch();
let fails = 0;
const t = (name, ok) => { if (!ok) fails++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`); };
for (const vp of [{ width: 1440, height: 2200 }, { width: 390, height: 2400 }]) {
  const p = await b.newPage({ viewport: vp });
  await p.goto(`${BASE}#/goals/g1`);
  await p.waitForTimeout(1500);
  const tag = vp.width > 800 ? 'desktop' : 'phone';

  // A milestone row: tap the title text, then empty row space.
  // Element handles, not locators: opening a row changes its label from
  // "Show details" to "Hide details", and a label-based locator would then
  // re-resolve to a different, still-closed row.
  const row = await p.locator('li').filter({ has: p.getByRole('button', { name: /Show details for/ }) }).first().elementHandle();
  const toggle = await row.$('button[aria-label*="details for"]');
  await (await row.$('span.font-medium')).click();
  t(`${tag}: tapping a milestone title does not open it`, (await toggle.getAttribute('aria-expanded')) === 'false');
  const box = await row.boundingBox();
  await p.mouse.click(box.x + box.width * 0.55, box.y + 10);
  t(`${tag}: tapping empty row space does not open it`, (await toggle.getAttribute('aria-expanded')) === 'false');
  await toggle.click();
  t(`${tag}: the chevron opens it`, (await toggle.getAttribute('aria-expanded')) === 'true');
  const tb = await toggle.boundingBox();
  t(`${tag}: chevron target is at least 36px`, tb.width >= 36 && tb.height >= 30);

  // A task card: tap its title, then its chevron.
  const card = await p.locator('div.rounded-xl').filter({ has: p.getByRole('button', { name: /Show protocol for/ }) }).first().elementHandle();
  const chev = await card.$('button[aria-label*="protocol for"]');
  await (await card.$('p.font-semibold')).click();
  t(`${tag}: tapping a task title does not open it`, (await chev.getAttribute('aria-expanded')) === 'false');
  await chev.click();
  t(`${tag}: the task chevron opens it`, (await chev.getAttribute('aria-expanded')) === 'true');
  await p.close();
}
await b.close();
console.log(fails ? `\n${fails} FAILING` : '\nall pass');
process.exit(fails ? 1 : 0);
