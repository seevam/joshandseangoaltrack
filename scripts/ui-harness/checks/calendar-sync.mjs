// Fix list #3 — Google Calendar failure paths are visible and recoverable:
// a 403 says why instead of silently resetting the button; a returning user
// whose token lapsed gets one-click Reconnect; the connected path still works.
import { launch, BASE } from '../browser.mjs';
const b = await launch();
let fails = 0;
const t = (name, ok, extra = '') => { if (!ok) fails++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? '  ' + extra : ''}`); };
const p = await b.newPage({ viewport: { width: 1440, height: 1000 } });
const bar = () => p.locator('[data-tour="calendar"]').textContent();

await p.goto(`${BASE}?gcal&reset#/home`); await p.waitForTimeout(300);
await p.goto(`${BASE}?gcal#/home`); await p.waitForTimeout(1500);
t('connected: today’s events are listed', /Football practice/.test(await bar()));

await p.goto(`${BASE}?gcal&gcal403&reset#/home`); await p.waitForTimeout(300);
await p.goto(`${BASE}?gcal&gcal403#/home`); await p.waitForTimeout(1500);
const text = await bar();
t('a 403 explains the cause instead of silently resetting', /Google Calendar API isn.t enabled/.test(text), text.slice(0, 160));

// A returning user (connected before) whose token is gone: Reconnect, not the pitch.
await p.goto(`${BASE}?reset#/home`); await p.waitForTimeout(300);
await p.evaluate(() => localStorage.setItem('gq_gcal_connected_before', '1'));
await p.goto(`${BASE}#/home`); await p.waitForTimeout(1500);
t('returning user gets one-click Reconnect', await p.getByRole('button', { name: 'Reconnect' }).count() === 1, (await bar()).slice(0, 120));
await p.evaluate(() => localStorage.removeItem('gq_gcal_connected_before'));

await b.close();
console.log(fails ? `\n${fails} FAILING` : '\nall pass');
process.exit(fails ? 1 : 0);
