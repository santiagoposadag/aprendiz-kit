#!/usr/bin/env node
// Checks a built certification report by behaviour, the way a reader would use it.
//
//   node check-report.mjs <report.html | index.html>
//
// Needs `playwright` or `@playwright/test` (with Chromium installed), resolvable from the
// current directory or from $REPORT_DEPS_DIR.
//
// Why it exists: the first report this generator descends from was published with a viewer
// that opened the wrong image on every click. Thumbnail indexes counted the defects first; the
// viewer list counted the journeys first. Every page looked right and every screenshot was on
// disk — only clicking showed it. So this clicks every thumbnail and compares the opened image
// with the clicked one, then walks the viewer forward and checks it follows page order.
// It also checks that every image loads, the verdict filters show what they count, the page
// does not scroll sideways at phone width, and the dark theme actually applies.
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const page = process.argv[2];
if (!page) {
  console.error('usage: node check-report.mjs <report.html>');
  process.exit(1);
}

let chromium = null;
for (const base of [process.cwd(), process.env.REPORT_DEPS_DIR].filter(Boolean)) {
  const req = createRequire(path.join(path.resolve(base), 'noop.js'));
  for (const mod of ['playwright', '@playwright/test']) {
    try {
      chromium = req(mod).chromium;
      break;
    } catch {}
  }
  if (chromium) break;
}
if (!chromium) {
  console.error('needs `playwright` or `@playwright/test`: install it in the project, or point REPORT_DEPS_DIR at a directory where it resolves.');
  process.exit(1);
}

const url = pathToFileURL(path.resolve(page)).href;
const failures = [];
const fail = (msg) => failures.push(msg);
const browser = await chromium.launch();

try {
  // ---------- desktop, light ----------
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, colorScheme: 'light' });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => fail(`page error: ${e.message}`));
  await p.goto(url);
  await p.waitForLoadState('load');

  const thumbs = p.locator('button.open');
  const n = await thumbs.count();
  if (n === 0) fail('no thumbnails on the page');

  const viewerImg = async () => {
    await p.waitForFunction(() => {
      const i = document.getElementById('lb-i');
      return i && i.complete && i.src;
    });
    return p.$eval('#lb-i', (i) => ({ src: i.src, w: i.naturalWidth, caption: document.getElementById('lb-t').textContent }));
  };

  // 1. Every thumbnail opens its own image, and that image loads.
  const order = [];
  for (let i = 0; i < n; i++) {
    const t = thumbs.nth(i);
    await t.scrollIntoViewIfNeeded();
    const clicked = await t.locator('img').evaluate((img) => ({ src: img.src, alt: img.alt }));
    order.push(clicked);
    await t.click();
    await p.waitForSelector('dialog#lb[open]');
    const opened = await viewerImg();
    if (opened.src !== clicked.src) fail(`thumbnail ${i + 1} ("${clicked.alt}") opened ${opened.src}`);
    if (opened.caption !== clicked.alt) fail(`thumbnail ${i + 1} ("${clicked.alt}") showed caption "${opened.caption}"`);
    if (!opened.w) fail(`thumbnail ${i + 1} ("${clicked.alt}"): image did not load (${clicked.src})`);
    await p.click('#lb-x');
    await p.waitForSelector('dialog#lb:not([open])', { state: 'attached' });
  }

  // 2. Next walks the viewer in page order and wraps back to the first image.
  if (n > 0) {
    await thumbs.nth(0).scrollIntoViewIfNeeded();
    await thumbs.nth(0).click();
    await p.waitForSelector('dialog#lb[open]');
    for (let k = 1; k <= n; k++) {
      await p.click('#lb-n');
      const { src } = await viewerImg();
      const want = order[k % n].src;
      if (src !== want) {
        fail(`next #${k} showed ${src}, page order expects ${want}`);
        break;
      }
    }
    await p.click('#lb-x');
  }

  // 3. Each verdict filter shows exactly what its tile counts, and pressing it again shows all.
  const tiles = p.locator('.tile');
  const allChecks = await p.locator('.check[data-v]').count();
  for (let i = 0; i < (await tiles.count()); i++) {
    const tile = tiles.nth(i);
    const { filter, n: shown } = await tile.evaluate((t) => ({ filter: t.dataset.filter, n: +t.querySelector('.n').textContent }));
    await tile.click();
    const visible = await p.$$eval('.check[data-v]', (cs) => cs.filter((c) => !c.hidden).map((c) => c.dataset.v));
    if (visible.length !== shown || visible.some((v) => v !== filter)) fail(`filter ${filter}: tile says ${shown}, page shows ${visible.length}`);
    await tile.click();
    const back = await p.$$eval('.check[data-v]', (cs) => cs.filter((c) => !c.hidden).length);
    if (back !== allChecks) fail(`filter ${filter}: pressing again shows ${back} of ${allChecks}`);
  }
  const lightBg = await p.evaluate(() => getComputedStyle(document.body).backgroundColor);
  await ctx.close();

  // 4. Phone width, both themes: no sideways scroll. Dark theme changes the page.
  for (const scheme of ['light', 'dark']) {
    const m = await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme: scheme, isMobile: true, hasTouch: true });
    const mp = await m.newPage();
    await mp.goto(url);
    await mp.waitForLoadState('load');
    const [sw, iw] = await mp.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
    if (sw > iw) fail(`${scheme}, 390 px: page scrolls sideways (${sw} > ${iw})`);
    if (scheme === 'dark') {
      const darkBg = await mp.evaluate(() => getComputedStyle(document.body).backgroundColor);
      if (darkBg === lightBg) fail('dark theme: body background is the same as in light');
    }
    await m.close();
  }

  console.log(JSON.stringify({ page: path.resolve(page), thumbnails: n, failures: failures.length }));
} finally {
  await browser.close();
}

if (failures.length) {
  console.error(failures.map((f) => `FAIL ${f}`).join('\n'));
  process.exit(1);
}
console.log('OK: every thumbnail opens its own image; viewer follows page order; filters, phone width and dark theme hold.');
