// Browser smoke test of the demo build: every page renders without console errors, at phone and
// desktop widths, and a full trade works (market buy, limit order, cancel). Rows of chips and
// segmented buttons show every option, and on a touch phone the Browse row swipes inside its panel.
// The mentor panel shows the game's admins and required lessons; requiring a lesson locks the
// student out of trading until they pass it; an exam locks after three tries until a mentor
// resets it from the student's page.
//
//   npm run dev            (in one terminal)
//   npx playwright install chromium   (once)
//   npm run test:e2e
//
// Optional: SCREENSHOTS=dir saves a screenshot of each page. FONT_CSS=file serves local fonts.
import { chromium } from 'playwright';
import { readFileSync, mkdirSync } from 'node:fs';
import { takeExam } from '../support/exam.mjs';
import { LESSONS, lessonById } from '../../assets/js/data/lessons.js';

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

// The demo's sample game and student (assets/js/api/demo.js). The game requires what-is-a-stock,
// which the student has passed; their how-the-market-works entry is a 63% with two tries used.
const DEMO_GAME = 'demo-game';
const DEMO_STUDENT = 'demo-me';

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

// Text of one element with its whitespace folded, or null when it is not on the page.
const textOf = (page, selector) => page.$eval(selector, (el) => el.textContent.replace(/\s+/g, ' ').trim()).catch(() => null);

