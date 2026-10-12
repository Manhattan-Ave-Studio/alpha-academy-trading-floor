// Browser smoke test of the demo build: every page renders without console errors, at phone and
// desktop widths, and a full trade works (market buy, limit order, cancel).
//
//   npm run dev            (in one terminal)
//   npx playwright install chromium   (once)
//   npm run test:e2e
//
// Optional: SCREENSHOTS=dir saves a screenshot of each page. FONT_CSS=file serves local fonts.
import { chromium } from 'playwright';
import { readFileSync, mkdirSync } from 'node:fs';
import { takeExam } from '../support/exam.mjs';

const BASE = process.env.BASE_URL || 'http://localhost:5173/';
const SHOTS = process.env.SCREENSHOTS || '';
const FONT_CSS = process.env.FONT_CSS ? readFileSync(process.env.FONT_CSS, 'utf8') : null;
if (SHOTS) mkdirSync(SHOTS, { recursive: true });

const ROUTES = [
  ['home', '#/'],
  ['markets', '#/markets'],
  ['stock', '#/stock/AAPL'],
  ['portfolio', '#/portfolio'],
  ['orders', '#/orders'],
  ['leaderboard', '#/leaderboard'],
  ['learn', '#/learn'],
  ['lesson', '#/learn/order-types'],
  ['exam', '#/learn/order-types/exam'],
  ['glossary', '#/glossary'],
  ['tools', '#/tools'],
  ['resources', '#/resources'],
  ['account', '#/account'],
  ['join', '#/join'],
  ['player', '#/player/bot-2']
];

const failures = [];
const browser = await chromium.launch();

