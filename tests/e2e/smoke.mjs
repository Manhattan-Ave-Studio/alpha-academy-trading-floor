// Browser smoke test of the demo build: every page renders without console errors, at phone and
// desktop widths, and a full trade works (market buy, limit order, cancel). Rows of chips and
// segmented buttons show every option, and on a touch phone the Browse row swipes inside its panel.
//
//   npm run dev            (in one terminal)
//   npx playwright install chromium   (once)
//   npm run test:e2e
//
// Optional: SCREENSHOTS=dir saves a screenshot of each page. FONT_CSS=file serves local fonts.
import { chromium } from 'playwright';
import { readFileSync, mkdirSync } from 'node:fs';
import { takeExam } from '../support/exam.mjs';
import { lessonById } from '../../assets/js/data/lessons.js';

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

async function session(name, viewport, colorScheme, device = {}) {
  const ctx = await browser.newContext({ viewport, colorScheme, deviceScaleFactor: 1, ...device });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  page.on('pageerror', (e) => errors.push(String(e)));
  // Lesson videos must not contact YouTube until a student presses Play. Record any request that does,
  // and answer YouTube with an empty page so the test never leaves this machine.
  const youtube = [];
  page.on('request', (r) => {
    if (/youtube|ytimg|googlevideo/.test(new URL(r.url()).hostname)) youtube.push(r.url());
  });
  await page.route(/youtube-nocookie\.com|youtube\.com|ytimg\.com|googlevideo\.com/, (route) => route.fulfill({ status: 200, contentType: 'text/html', body: '' }));
  await page.route(/fonts\.googleapis\.com|fonts\.gstatic\.com|cdn\.jsdelivr\.net/, (route) => {
    const url = route.request().url();
    if (FONT_CSS && url.includes('fonts.googleapis.com')) return route.fulfill({ status: 200, contentType: 'text/css', body: FONT_CSS });
    return route.fulfill({ status: 200, contentType: url.includes('.css') || url.includes('css2') ? 'text/css' : 'text/javascript', body: '' });
  });
  return { ctx, page, errors, name, youtube };
}

// Options in a row of chips or segmented buttons that sit past the visible edge of the row or its
// panel, where a mouse user cannot reach them. Runs in the page.
function clippedOptions() {
  return [...document.querySelectorAll('#main .chips, #main .seg')].filter((row) => row.offsetParent).flatMap((row) => {
    const panel = row.closest('.panel');
    const edge = Math.min(row.getBoundingClientRect().right, panel ? panel.getBoundingClientRect().right : Infinity, window.innerWidth);
    return [...row.children]
      .filter((option) => option.getBoundingClientRect().right > edge + 1)
      .map((option) => `${row.getAttribute('aria-label') || 'row'}: ${option.textContent.trim()}`);
  });
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
  for (const option of await s.page.evaluate(clippedOptions)) failures.push(`${s.name} ${label}: cut off: ${option}`);
  const early = await s.page.$$eval('link[href], img[src], iframe[src], script[src], source[src], video[src]', (els) =>
    els.map((e) => e.href || e.src).filter((u) => /youtube|ytimg|googlevideo/.test(new URL(u, location.href).hostname)));
  if (early.length) failures.push(`${s.name} ${label}: YouTube address on the page before Play: ${early.join(', ')}`);
  if (SHOTS) await s.page.screenshot({ path: `${SHOTS}/${s.name}-${label}.png`, fullPage: label === 'home' || label === 'stock' });
}

