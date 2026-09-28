// Layout scan: text visibly escaping its bordered box, and pages that scroll
// sideways — every route, four widths, every collapsible opened. Only what is
// actually visible counts, so intentional truncation is not reported.
import { launch, BASE } from './browser.mjs';
const routes = ['/home', '/goals', '/goals/g1', '/progress', '/calendar', '/profile'];
const views = [[1440, 900, 'desktop'], [1024, 800, 'laptop'], [390, 844, 'phone'], [360, 740, 'small-phone']];
const b = await launch();
const errors = [];
let issues = 0;
for (const q of ['', '?empty']) for (const [w, h, n] of views) for (const r of routes) {
  if (q && r === '/goals/g1') continue;
  const p = await b.newPage({ viewport: { width: w, height: h } });
  p.on('pageerror', e => errors.push(`${n} ${q}${r}: ${e.message}`));
  await p.goto(`${BASE}${q}#${r}`);
  await p.waitForTimeout(1600);
  await p.evaluate(() => document.querySelectorAll('button[aria-expanded="false"]').forEach(b => { if (!b.closest('nav')) b.click(); }));
  await p.waitForTimeout(500);
  const found = await p.evaluate(() => {
    const out = [];
    if (document.documentElement.scrollWidth > innerWidth + 1) out.push(`PAGE scrolls sideways: ${document.documentElement.scrollWidth} > ${innerWidth}`);
    const boxed = el => { for (let a = el.parentElement; a; a = a.parentElement) { const cs = getComputedStyle(a); if (parseFloat(cs.borderLeftWidth) > 0 || cs.overflow !== 'visible' || a.tagName === 'BUTTON') return a; } return null; };
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const seen = new Set();
    while (walker.nextNode()) {
      const t = walker.currentNode; const el = t.parentElement;
      if (!t.textContent.trim() || !el || seen.has(el) || el.closest('.sr-only')) continue; seen.add(el);
      const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || cs.display === 'none') continue;
      const range = document.createRange(); range.selectNodeContents(t);
      const rc = range.getBoundingClientRect(); if (!rc.width) continue;
      let v = { l: rc.left, r: rc.right, t: rc.top, b: rc.bottom };
      for (let a = el; a && a !== document.body; a = a.parentElement) {
        const acs = getComputedStyle(a);
        if (acs.overflow !== 'visible' || acs.overflowX !== 'visible') { const q = a.getBoundingClientRect(); v = { l: Math.max(v.l, q.left), r: Math.min(v.r, q.right), t: Math.max(v.t, q.top), b: Math.min(v.b, q.bottom) }; }
      }
      if (v.r <= v.l) continue;
      const box = boxed(el); if (!box) continue;
      const bs = getComputedStyle(box); if (bs.overflow !== 'visible') continue;
      const br = box.getBoundingClientRect();
      const over = Math.max(br.left - v.l, v.r - br.right, br.top - v.t, v.b - br.bottom);
      if (over > 2) out.push(`SPILL ${over.toFixed(0)}px "${t.textContent.trim().slice(0, 50)}"`);
    }
    return [...new Set(out)];
  });
  if (found.length) { issues += found.length; console.log(`== ${n} ${q}${r}\n  ` + found.slice(0, 10).join('\n  ')); }
  await p.close();
}
await b.close();
console.log(errors.length ? `\nPAGE ERRORS:\n${errors.join('\n')}` : '\nno page errors');
console.log(issues ? `${issues} layout issue(s)` : 'no layout issues');
process.exit(issues || errors.length ? 1 : 0);