async function session(name, viewport, colorScheme) {
  const ctx = await browser.newContext({ viewport, colorScheme, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.route(/fonts\.googleapis\.com|fonts\.gstatic\.com|cdn\.jsdelivr\.net/, (route) => {
    const url = route.request().url();
    if (FONT_CSS && url.includes('fonts.googleapis.com')) return route.fulfill({ status: 200, contentType: 'text/css', body: FONT_CSS });
    return route.fulfill({ status: 200, contentType: url.includes('.css') || url.includes('css2') ? 'text/css' : 'text/javascript', body: '' });
  });
  return { ctx, page, errors, name };
}

async function visit(s, label, hash) {
  await s.page.goto(BASE + hash);
  await s.page.waitForSelector('#main .view', { timeout: 15000 });
  await s.page.waitForTimeout(700);
  const overflow = await s.page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  if (overflow > 1) failures.push(`${s.name} ${label}: page scrolls sideways by ${overflow}px`);
  const failed = await s.page.$('.empty b');
  const failedText = failed ? await failed.textContent() : '';
  if (/did not load/.test(failedText || '')) failures.push(`${s.name} ${label}: ${failedText}`);
  if (SHOTS) await s.page.screenshot({ path: `${SHOTS}/${s.name}-${label}.png`, fullPage: label === 'home' || label === 'stock' });
}

for (const [name, viewport, scheme] of [
  ['desktop-dark', { width: 1366, height: 900 }, 'dark'],
  ['phone-light', { width: 390, height: 844 }, 'light']
]) {
  const s = await session(name, viewport, scheme);
  for (const [label, hash] of ROUTES) await visit(s, label, hash);

  // Mentor panel (demo opens without a login)
  await s.page.goto(BASE + '#/mentor');
  await s.page.waitForSelector('[data-demo-mentor]');
  await s.page.click('[data-demo-mentor]');
  await s.page.waitForSelector('.res-card');
  await s.page.click('.res-card');
  await s.page.waitForSelector('.join-code');
  if (SHOTS) await s.page.screenshot({ path: `${SHOTS}/${name}-mentor-game.png`, fullPage: true });

  if (name === 'desktop-dark') {
    // Trade flow: market buy, then a limit order that waits, then cancel it.
    await s.page.goto(BASE + '#/stock/KO');
    await s.page.waitForSelector('[data-trade="buy"]');
    await s.page.click('[data-trade="buy"]');
    await s.page.fill('#t-qty', '3');
    await s.page.click('[data-review]');
    await s.page.click('[data-submit]');
    await s.page.waitForSelector('.sheet .banner');
    const result = await s.page.textContent('.sheet .banner');
    if (!/Bought 3 shares of KO/.test(result)) failures.push(`trade: unexpected result "${result}"`);
    if (SHOTS) await s.page.screenshot({ path: `${SHOTS}/${name}-trade-done.png` });
    await s.page.click('.sheet [data-close]:not(a)');

    await s.page.click('[data-trade="buy"]');
    await s.page.click('[data-type="limit"]');
    await s.page.fill('#t-qty', '2');
    await s.page.fill('#t-limit', '1.00');
    await s.page.click('[data-review]');
    if (SHOTS) await s.page.screenshot({ path: `${SHOTS}/${name}-trade-review.png` });
    await s.page.click('[data-submit]');
    await s.page.waitForSelector('.sheet .banner');
    const placed = await s.page.textContent('.sheet .banner');
    if (!/Order placed/.test(placed)) failures.push(`limit order: unexpected result "${placed}"`);
    await s.page.click('.sheet a[href="#/orders"]');
    await s.page.waitForSelector('[data-cancel]');
    const before = await s.page.$$eval('[data-cancel]', (els) => els.length);
    await s.page.click('[data-cancel]');
    await s.page.click('.sheet [data-yes]');
    await s.page.waitForTimeout(600);
    const after = await s.page.$$eval('[data-cancel]', (els) => els.length);
    if (after !== before - 1) failures.push(`cancel: expected ${before - 1} open orders, saw ${after}`);

    // Lesson exam on its own screen: a failing attempt, then a passing one that saves progress.
    await s.page.goto(BASE + '#/learn/order-types/exam');
    const miss = await takeExam(s.page, 'order-types', { wrong: 3 });
    if (!/Keep going/.test(miss) || !/5 of 8 correct/.test(miss)) failures.push(`exam with 3 wrong: ${miss}`);
    if (SHOTS) await s.page.screenshot({ path: `${SHOTS}/${name}-exam-retry.png`, fullPage: true });
    await s.page.click('[data-retake]');
    const pass = await takeExam(s.page, 'order-types');
    if (!/Lesson complete/.test(pass) || !/8 of 8 correct/.test(pass)) failures.push(`exam all right: ${pass}`);
    if (SHOTS) await s.page.screenshot({ path: `${SHOTS}/${name}-exam-pass.png` });
    await s.page.goto(BASE + '#/learn');
    await s.page.waitForSelector('.lesson-row');
    const row = await s.page.textContent('a.lesson-row[href="#/learn/order-types"]');
    if (!/Passed 100%/.test(row)) failures.push(`learn index after passing: ${row}`);
  } else {
    // Phone: answer one question with the keyboard, then leave the exam from the confirm sheet.
    await s.page.goto(BASE + '#/learn/what-is-a-stock/exam');
    await s.page.waitForSelector('#q-text');
    await s.page.keyboard.press('b');
    if (await s.page.$eval('[data-next]', (b) => b.disabled)) failures.push('exam: keyboard choice did not enable Next');
    await s.page.click('[data-exit]');
    await s.page.click('.sheet [data-yes]');
    await s.page.waitForSelector('.lesson-hero');
  }

  if (s.errors.length) failures.push(...s.errors.map((e) => `${name} console: ${e}`));
  await s.ctx.close();
}

await browser.close();
if (failures.length) {
  console.error('FAILED\n' + failures.map((f) => ' - ' + f).join('\n'));
  process.exit(1);
}
console.log(`ok: ${ROUTES.length} pages at two widths, mentor panel, trade flow, and lesson exams`);
