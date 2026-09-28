// #4 / #7 — delete really deletes, confirms in a centred pop-up, and the app
// holds up once the last goal is gone.
import { launch, BASE } from '../browser.mjs';
const b = await launch();
let fails = 0;
const t = (name, ok, extra = '') => { if (!ok) fails++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? '  ' + extra : ''}`); };
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
const errors = []; p.on('pageerror', e => errors.push(e.message));

// In the harness a hash change reloads the page, like a navigation. Keep the
// in-memory "server" across it by deleting through one page session.
await p.goto(`${BASE}?reset#/goals/g1`);
await p.waitForTimeout(400);
await p.goto(`${BASE}#/goals/g1`);
await p.waitForTimeout(1400);

await p.locator('header').getByRole('button', { name: 'Delete goal' }).click();
const dlg = p.getByRole('alertdialog');
await dlg.waitFor();
const box = await dlg.boundingBox();
t('header trash opens a pop-up, centred in view', box && box.y > 100 && box.y + box.height < 800 && Math.abs(box.x + box.width / 2 - 720) < 30, JSON.stringify(box));
t('the pop-up names the goal', (await dlg.textContent()).includes('Run my first marathon'));
await p.evaluate(() => { window.__calls = []; sessionStorage.setItem('harness_calls', '[]'); });
await dlg.getByRole('button', { name: 'Delete goal' }).click();
await p.waitForTimeout(800);
const calls = await p.evaluate(() => window.__calls);
t('a DELETE request was sent for that goal', calls.some(c => c.startsWith('DELETE /api/goals/g1')), JSON.stringify(calls));
t('navigated to the goals list', p.url().endsWith('#/goals'));
await p.waitForTimeout(1200);
t('the deleted goal is not listed', !(await p.locator('body').textContent()).includes('Run my first marathon'));

// Keyboard: Escape cancels, Enter on the focused "Keep it" keeps.
await p.goto(`${BASE}#/goals/g2`); await p.waitForTimeout(1400);
await p.locator('header').getByRole('button', { name: 'Delete goal' }).click();
await p.getByRole('alertdialog').waitFor();
await p.waitForTimeout(150);
await p.keyboard.press('Enter'); await p.waitForTimeout(300);
t('Enter keeps the goal (focus starts on Keep it)', p.url().endsWith('#/goals/g2') && !(await p.getByRole('alertdialog').isVisible()));

// Delete the rest, then every page with no goals at all.
for (const id of ['g2', 'g3']) {
  await p.goto(`${BASE}#/goals/${id}`); await p.waitForTimeout(1300);
  await p.locator('header').getByRole('button', { name: 'Delete goal' }).click();
  await p.getByRole('alertdialog').getByRole('button', { name: 'Delete goal' }).click();
  await p.waitForTimeout(1300);
}
for (const [route, expect] of [['/goals', /no goals|create your first|start/i], ['/home', /create a goal|no campaign|board clear/i], ['/calendar', /nothing scheduled/i], ['/progress', /loadout/i]]) {
  await p.goto(`${BASE}#${route}`); await p.waitForTimeout(1500);
  const body = await p.locator('main').textContent();
  t(`empty state renders on ${route}`, expect.test(body), body.replace(/\s+/g, ' ').slice(0, 90));
}
await p.screenshot({ path: new URL('../.out/empty-home.png', import.meta.url).pathname });

await b.close();
console.log(errors.length ? `page errors: ${errors.join(' | ')}` : 'no page errors');
console.log(fails ? `\n${fails} FAILING` : '\nall pass');
process.exit(fails || errors.length ? 1 : 0);