// A page that does not scroll sideways: the locked states add banners and bars at every width.
async function fitsWidth(s, label) {
  const overflow = await s.page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  if (overflow > 1) failures.push(`${s.name} ${label}: page scrolls sideways by ${overflow}px`);
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

  // Admins and required lessons: the demo mentor is the game's only admin, one lesson is required,
  // and the roster's Required column counts it for every student.
  const panels = await s.page.evaluate((student) => {
    const row = [...document.querySelectorAll('#roster-panel tbody tr')].find((r) => r.querySelector(`a[href="#/mentor/player/${student}"]`));
    return {
      admins: [...document.querySelectorAll('[data-admins-panel] [data-admin-list] .list-row')].map((r) => r.textContent.replace(/\s+/g, ' ').trim()),
      removeOff: document.querySelector('[data-admins-panel] [data-admin-remove]')?.disabled ?? null,
      addForm: !!document.querySelector('[data-admins-panel] [data-admin-email]'),
      count: document.querySelector('[data-lessons-panel] [data-required-count]')?.textContent.trim() ?? null,
      checked: [...document.querySelectorAll('[data-lessons-panel] [data-lesson-check]')].filter((c) => c.checked).map((c) => c.dataset.lessonCheck),
      boxes: document.querySelectorAll('[data-lessons-panel] [data-lesson-check]').length,
      saveOff: document.querySelector('[data-lessons-save]')?.disabled ?? null,
      cells: [...document.querySelectorAll('#roster-panel tbody [data-tries-cell]')].map((c) => c.textContent.trim()),
      student: row?.querySelector('[data-tries-cell]')?.textContent.trim() ?? null,
      studentDone: row?.querySelector('[data-tries-cell]')?.classList.contains('up') ?? null
    };
  }, DEMO_STUDENT);
  if (panels.admins.length !== 1 || !/Demo mentor/.test(panels.admins[0]) || !/mentor@example\.com/.test(panels.admins[0])) failures.push(`${name}: Admins panel should list Demo mentor with their email, saw ${JSON.stringify(panels.admins)}`);
  if (panels.removeOff !== true) failures.push(`${name}: the only admin's Remove button should be disabled (${panels.removeOff})`);
  if (!panels.addForm) failures.push(`${name}: an admin should see the add-admin form`);
  if (panels.count !== '1 lesson required') failures.push(`${name}: required count reads "${panels.count}"`);
  if (panels.checked.join() !== 'what-is-a-stock') failures.push(`${name}: required lessons checked: ${JSON.stringify(panels.checked)}`);
  if (panels.boxes !== LESSONS.length) failures.push(`${name}: ${panels.boxes} lesson checkboxes, expected ${LESSONS.length}`);
  if (panels.saveOff !== false) failures.push(`${name}: Save required lessons should be enabled for an admin (${panels.saveOff})`);
  if (panels.cells.length !== act.rows || panels.cells.some((c) => !/^(\d+ of \d+|none)$/.test(c))) failures.push(`${name}: roster Required cells: ${JSON.stringify(panels.cells)}`);
  if (panels.student !== '1 of 1' || panels.studentDone !== true) failures.push(`${name}: Demo Student's Required cell should read "1 of 1" and count as done, saw "${panels.student}" (${panels.studentDone})`);

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

    // Lesson exam on its own screen: a failing attempt that counts a try, then a passing one that saves progress.
    const fresh = await textOf(s.page, '[data-tries]');
    if (fresh !== '3 tries. Score 75% or better to pass.') failures.push(`lesson page before any try: tries line reads "${fresh}"`);
    await s.page.goto(BASE + '#/learn/order-types/exam');
    const miss = await takeExam(s.page, 'order-types', { wrong: 3 });
    if (!/Keep going/.test(miss) || !/5 of 8 correct/.test(miss) || !/2 tries left/.test(miss)) failures.push(`exam with 3 wrong: ${miss}`);
    if (SHOTS) await s.page.screenshot({ path: `${SHOTS}/${name}-exam-retry.png`, fullPage: true });
    await s.page.click('[data-retake]');
    const pass = await takeExam(s.page, 'order-types');
    if (!/Lesson complete/.test(pass) || !/8 of 8 correct/.test(pass) || /tries left/.test(pass)) failures.push(`exam all right: ${pass}`);
    if (await s.page.$('[data-retake]')) failures.push('exam passed: a passed lesson should offer no retake');
    if (SHOTS) await s.page.screenshot({ path: `${SHOTS}/${name}-exam-pass.png` });
    await s.page.goto(BASE + '#/learn');
    await s.page.waitForSelector('.lesson-row');
    const row = await s.page.textContent('a.lesson-row[href="#/learn/order-types"]');
    if (!/Passed 100%/.test(row)) failures.push(`learn index after passing: ${row}`);
    await s.page.goto(BASE + '#/learn/order-types');
    await s.page.waitForSelector('[data-tries]');
    const passedLine = await textOf(s.page, '[data-tries]');
    if (passedLine !== 'Passed with 100%.') failures.push(`lesson page after passing: tries line reads "${passedLine}"`);
    if (await s.page.$('a[href="#/learn/order-types/exam"]')) failures.push('lesson page after passing: the exam link should be gone');

    // Required lessons: the mentor requires a second lesson, and trading closes for the student
    // until they pass it. Markets and Learn stay open.
    await s.page.goto(BASE + `#/mentor/game/${DEMO_GAME}`);
    await s.page.waitForSelector('[data-lesson-check="how-the-market-works"]');
    await s.page.check('[data-lesson-check="how-the-market-works"]');
    const liveCount = await textOf(s.page, '[data-required-count]');
    if (liveCount !== '2 lessons required') failures.push(`required count should follow the checkboxes before Save, reads "${liveCount}"`);
    if (await s.page.$eval('[data-lessons-dirty]', (el) => el.hidden)) failures.push('the "Not saved yet" note should show once the list changes');
    await s.page.click('[data-lessons-save]');
    await s.page.waitForSelector('.toast.good:has-text("Saved. 2 lessons required")');
    await s.page.waitForFunction((student) => {
      const row = [...document.querySelectorAll('#roster-panel tbody tr')].find((r) => r.querySelector(`a[href="#/mentor/player/${student}"]`));
      return row?.querySelector('[data-tries-cell]')?.textContent.trim() === '1 of 2';
    }, DEMO_STUDENT);
    const savedPanel = await s.page.evaluate(() => ({
      count: document.querySelector('[data-required-count]')?.textContent.trim(),
      dirty: document.querySelector('[data-lessons-dirty]')?.hidden,
      checked: [...document.querySelectorAll('[data-lesson-check]')].filter((c) => c.checked).map((c) => c.dataset.lessonCheck),
      polling: !!document.querySelector('[data-activity]')
    }));
    if (savedPanel.count !== '2 lessons required' || savedPanel.dirty !== true) failures.push(`after Save: count "${savedPanel.count}", Not saved hidden ${savedPanel.dirty}`);
    if (savedPanel.checked.join() !== 'what-is-a-stock,how-the-market-works') failures.push(`after Save: checked ${JSON.stringify(savedPanel.checked)}`);
    if (!savedPanel.polling) failures.push('after Save: the roster activity line is gone, so the roster poll was lost');
    if (SHOTS) await s.page.screenshot({ path: `${SHOTS}/${name}-mentor-lessons-saved.png`, fullPage: true });

    await s.page.goto(BASE + '#/');
    await s.page.waitForSelector('[data-trading-locked]');
    const homeLock = await textOf(s.page, '[data-trading-locked]');
    if (!/Trading opens after you pass: How the stock market works\./.test(homeLock)) failures.push(`home lock banner reads "${homeLock}"`);
    if (!(await s.page.$('[data-trading-locked] a[href="#/learn/how-the-market-works"]'))) failures.push('home lock banner should link the lesson still to pass');
    if (!(await s.page.$('[data-trading-locked] a.btn[href="#/learn"]'))) failures.push('home lock banner should link to Learn');
    await fitsWidth(s, 'home locked');
    if (SHOTS) await s.page.screenshot({ path: `${SHOTS}/${name}-home-locked.png`, fullPage: true });

    await s.page.goto(BASE + '#/learn');
    await s.page.waitForSelector('[data-required-line]');
    const learnLine = await textOf(s.page, '[data-required-line]');
    if (!/Required before trading: 1 of 2 passed\./.test(learnLine) || !/Still to pass: How the stock market works\./.test(learnLine)) failures.push(`learn required line reads "${learnLine}"`);
    const chips = await s.page.$$eval('a.lesson-row [data-required-chip]', (els) => els.map((c) => [c.closest('a.lesson-row').getAttribute('href'), c.textContent.trim()]));
    if (JSON.stringify(chips) !== JSON.stringify([['#/learn/what-is-a-stock', 'Required'], ['#/learn/how-the-market-works', 'Required']])) failures.push(`learn required chips: ${JSON.stringify(chips)}`);

    await s.page.goto(BASE + '#/stock/KO');
    await s.page.waitForSelector('[data-trading-locked]');
    const stockNote = await textOf(s.page, '[data-trading-locked]');
    if (!/Trading opens after you pass your required lessons\./.test(stockNote)) failures.push(`stock page lock note reads "${stockNote}"`);
    if (await s.page.$('[data-trade]')) failures.push('stock page: Buy and Sell should give way to the lock note');
    if (!(await s.page.$('[data-trading-locked] a[href="#/learn"]'))) failures.push('stock page lock note should link to Learn');
    await fitsWidth(s, 'stock locked');
    if (SHOTS) await s.page.screenshot({ path: `${SHOTS}/${name}-stock-locked.png`, fullPage: true });

    // Exam tries: the demo student has one try left on the required lesson. Missing it locks the
    // exam, the lesson page and the exam screen both say so, and the mentor resets it.
    await s.page.goto(BASE + '#/learn/how-the-market-works');
    await s.page.waitForSelector('[data-tries]');
    const oneLeft = await textOf(s.page, '[data-tries]');
    if (oneLeft !== 'Best so far 63%. 1 try left.') failures.push(`lesson page with one try left reads "${oneLeft}"`);
    if (!(await s.page.$('a[href="#/learn/how-the-market-works/exam"]'))) failures.push('lesson page with one try left should offer the retake');
    await s.page.goto(BASE + '#/learn/how-the-market-works/exam');
    const lockedOut = await takeExam(s.page, 'how-the-market-works', { wrong: 8 });
    if (!/Out of tries/.test(lockedOut) || !/0 of 8 correct/.test(lockedOut) || !/No tries left\. Ask a mentor to reset this exam\./.test(lockedOut) || !/Best score 63%/.test(lockedOut)) failures.push(`exam on the last try: ${lockedOut}`);
    if (await s.page.$('[data-retake]')) failures.push('exam on the last try: no retake button once the tries are used');
    if (!(await s.page.$('.exam-result [data-exam-locked]'))) failures.push('exam on the last try: the locked note needs its data-exam-locked hook');
    await s.page.waitForSelector('.toast.good:has-text("Score saved")');
    if (SHOTS) await s.page.screenshot({ path: `${SHOTS}/${name}-exam-locked.png`, fullPage: true });

    await s.page.goto(BASE + '#/learn/how-the-market-works');
    await s.page.waitForSelector('[data-exam-locked]');
    const noneLeft = await textOf(s.page, '[data-tries]');
    if (noneLeft !== 'Best so far 63%. No tries left.') failures.push(`locked lesson page tries line reads "${noneLeft}"`);
    const lockedNote = await textOf(s.page, '.exam-cta [data-exam-locked]');
    if (lockedNote !== 'No tries left. Ask a mentor to reset this exam.') failures.push(`locked lesson page note reads "${lockedNote}"`);
    if (await s.page.$('a[href="#/learn/how-the-market-works/exam"]')) failures.push('locked lesson page should not offer the exam');
    await s.page.goto(BASE + '#/learn/how-the-market-works/exam');
    await s.page.waitForSelector('.exam-result [data-exam-locked]');
    if (await s.page.$('#q-text')) failures.push('locked exam screen should not show questions');
    const refusal = await textOf(s.page, '.exam-result');
    if (!/Out of tries/.test(refusal) || !/No tries left\. Ask a mentor to reset this exam\./.test(refusal) || !/Best score 63%\. Pass mark 75%\./.test(refusal)) failures.push(`locked exam screen reads "${refusal}"`);
    if (!(await s.page.$('.exam-result a[href="#/learn/how-the-market-works"]'))) failures.push('locked exam screen needs a link back to the lesson');
    await s.page.goto(BASE + '#/learn/order-types/exam');
    await s.page.waitForSelector('.exam-result');
    if (await s.page.$('#q-text')) failures.push('exam screen for a passed lesson should not show questions');
    const finished = await textOf(s.page, '.exam-result');
    if (!/Lesson complete/.test(finished) || !/nothing to retake/.test(finished)) failures.push(`exam screen for a passed lesson reads "${finished}"`);

    await s.page.goto(BASE + `#/mentor/player/${DEMO_STUDENT}`);
    await s.page.waitForSelector('[data-player-lessons]');
    const rowSel = '[data-lesson-row="how-the-market-works"]';
    const beforeReset = await s.page.evaluate((sel) => ({
      status: document.querySelector(`${sel} [data-lesson-status]`)?.textContent.trim(),
      required: !!document.querySelector(`${sel} [data-lesson-required]`),
      locked: !!document.querySelector(`${sel} [data-lesson-locked]`),
      reset: !!document.querySelector(`${sel} [data-reset-exam="how-the-market-works"]`),
      note: document.querySelector('[data-lessons-note]')?.textContent.trim(),
      passedRow: document.querySelector('[data-lesson-row="what-is-a-stock"] [data-lesson-status]')?.textContent.trim(),
      passedReset: !!document.querySelector('[data-reset-exam="what-is-a-stock"]'),
      resets: document.querySelectorAll('[data-reset-exam]').length
    }), rowSel);
    if (beforeReset.status !== 'Best 63% · 3 of 3 tries' || !beforeReset.required || !beforeReset.locked || !beforeReset.reset) failures.push(`mentor player page before reset: ${JSON.stringify(beforeReset)}`);
    if (beforeReset.note !== 'Reset exam gives the student 3 new tries and keeps their best score.') failures.push(`mentor player page lessons note reads "${beforeReset.note}"`);
    if (beforeReset.passedRow !== 'Passed 100%' || beforeReset.passedReset) failures.push(`mentor player page passed row: "${beforeReset.passedRow}", reset button ${beforeReset.passedReset}`);
    if (beforeReset.resets !== 1) failures.push(`mentor player page: ${beforeReset.resets} Reset exam buttons, expected 1 (only lessons with tries used and no pass)`);
    if (SHOTS) await s.page.screenshot({ path: `${SHOTS}/${name}-mentor-player-locked.png`, fullPage: true });
    await s.page.click('[data-reset-exam="how-the-market-works"]');
    await s.page.waitForSelector('.toast.good:has-text("Exam reset. Demo Student has 3 tries again.")');
    const afterReset = await s.page.evaluate((sel) => ({
      status: document.querySelector(`${sel} [data-lesson-status]`)?.textContent.trim(),
      required: !!document.querySelector(`${sel} [data-lesson-required]`),
      locked: !!document.querySelector(`${sel} [data-lesson-locked]`),
      reset: !!document.querySelector(`${sel} [data-reset-exam]`)
    }), rowSel);
    if (afterReset.status !== 'Best 63% · 0 of 3 tries' || !afterReset.required || afterReset.locked || afterReset.reset) failures.push(`mentor player page after reset: ${JSON.stringify(afterReset)}`);
    if (SHOTS) await s.page.screenshot({ path: `${SHOTS}/${name}-mentor-player-reset.png`, fullPage: true });

    await s.page.goto(BASE + '#/learn/how-the-market-works');
    await s.page.waitForSelector('[data-tries]');
    const threeAgain = await textOf(s.page, '[data-tries]');
    if (threeAgain !== 'Best so far 63%. 3 tries left.') failures.push(`lesson page after the reset reads "${threeAgain}"`);
    if (await s.page.$('[data-exam-locked]')) failures.push('lesson page after the reset should not show the locked note');
    if (!(await s.page.$('a[href="#/learn/how-the-market-works/exam"]'))) failures.push('lesson page after the reset should offer the retake');

    // Passing the last required lesson opens trading again.
    await s.page.goto(BASE + '#/learn/how-the-market-works/exam');
    const passRequired = await takeExam(s.page, 'how-the-market-works');
    if (!/Lesson complete/.test(passRequired) || !/8 of 8 correct/.test(passRequired)) failures.push(`required lesson exam: ${passRequired}`);
    await s.page.waitForSelector('.toast.good:has-text("Lesson complete. Progress saved.")');
    await s.page.goto(BASE + '#/learn');
    await s.page.waitForSelector('[data-required-line]');
    const allPassed = await textOf(s.page, '[data-required-line]');
    if (allPassed !== 'Required lessons: all passed. Trading is open.') failures.push(`learn required line after passing everything reads "${allPassed}"`);
    await s.page.goto(BASE + '#/');
    await s.page.waitForSelector('#main .view');
    await s.page.waitForTimeout(300);
    if (await s.page.$('[data-trading-locked]')) failures.push('home should drop the lock banner once every required lesson is passed');
    await s.page.goto(BASE + '#/stock/KO');
    await s.page.waitForSelector('[data-trade="buy"]');
    if (await s.page.$('[data-trading-locked]')) failures.push('stock page should show Buy and Sell again once every required lesson is passed');
  } else {
    // Phone: answer one question with the keyboard, then leave the exam from the confirm sheet.
    // (order-types, which this fresh demo has not passed: a passed lesson's exam no longer opens.)
    await s.page.goto(BASE + '#/learn/order-types/exam');
    await s.page.waitForSelector('#q-text');
    await s.page.keyboard.press('b');
    if (await s.page.$eval('[data-next]', (b) => b.disabled)) failures.push('exam: keyboard choice did not enable Next');
    await s.page.click('[data-exit]');
    await s.page.click('.sheet [data-yes]');
    await s.page.waitForSelector('.lesson-hero');

    // Phone: the locked states fit the screen. Lock the demo through the mentor panel, look at the
    // home banner and the stock page's lock bar, then put the required list back.
    await s.page.goto(BASE + `#/mentor/game/${DEMO_GAME}`);
    await s.page.waitForSelector('[data-lesson-check="how-the-market-works"]');
    await s.page.check('[data-lesson-check="how-the-market-works"]');
    await s.page.click('[data-lessons-save]');
    await s.page.waitForSelector('.toast.good:has-text("Saved. 2 lessons required")');
    await s.page.goto(BASE + '#/');
    await s.page.waitForSelector('[data-trading-locked]');
    await fitsWidth(s, 'home locked');
    if (SHOTS) await s.page.screenshot({ path: `${SHOTS}/${name}-home-locked.png`, fullPage: true });
    await s.page.goto(BASE + '#/stock/KO');
    await s.page.waitForSelector('[data-trading-locked]');
    if (await s.page.$('[data-trade]')) failures.push(`${name}: stock page should show the lock note instead of Buy and Sell`);
    await fitsWidth(s, 'stock locked');
    const bar = await s.page.evaluate(() => {
      const r = document.querySelector('[data-trading-locked]').getBoundingClientRect();
      return { bottom: r.bottom, right: r.right, inner: window.innerHeight, width: window.innerWidth };
    });
    if (bar.bottom > bar.inner + 1 || bar.right > bar.width + 1) failures.push(`${name}: the stock page lock bar sits off screen (${JSON.stringify(bar)})`);
    if (SHOTS) await s.page.screenshot({ path: `${SHOTS}/${name}-stock-locked.png` });
    await s.page.goto(BASE + '#/learn');
    await s.page.waitForSelector('[data-required-line]');
    await fitsWidth(s, 'learn locked');
    if (SHOTS) await s.page.screenshot({ path: `${SHOTS}/${name}-learn-locked.png`, fullPage: true });
    await s.page.goto(BASE + `#/mentor/game/${DEMO_GAME}`);
    await s.page.waitForSelector('[data-lesson-check="how-the-market-works"]');
    await s.page.uncheck('[data-lesson-check="how-the-market-works"]');
    await s.page.click('[data-lessons-save]');
    await s.page.waitForSelector('.toast.good:has-text("Saved. 1 lesson required")');
    await s.page.goto(BASE + '#/stock/KO');
    await s.page.waitForSelector('[data-trade="buy"]');
    if (await s.page.$('[data-trading-locked]')) failures.push(`${name}: restoring the required list should open trading again`);
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
console.log(`ok: ${ROUTES.length} pages at two widths, mentor panel with roster activity, admins, and required lessons, trade flow, trading locked until the required lessons pass, lesson exams with 3 tries and a mentor reset, lesson videos, and a touch phone`);
