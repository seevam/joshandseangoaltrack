// Every full-screen overlay covers the whole viewport — no page showing above
// it — wherever it was opened from, desktop and phone.
import { launch, BASE } from '../browser.mjs';
const b = await launch();
let fails = 0;
const t = (name, ok, extra = '') => { if (!ok) fails++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? '  ' + extra : ''}`); };
const measure = (p, sel) => p.evaluate(s => {
  const el = document.querySelector(s); if (!el) return null;
  const r = el.getBoundingClientRect();
  return { top: Math.round(r.top), bottom: Math.round(r.bottom), vh: innerHeight, parent: el.parentElement === document.body };
}, sel);
for (const [w, h, tag] of [[1440, 900, 'desktop'], [390, 844, 'phone']]) {
  const cases = [
    ['Focus Mode (milestone)', '#/goals/g1', async p => p.locator('li').filter({ hasText: 'continuous 6km' }).getByRole('button', { name: /^Start / }).click(), '[aria-label="Focus Mode"]'],
    ['delete dialog', '#/goals/g1', async p => p.locator('header').getByRole('button', { name: 'Delete goal' }).click(), '[role="alertdialog"]'],
    ['task delete dialog', '#/goals/g1', async p => p.getByRole('button', { name: /^Remove / }).first().click(), '[role="alertdialog"]'],
    ['edit form', '#/goals/g1', async p => p.getByRole('button', { name: 'Edit goal' }).click(), '.fixed.inset-0'],
  ];
  for (const [name, route, open, sel] of cases) {
    const p = await b.newPage({ viewport: { width: w, height: h } });
    await p.goto(`${BASE}${route}`);
    await p.waitForTimeout(1400);
    await open(p);
    await p.waitForTimeout(900);
    const m = await measure(p, sel);
    // For dialogs the measured node is the panel; check its full-screen wrapper.
    const wrap = await p.evaluate(s => {
      let el = document.querySelector(s); while (el && !(getComputedStyle(el).position === 'fixed' && el.getBoundingClientRect().height >= innerHeight - 1)) el = el.parentElement;
      if (!el) return null; const r = el.getBoundingClientRect();
      return { top: Math.round(r.top), height: Math.round(r.height), vh: innerHeight, underBody: el.parentElement === document.body || el.parentElement?.parentElement === document.body };
    }, sel);
    t(`${tag}: ${name} covers the viewport from the top`, !!wrap && wrap.top === 0 && wrap.height >= wrap.vh, JSON.stringify(wrap ?? m));
    await p.close();
  }
}
await b.close();
console.log(fails ? `\n${fails} FAILING` : '\nall pass');
process.exit(fails ? 1 : 0);
