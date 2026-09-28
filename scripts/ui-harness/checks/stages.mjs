// #2 — only the current stage's milestones and tasks show; finishing a stage swaps them.
import { launch, BASE } from '../browser.mjs';
const b = await launch();
let fails = 0;
const t = (name, ok, extra = '') => { if (!ok) fails++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? '  ' + extra : ''}`); };
const p = await b.newPage({ viewport: { width: 1440, height: 2600 } });
await p.goto(`${BASE}#/goals/g1`);
await p.waitForTimeout(1500);

const read = () => p.evaluate(() => ({
  milestones: [...document.querySelectorAll('li')].filter(li => li.querySelector('[aria-label*="details for"]')).map(li => li.querySelector('span.font-medium')?.textContent),
  tasks: [...document.querySelectorAll('[aria-label^="Show protocol for"]')].map(b => b.getAttribute('aria-label').replace('Show protocol for ', '')),
  now: document.querySelector('[aria-current="step"] p')?.textContent,
  stageButtons: [...document.querySelectorAll('ol button')].length,
}));

let r = await read();
t('stage 1 is current', r.now === 'Base Endurance Building', r.now);
t('three milestones, all from stage 1', r.milestones.length === 3 && r.milestones[0].includes('5km'), JSON.stringify(r.milestones));
t('stage 1 tasks only', JSON.stringify(r.tasks) === JSON.stringify(['Run 3km at an easy conversational pace', 'Run 4km at an easy conversational pace']));
t('stage cards expose nothing to open', r.stageButtons === 0);
const text = await p.evaluate(() => document.body.innerText);
t('no stage-2 milestone appears anywhere on the page', !text.includes('continuous 8km') && !text.includes('45km total'));

// Finish stage 1: tick its two open milestones from the list.
for (const title of ['continuous 6km', '30km total']) {
  await p.locator('li').filter({ hasText: title }).getByRole('button', { name: /^Mark .* complete$/ }).dispatchEvent('click');
  await p.waitForTimeout(400);
}
await p.waitForTimeout(600);
r = await read();
t('stage 2 is now current', r.now === 'Increasing Weekly Volume', r.now);
t('list swapped to stage 2 milestones', r.milestones.length === 3 && r.milestones[0].includes('8km'), JSON.stringify(r.milestones));
t('stage 1 milestones gone', !r.milestones.some(m => ['Complete a continuous 5km run', 'Complete a continuous 6km run', 'Reach 30km total in a week'].includes(m)));
t('tasks swapped to stage 2', JSON.stringify(r.tasks) === JSON.stringify(['Run 5km at an easy conversational pace', 'Run 6km at an easy conversational pace']), JSON.stringify(r.tasks));
await p.screenshot({ path: new URL('../.out/stages.png', import.meta.url).pathname, clip: { x: 240, y: 0, width: 1200, height: 1500 } });
await b.close();
console.log(fails ? `\n${fails} FAILING` : '\nall pass');
process.exit(fails ? 1 : 0);