for (const [name, viewport, scheme] of [
  ['desktop-dark', { width: 1366, height: 900 }, 'dark'],
  ['phone-light', { width: 390, height: 844 }, 'light']
]) {
  const s = await session(name, viewport, scheme);
  for (const [label, hash] of ROUTES) await visit(s, label, hash);
  if (s.youtube.length) failures.push(`${name}: YouTube contacted before Play: ${s.youtube.join(', ')}`);

  // Mentor panel (demo opens without a login)
  await s.page.goto(BASE + '#/mentor');
  await s.page.waitForSelector('[data-demo-mentor]');
  await s.page.click('[data-demo-mentor]');
  await s.page.waitForSelector('.res-card');
  await s.page.click('.res-card');
  await s.page.waitForSelector('.join-code');
  // Roster activity: a count of who is active now, and a dot with words on every row.
  const act = await s.page.evaluate(() => ({
    summary: (document.querySelector('[data-activity]')?.textContent || '').replace(/\s+/g, ' ').trim(),
    rows: [...document.querySelectorAll('#roster-panel tbody tr')].length,
    kinds: [...document.querySelectorAll('#roster-panel tbody .act')].map((e) => [...e.classList].find((c) => c !== 'act'))
  }));
  if (!/^\d+ of \d+ active now \d+ more in the last hour$/.test(act.summary)) failures.push(`${name}: roster activity summary reads "${act.summary}"`);
  if (act.kinds.length !== act.rows) failures.push(`${name}: ${act.rows - act.kinds.length} roster rows have no activity status`);
  for (const k of ['act-now', 'act-hour', 'act-earlier']) if (!act.kinds.includes(k)) failures.push(`${name}: no roster row shows ${k}`);
  // With focus on a roster button (as after Download CSV), activity still refreshes and focus stays put.
  await s.page.evaluate(() => {
    document.querySelector('#roster-panel [data-export]').focus();
    for (const l of document.querySelectorAll('#roster-panel .act-label')) l.textContent = 'stale';
  });
  await s.page.waitForTimeout(5000);
  const after = await s.page.evaluate(() => ({
    stale: [...document.querySelectorAll('#roster-panel .act-label')].filter((l) => l.textContent === 'stale').length,
    focused: document.activeElement?.matches('#roster-panel [data-export]') || false
  }));
  if (after.stale) failures.push(`${name}: ${after.stale} roster activity labels did not refresh while a roster button had focus`);
  if (!after.focused) failures.push(`${name}: the roster refresh moved focus off Download CSV`);
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

    // Lesson videos: nothing loads from YouTube until Play, then the privacy-enhanced player appears in place.
    const lesson = lessonById('order-types');
    s.youtube.length = 0;
    await s.page.goto(BASE + '#/learn/order-types');
    await s.page.waitForSelector('[data-play]');
    await s.page.locator('#watch').scrollIntoViewIfNeeded();
    await s.page.waitForTimeout(500);
    if (s.youtube.length) failures.push(`lesson videos: YouTube contacted before Play: ${s.youtube.join(', ')}`);
    const links = await s.page.$$eval('.video figcaption a', (as) => as.map((a) => a.href));
    if (links.length !== lesson.videos.length) failures.push(`lesson videos: expected ${lesson.videos.length} "Open on YouTube" links, saw ${links.length}`);
    const embed = s.page.waitForRequest(/youtube-nocookie\.com\/embed\//);
    await s.page.click('[data-play="0"]');
    // YouTube refuses to play (error 153) unless the player request names the site in its Referer.
    const referer = (await embed).headers()['referer'] || '';
    if (referer !== new URL(BASE).origin + '/') failures.push(`lesson videos: the player must send the site's origin as the Referer, saw "${referer}"`);
    const player = await s.page.waitForSelector('.video iframe');
    const src = await player.getAttribute('src');
    if (!src.startsWith(`https://www.youtube-nocookie.com/embed/${lesson.videos[0].youtube}?`)) failures.push(`lesson videos: unexpected player address ${src}`);
    if ((await player.getAttribute('title')) !== lesson.videos[0].title) failures.push('lesson videos: the player needs the video title');
    if (await s.page.$('[data-play="0"]')) failures.push('lesson videos: the Play button should give way to the player');
    if (SHOTS) await s.page.locator('#watch').screenshot({ path: `${SHOTS}/${name}-lesson-video.png` });

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

// Touch phone: the Browse row swipes sideways inside its panel, the chosen group is back in view after
// leaving and returning, and every chart range fits.
{
  const t = await session('phone-touch', { width: 360, height: 760 }, 'light', { isMobile: true, hasTouch: true });
  await t.page.goto(BASE + '#/markets');
  await t.page.waitForSelector('[data-col]');
  const lastGroup = await t.page.locator('[data-col]').last();
  const chosen = (await lastGroup.textContent()).trim();
  await lastGroup.click();
  await t.page.evaluate(() => { location.hash = '#/'; });
  await t.page.waitForSelector('#main .view');
  await t.page.evaluate(() => { location.hash = '#/markets'; });
  await t.page.waitForSelector('[data-col]');
  await t.page.waitForTimeout(300);
  const row = await t.page.evaluate(() => {
    const el = document.querySelector('.chips.scroll');
    const on = el.querySelector('[aria-pressed="true"]');
    const r = el.getBoundingClientRect(), c = on.getBoundingClientRect();
    return {
      insidePanel: r.right <= el.closest('.panel').getBoundingClientRect().right + 1,
      swipes: el.scrollWidth > el.clientWidth,
      chosenInView: c.left >= r.left - 1 && c.right <= r.right + 1,
      chosen: on.textContent.trim()
    };
  });
  if (!row.insidePanel) failures.push('phone-touch markets: the Browse row is wider than its panel');
  if (!row.swipes) failures.push('phone-touch markets: the Browse row should swipe sideways on a phone');
  if (row.chosen !== chosen || !row.chosenInView) failures.push(`phone-touch markets: "${chosen}" should be chosen and in view after returning (${JSON.stringify(row)})`);
  await t.page.goto(BASE + '#/stock/AAPL');
  await t.page.waitForSelector('[data-range]');
  for (const option of await t.page.evaluate(clippedOptions)) failures.push(`phone-touch stock: cut off: ${option}`);
  await t.page.goto(BASE + '#/learn/order-types');
  await t.page.waitForSelector('.video-frame');
  await t.page.click('[data-play="0"]');
  await t.page.waitForSelector('.video iframe');
  const vf = await t.page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth - innerWidth,
    frame: document.querySelector('.video-frame').getBoundingClientRect().width,
    column: document.querySelector('.lesson-body').getBoundingClientRect().width,
    player: document.querySelector('.video iframe').getBoundingClientRect().height
  }));
  if (vf.overflow > 1 || vf.frame > vf.column + 1) failures.push(`phone-touch lesson: the video box (${vf.frame}px) is wider than the lesson (${vf.column}px)`);
  if (vf.player < 200) failures.push(`phone-touch lesson: the player is ${vf.player}px tall; YouTube requires at least 200`);
  if (t.errors.length) failures.push(...t.errors.map((e) => `phone-touch console: ${e}`));
  await t.ctx.close();
}

await browser.close();
if (failures.length) {
  console.error('FAILED\n' + failures.map((f) => ' - ' + f).join('\n'));
  process.exit(1);
}
console.log(`ok: ${ROUTES.length} pages at two widths, mentor panel with roster activity, trade flow, lesson exams, lesson videos, and a touch phone`);
