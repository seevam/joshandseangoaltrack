// #8 — ticking a task that crosses a boundary plays the celebration, through
// the real UI, for a skill level, a skill rank and the player rank.
import { launch, BASE } from '../browser.mjs';
const b = await launch();
let fails = 0;
const t = (name, ok, extra = '') => { if (!ok) fails++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? '  ' + extra : ''}`); };
const shot = name => new URL(`../.out/${name}.png`, import.meta.url).pathname;

/**
 * Rewrites the fake server's data so Health sits just short of `target` XP
 * (one 20-XP tick away), gives g1's first task a unique title, forgets what
 * was celebrated, and reloads — so the page starts silent, one tick short.
 */
async function primeHealth(p, target) {
  await p.evaluate(target => {
    const key = window.__storeKey;
    const goals = JSON.parse(sessionStorage.getItem(key) || 'null') ?? window.__store.getState().goals;
    const g1 = goals.find(g => g.id === 'g1');
    g1.dailyTasks[0].title = 'Tempo run check';
    const health = () => window.__lib.computeSkills(goals, {}).find(s => s.id === 'health').xp;
    const dayAgo = n => { const d = new Date(Date.now() - n * 864e5); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
    let n = 40;
    // 20 at a time while that leaves a gap, then 5-XP check-ins to land within one tick.
    while (target - health() > 40) { g1.taskCompletions[dayAgo(n++)] = { 1000: true }; }
    while (target - health() > 20) { g1.checkIns.push(dayAgo(n++)); }
    sessionStorage.setItem(key, JSON.stringify(goals));
    for (const k of Object.keys(localStorage)) if (k.startsWith('gq_celebrated')) localStorage.removeItem(k);
  }, target);
  // Not reload(): the URL still says ?reset, which would wipe what was just written.
  await p.goto(`${BASE}#/home`);
  await p.waitForTimeout(1500);
  return p.evaluate(() => window.__lib.computeSkills(window.__store.getState().goals, {}).find(s => s.id === 'health').xp);
}

async function tick(p) {
  const btn = p.getByRole('button', { name: 'Mark Tempo run check complete' }).first();
  // On a phone the missions list starts folded away.
  if (!(await btn.isVisible())) await p.getByRole('button', { name: /Today.s Missions/i }).first().click();
  await btn.click();
}

// ── Skill level ─────────────────────────────────────────────────────────────
{
  const p = await b.newPage({ viewport: { width: 1440, height: 1000 } });
  await p.goto(`${BASE}?reset#/home`);
  await p.waitForTimeout(1500);
  const before = await primeHealth(p, 1000); // Health level 4 → 5 at 1,000
  t('primed one tick short of Health level 5', before >= 980 && before < 1000, String(before));
  t('reload after priming is silent', await p.getByRole('dialog', { name: /level up|rank up/i }).count() === 0);
  await tick(p);
  const dlg = p.getByRole('dialog', { name: /Health Level 5/ });
  await dlg.waitFor({ timeout: 4000 }).catch(() => {});
  t('ticking the task plays "Health Level 5"', await dlg.count() === 1);
  await p.waitForTimeout(700);
  await p.screenshot({ path: shot('rankup-skill-level') });
  await p.waitForTimeout(300);
  await dlg.click();
  await p.waitForTimeout(400);
  t('a tap dismisses it', await dlg.count() === 0);
  await p.reload();  // (URL no longer has ?reset)
  await p.waitForTimeout(1500);
  t('a reload does not replay it', await p.getByRole('dialog', { name: /level up|rank up/i }).count() === 0);
  await p.close();
}

// ── Skill rank ──────────────────────────────────────────────────────────────
{
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  await p.goto(`${BASE}?reset#/home`);
  await p.waitForTimeout(1500);
  const before = await primeHealth(p, 1500); // Apprentice → Journeyman at 1,500
  t('primed one tick short of Journeyman', before >= 1480 && before < 1500, String(before));
  await tick(p);
  const dlg = p.getByRole('dialog', { name: /Health rank up: Apprentice to Journeyman/ });
  await dlg.waitFor({ timeout: 4000 }).catch(() => {});
  t('ticking the task plays the Health rank-up (mobile)', await dlg.count() === 1);
  await p.waitForTimeout(2200);
  const text = await dlg.textContent().catch(() => '');
  t('says which skill and its level', /Health Rank Up/.test(text) && /Health · Level \d+/.test(text), text.replace(/\s+/g, ' ').slice(0, 120));
  await p.screenshot({ path: shot('rankup-skill-rank') });
  // A rank-up and a level-up in one tick is told once, as the rank-up.
  await dlg.click();
  await p.waitForTimeout(500);
  t('the rank-up is not followed by a Health level-up for the same tick',
    await p.getByRole('dialog', { name: /Health Level/ }).count() === 0);
  await p.close();
}

// ── Player rank ─────────────────────────────────────────────────────────────
{
  const p = await b.newPage({ viewport: { width: 1440, height: 1000 } });
  await p.goto(`${BASE}?reset#/home`);
  await p.waitForTimeout(1500);
  // Months of work across every goal lifts the player out of Initiate.
  await p.evaluate(() => {
    const s = window.__store.getState();
    const dayAgo = n => { const d = new Date(Date.now() - n * 864e5); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
    s.setGoals(s.goals.map(g => {
      const taskCompletions = { ...g.taskCompletions };
      for (let n = 1; n <= 200; n++) taskCompletions[dayAgo(n)] = Object.fromEntries(g.dailyTasks.map(x => [x.id, true]));
      return { ...g, taskCompletions, checkIns: Object.keys(taskCompletions) };
    }));
  });
  const dlg = p.getByRole('dialog', { name: /^Rank up: Initiate to / });
  await dlg.waitFor({ timeout: 4000 }).catch(() => {});
  t('the player rank-up plays', await dlg.count() === 1);
  const text = await dlg.textContent().catch(() => '');
  t('labelled as the player, not a skill', /Player Level \d+/.test(text));
  await p.close();
}

await b.close();
console.log(fails ? `\n${fails} FAILING` : '\nall pass');
process.exit(fails ? 1 : 0);
