// Live mode, end to end in a real browser, against a local stand-in for Supabase
// (tests/support/live-server.mjs) that runs the real migrations and the real market function.
//
// A mentor creates a login, unlocks the panel, syncs data, creates a game, and makes a lesson
// required. A student joins on a phone, is locked out of trading until they pass that lesson's
// exam (the server refuses an order sent anyway), buys a stock, places a limit order, then rejoins
// on a second device with the same name and PIN. The mentor sees it all and resets an exam. A
// second mentor can open the game but not change it until the first mentor makes them an admin.
//
//   npx playwright install chromium   (once)
//   node tests/e2e/live-smoke.mjs
//
// Optional: SCREENSHOTS=dir saves screenshots. FONT_CSS=file serves local fonts.
import { chromium } from 'playwright';
import { mkdirSync, readFileSync } from 'node:fs';
import { startLiveServer } from '../support/live-server.mjs';
import { takeExam } from '../support/exam.mjs';
import { lessonById } from '../../assets/js/data/lessons.js';

// The lesson the mentor requires, named by its full title on the student's screens.
const REQUIRED = lessonById('order-types');

const SHOTS = process.env.SCREENSHOTS || '';
const FONT_CSS = process.env.FONT_CSS ? readFileSync(process.env.FONT_CSS, 'utf8') : null;
if (SHOTS) mkdirSync(SHOTS, { recursive: true });

const server = await startLiveServer({ port: 5174 });
await server.sql(`select private.set_mentor_code('brooklyn-alphas-2026')`);
const first = await server.cron('refresh');
if (!(first.refreshed > 90)) throw new Error('initial refresh did not load prices: ' + JSON.stringify(first));

const failures = [];
const browser = await chromium.launch();
const opened = [];

async function open(name, viewport) {
  const ctx = await browser.newContext({ viewport });
  // The browser and the stand-in server agree on the time: a Monday morning with the market open.
  await ctx.clock.install({ time: server.now });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(`${name}: ${e}`));
  page.on('console', (m) => {
    if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(`${name}: ${m.text()}`);
  });
  await page.route(/fonts\.googleapis\.com|fonts\.gstatic\.com|cdn\.jsdelivr\.net|static\.finnhub\.io/, (r) => {
    const css = FONT_CSS && r.request().url().includes('fonts.googleapis.com');
    return r.fulfill({ status: 200, contentType: css ? 'text/css' : 'text/plain', body: css ? FONT_CSS : '' });
  });
  const entry = { name, ctx, page, errors };
  opened.push(entry);
  return entry;
}

// On a crash, show what each page was displaying so the failure explains itself.
process.on('uncaughtException', async (e) => {
  console.error(e);
  for (const x of opened) {
    const text = await x.page.evaluate(() => (document.querySelector('#main') || document.querySelector('#app'))?.innerText || '').catch(() => '');
    console.error(`\n--- ${x.name} at ${x.page.url()}\n${text.replace(/\n{2,}/g, '\n').slice(0, 1500)}`);
    if (x.errors.length) console.error('errors:\n' + x.errors.join('\n'));
  }
  process.exit(1);
});

const expect = (cond, msg) => {
  if (!cond) failures.push(msg);
};

// Text of one element with its whitespace folded, or null when it is not on the page.
const textOf = (page, selector) => page.$eval(selector, (el) => el.textContent.replace(/\s+/g, ' ').trim()).catch(() => null);

// Polls the stand-in until a query returns what the browser should have saved.
async function saved(label, query, ok, { timeout = 15000 } = {}) {
  const until = Date.now() + timeout;
  for (;;) {
    const rows = await server.sql(query);
    if (ok(rows)) return rows;
    if (Date.now() > until) throw new Error(`timed out waiting for ${label}: ${JSON.stringify(rows)}`);
    await new Promise((r) => setTimeout(r, 200));
  }
}

// Calls the real client from inside a page, the way a stale screen or a changed page would, and
// returns the server's message (or '' when the call went through).
const clientError = (page, fn, arg) => page.evaluate(([src, a]) => import('/assets/js/state.js').then(({ store }) => {
  const call = new Function('store', 'arg', `return (${src})(store, arg)`);
  return Promise.resolve(call(store, a)).then(() => '', (e) => e.message);
}), [fn.toString(), arg]);

// ---------------------------------------------------------------- mentor
const m = await open('mentor', { width: 1280, height: 900 });
await m.page.goto(server.origin + '/#/mentor');
await m.page.waitForSelector('[data-auth="up"]');
await m.page.click('[data-auth="up"]');
await m.page.fill('#m-email', 'mentor@gil1906.org');
await m.page.fill('#m-pass', 'correct-horse-battery');
await m.page.fill('#m-code2', 'brooklyn-alphas-2026');
await m.page.fill('#m-name2', 'Bro. Tester');
await m.page.click('#m-submit');
await m.page.waitForSelector('text=Mentor panel', { timeout: 15000 });
await m.page.waitForSelector('[data-sync]', { timeout: 15000 });
await m.page.click('[data-sync]');
await m.page.waitForSelector('text=Synced', { timeout: 15000 });
const tradable = await server.sql(`select count(*)::int n from public.symbols where tradable`);
expect(tradable[0].n >= 99, `sync should add listed symbols, found ${tradable[0].n}`);

// Search reaches the full list, including a company the sync just added.
await m.page.fill('#top-search', 'newco');
await m.page.waitForSelector('#top-results:not([hidden])', { timeout: 10000 });
await m.page.waitForFunction(() => /NewCo/.test(document.querySelector('#top-results')?.textContent || ''), null, { timeout: 10000 });
await m.page.fill('#top-search', '');

await m.page.goto(server.origin + '/#/mentor/new');
await m.page.waitForSelector('#g-name');
await m.page.fill('#g-name', 'Fall 2026 Market Challenge');
await m.page.selectOption('#g-max', '25');
await m.page.click('#new-game button[type="submit"]');
await m.page.waitForSelector('.join-code', { timeout: 15000 });
const code = (await m.page.textContent('.join-code')).trim();
// A minute passes: the scheduled cycle records the S&P 500 starting price for the new game.
const afterCreate = await server.cron('refresh');
expect(afterCreate.cycle?.benchmarks_set === 1, `benchmark start price set, got ${JSON.stringify(afterCreate.cycle)}`);
expect(/^[A-Z0-9]{6}$/.test(code), `join code looks wrong: ${code}`);
expect((await m.page.$('.qr svg')) !== null, 'QR code renders');
const gameRow = await server.sql(`select id from public.games limit 1`);
const gameId = gameRow[0].id;

// ---------------------------------------------------------------- admins and required lessons
// The creator is the game's only admin, so their Remove button is off. Nothing is required yet.
await m.page.waitForSelector('[data-admins-panel]');
const fresh = await m.page.evaluate(() => ({
  admins: [...document.querySelectorAll('[data-admin-list] .list-row')].map((r) => r.textContent.replace(/\s+/g, ' ').trim()),
  removeOff: document.querySelector('[data-admin-remove]')?.disabled ?? null,
  count: document.querySelector('[data-required-count]')?.textContent.trim() ?? null,
  checked: document.querySelectorAll('[data-lesson-check]:checked').length,
  saveOff: document.querySelector('[data-lessons-save]')?.disabled ?? null
}));
expect(fresh.admins.length === 1 && /Bro\. Tester/.test(fresh.admins[0]) && /mentor@gil1906\.org/.test(fresh.admins[0]), `Admins panel lists the creator with their email: ${JSON.stringify(fresh.admins)}`);
expect(fresh.removeOff === true, `the only admin's Remove button is disabled (${fresh.removeOff})`);
expect(fresh.count === 'No lessons required' && fresh.checked === 0, `a new game requires nothing: "${fresh.count}", ${fresh.checked} checked`);
expect(fresh.saveOff === false, 'the admin can save required lessons');
await m.page.check('[data-lesson-check="order-types"]');
expect((await textOf(m.page, '[data-required-count]')) === '1 lesson required', 'the count follows the checkbox before Save');
await m.page.click('[data-lessons-save]');
await m.page.waitForSelector('.toast.good:has-text("Saved. 1 lesson required")', { timeout: 15000 });
const lessonsSaved = await saved('required lessons', `select lesson_id from public.game_lessons`, (rows) => rows.length === 1);
expect(lessonsSaved[0].lesson_id === 'order-types', `required lessons saved on the server: ${JSON.stringify(lessonsSaved)}`);
const admins = await server.sql(`select count(*)::int n from public.game_admins`);
expect(admins[0].n === 1, `the creator is the game's admin, found ${admins[0].n}`);
if (SHOTS) await m.page.screenshot({ path: `${SHOTS}/live-mentor-game.png`, fullPage: true });

// ---------------------------------------------------------------- student, phone
const s = await open('student', { width: 390, height: 844 });
await s.page.goto(`${server.origin}/#/join/${code}`);
await s.page.waitForSelector('#j-name');
expect((await s.page.inputValue('#j-code')) === code, 'join link pre-fills the code');
await s.page.fill('#j-name', 'Jalen R.');
await s.page.fill('#j-pin', '2468');
await s.page.fill('#j-pin2', '2468');
await s.page.click('#join-form button[type="submit"]');
await s.page.waitForSelector('.hero-value .big', { timeout: 15000 });
const start = await s.page.textContent('.hero-value .big');
expect(start.includes('100,000.00'), `starting value should be $100,000.00, got ${start}`);

// Trading waits for the required lesson. The home banner names it; the stock page shows the note
// instead of Buy and Sell; the server refuses an order sent anyway.
await s.page.waitForSelector('[data-trading-locked]', { timeout: 15000 });
const homeLock = await textOf(s.page, '[data-trading-locked]');
expect(homeLock?.includes(`Trading opens after you pass: ${REQUIRED.title}.`), `home lock banner: "${homeLock}"`);
expect((await s.page.$('[data-trading-locked] a[href="#/learn/order-types"]')) !== null, 'home lock banner links the lesson');
if (SHOTS) await s.page.screenshot({ path: `${SHOTS}/live-student-home-locked.png`, fullPage: true });

await s.page.goto(server.origin + '/#/stock/AAPL');
await s.page.waitForSelector('[data-trading-locked]');
await s.page.waitForSelector('#stock-chart canvas');
await s.page.waitForTimeout(800);
const news = await s.page.textContent('#news');
expect(news.includes('Apple unveils new chip'), 'news loads through the function');
expect(!news.includes('Bad link'), 'unsafe news links are dropped');
const stats = await s.page.textContent('#stats-more');
expect(stats.includes('$3.00T'), `market cap from Finnhub shows, got: ${stats.slice(0, 120)}`);
expect((await s.page.$('[data-trade]')) === null, 'Buy and Sell give way to the lessons note while locked');
const stockNote = await textOf(s.page, '[data-trading-locked]');
expect(/Trading opens after you pass your required lessons\./.test(stockNote), `stock page lock note: "${stockNote}"`);
expect((await s.page.$('[data-trading-locked] a[href="#/learn"]')) !== null, 'stock page lock note links to Learn');
const refusedOrder = await clientError(s.page, (store) => store.api.placeOrder(store.current.player.id, { symbol: 'AAPL', side: 'buy', order_type: 'market', qty: 1, time_in_force: 'day' }));
expect(/Finish your required lessons before trading/.test(refusedOrder), `the server refuses an order while locked: "${refusedOrder}"`);
expect((await server.sql(`select count(*)::int n from public.orders`))[0].n === 0, 'no order is recorded while locked');
if (SHOTS) await s.page.screenshot({ path: `${SHOTS}/live-student-stock-locked.png` });

// Learn says what is left. The first try misses and counts; the second passes and keeps the best.
await s.page.goto(server.origin + '/#/learn');
await s.page.waitForSelector('[data-required-line]');
const learnLine = await textOf(s.page, '[data-required-line]');
expect(/Required before trading: 0 of 1 passed\./.test(learnLine) && learnLine.includes(`Still to pass: ${REQUIRED.title}.`), `learn required line: "${learnLine}"`);
const chips = await s.page.$$eval('a.lesson-row [data-required-chip]', (els) => els.map((c) => c.closest('a.lesson-row').getAttribute('href')));
expect(chips.join() === '#/learn/order-types', `required chips: ${JSON.stringify(chips)}`);
await s.page.goto(server.origin + '/#/learn/order-types');
await s.page.waitForSelector('[data-tries]');
expect((await textOf(s.page, '[data-tries]')) === '3 tries. Score 75% or better to pass.', `tries line before any try: "${await textOf(s.page, '[data-tries]')}"`);
await s.page.goto(server.origin + '/#/learn/order-types/exam');
const miss = await takeExam(s.page, 'order-types', { wrong: 3 });
expect(/Keep going/.test(miss) && /5 of 8 correct/.test(miss) && /2 tries left/.test(miss), `first try: ${miss}`);
let lp = await saved('the first try', `select score, attempts from public.lesson_progress where lesson_id = 'order-types'`, (rows) => rows.length === 1);
expect(lp[0].score === 63 && lp[0].attempts === 1, `one try recorded on the server: ${JSON.stringify(lp)}`);
await s.page.click('[data-retake]');
const examResult = await takeExam(s.page, 'order-types');
expect(/Lesson complete/.test(examResult) && /8 of 8 correct/.test(examResult), `lesson exam: ${examResult}`);
expect((await s.page.$('[data-retake]')) === null, 'a passed lesson offers no retake');
lp = await saved('the pass', `select score, attempts from public.lesson_progress where lesson_id = 'order-types'`, (rows) => rows.length === 1 && rows[0].score === 100);
expect(lp[0].attempts === 2, `the pass keeps the try count: ${JSON.stringify(lp)}`);
if (SHOTS) await s.page.screenshot({ path: `${SHOTS}/live-student-exam-pass.png`, fullPage: true });
// A second lesson, missed once, for the mentor to reset later.
await s.page.goto(server.origin + '/#/learn/what-is-a-stock/exam');
const miss2 = await takeExam(s.page, 'what-is-a-stock', { wrong: 3 });
expect(/Keep going/.test(miss2) && /2 tries left/.test(miss2), `what-is-a-stock first try: ${miss2}`);
await saved('the second lesson', `select attempts from public.lesson_progress where lesson_id = 'what-is-a-stock'`, (rows) => rows.length === 1 && rows[0].attempts === 1);

// Trading is open now.
await s.page.goto(server.origin + '/#/');
await s.page.waitForSelector('.hero-value .big');
await s.page.waitForTimeout(300);
expect((await s.page.$('[data-trading-locked]')) === null, 'the home lock banner clears after the pass');
if (SHOTS) await s.page.screenshot({ path: `${SHOTS}/live-student-home.png` });

await s.page.goto(server.origin + '/#/stock/AAPL');
await s.page.waitForSelector('[data-trade="buy"]');
await s.page.waitForSelector('#stock-chart canvas');
await s.page.click('[data-trade="buy"]');
await s.page.fill('#t-qty', '5');
await s.page.fill('#t-note', 'Testing the trade journal.');
await s.page.click('[data-review]');
await s.page.click('[data-submit]');
await s.page.waitForSelector('.sheet .banner', { timeout: 15000 });
const bought = await s.page.textContent('.sheet .banner');
expect(/Bought 5 shares of AAPL at \$200\.00/.test(bought), `market buy result: ${bought}`);
await s.page.click('.sheet [data-close]:not(a)');

// Position limit from the game rules (25% per stock)
await s.page.click('[data-trade="buy"]');
await s.page.fill('#t-qty', '200');
await s.page.click('[data-review]');
await s.page.click('[data-submit]');
await s.page.waitForSelector('.sheet [data-error]:not(:empty)', { timeout: 15000 });
const limitMsg = await s.page.textContent('.sheet [data-error]');
expect(/game limit for one stock is 25%/.test(limitMsg), `position limit message: ${limitMsg}`);
await s.page.click('.sheet [data-close]');

// A limit order that waits
await s.page.click('[data-trade="buy"]');
await s.page.click('[data-type="limit"]');
await s.page.fill('#t-qty', '3');
await s.page.fill('#t-limit', '150');
await s.page.click('[data-review]');
await s.page.click('[data-submit]');
await s.page.waitForSelector('.sheet .banner', { timeout: 15000 });
expect((await s.page.textContent('.sheet .banner')).includes('Order placed'), 'limit order is placed and waits');
await s.page.click('.sheet [data-close]:not(a)');

await s.page.goto(server.origin + '/#/orders');
await s.page.waitForSelector('[data-cancel]');
expect((await s.page.$$('[data-cancel]')).length === 1, 'one open order');

await s.page.goto(server.origin + '/#/portfolio');
await s.page.waitForSelector('.table');
const holdings = await s.page.textContent('.table');
expect(holdings.includes('AAPL'), 'portfolio shows the AAPL holding');

await s.page.goto(server.origin + '/#/leaderboard');
await s.page.waitForSelector('.table');
const board = await s.page.textContent('.table');
expect(board.includes('Jalen R.'), 'leaderboard lists the student');
expect(board.includes('S&P 500 benchmark'), 'leaderboard shows the benchmark row');

// ---------------------------------------------------------------- student, second device
const s2 = await open('student-laptop', { width: 1280, height: 860 });
await s2.page.goto(server.origin + '/#/join');
await s2.page.waitForSelector('[data-tab="rejoin"]');
await s2.page.click('[data-tab="rejoin"]');
await s2.page.fill('#r-code', code);
await s2.page.fill('#r-name', 'jalen r.');
await s2.page.fill('#r-pin', '1111');
await s2.page.click('#rejoin-form button[type="submit"]');
await s2.page.waitForSelector('#j-error:not(:empty)');
expect((await s2.page.textContent('#j-error')).includes('does not match'), 'wrong PIN is refused');
await s2.page.fill('#r-pin', '2468');
await s2.page.click('#rejoin-form button[type="submit"]');
await s2.page.waitForSelector('.hero-value .big', { timeout: 15000 });
const laptopValue = await s2.page.textContent('.hero-value .big');
expect(laptopValue.includes('100,000.00') || laptopValue.includes('99,'), `rejoined portfolio value: ${laptopValue}`);

// ---------------------------------------------------------------- mentor sees the student
await m.page.goto(`${server.origin}/#/mentor/game/${gameId}`);
await m.page.waitForSelector('.table');
const roster = await m.page.textContent('.table');
expect(roster.includes('Jalen R.'), 'roster lists the student');
const jalen = await m.page.$eval('#roster-panel tbody', (tb) => {
  const r = [...tb.rows].find((x) => x.textContent.includes('Jalen R.'));
  const cell = r?.querySelector('[data-tries-cell]');
  return { active: r?.querySelector('.act')?.className || '', required: cell?.textContent.trim() ?? null, done: cell?.classList.contains('up') ?? null };
});
expect(jalen.active.includes('act-now'), `a student who just rejoined shows as active now (${jalen.active})`);
expect(jalen.required === '1 of 1' && jalen.done === true, `the roster's Required column counts the pass: "${jalen.required}" (${jalen.done})`);
const activityLine = (await m.page.textContent('[data-activity]')).replace(/\s+/g, ' ').trim();
expect(/^\d+ of \d+ active now \d+ more in the last hour$/.test(activityLine), `roster activity count: ${activityLine}`);
const pid = (await server.sql(`select id from public.players limit 1`))[0].id;
await m.page.goto(`${server.origin}/#/mentor/player/${pid}`);
await m.page.waitForSelector('text=Trade notes');
const notes = await m.page.textContent('.view');
expect(notes.includes('Testing the trade journal.'), 'mentor can read the trade note');

// The Lessons panel shows the pass, the missed try, and a Reset exam button only where it applies.
await m.page.waitForSelector('[data-player-lessons]');
const lessonRows = await m.page.evaluate(() => ({
  passed: document.querySelector('[data-lesson-row="order-types"] [data-lesson-status]')?.textContent.trim(),
  passedRequired: !!document.querySelector('[data-lesson-row="order-types"] [data-lesson-required]'),
  passedReset: !!document.querySelector('[data-reset-exam="order-types"]'),
  tried: document.querySelector('[data-lesson-row="what-is-a-stock"] [data-lesson-status]')?.textContent.trim(),
  triedLocked: !!document.querySelector('[data-lesson-row="what-is-a-stock"] [data-lesson-locked]'),
  triedReset: !!document.querySelector('[data-reset-exam="what-is-a-stock"]'),
  resets: document.querySelectorAll('[data-reset-exam]').length,
  note: document.querySelector('[data-lessons-note]')?.textContent.trim() ?? null
}));
expect(lessonRows.passed === 'Passed 100%' && lessonRows.passedRequired && !lessonRows.passedReset, `passed lesson row: ${JSON.stringify(lessonRows)}`);
expect(lessonRows.tried === 'Best 63% · 1 of 3 tries' && !lessonRows.triedLocked && lessonRows.triedReset && lessonRows.resets === 1, `missed lesson row: ${JSON.stringify(lessonRows)}`);
expect(lessonRows.note === 'Reset exam gives the student 3 new tries and keeps their best score.', `lessons note: "${lessonRows.note}"`);
if (SHOTS) await m.page.screenshot({ path: `${SHOTS}/live-mentor-player.png`, fullPage: true });
await m.page.click('[data-reset-exam="what-is-a-stock"]');
await m.page.waitForSelector('.toast.good:has-text("Exam reset. Jalen R. has 3 tries again.")', { timeout: 15000 });
const afterReset = await m.page.evaluate(() => ({
  status: document.querySelector('[data-lesson-row="what-is-a-stock"] [data-lesson-status]')?.textContent.trim(),
  reset: !!document.querySelector('[data-reset-exam="what-is-a-stock"]')
}));
expect(afterReset.status === 'Best 63% · 0 of 3 tries' && !afterReset.reset, `row after the reset: ${JSON.stringify(afterReset)}`);
const reset = await saved('the exam reset', `select score, attempts from public.lesson_progress where lesson_id = 'what-is-a-stock'`, (rows) => rows.length === 1 && rows[0].attempts === 0);
expect(reset[0].score === 63, `the reset keeps the best score: ${JSON.stringify(reset)}`);
// The student sees three tries again (on the laptop: rejoining moved the player to that device).
await s2.page.goto(server.origin + '/#/learn/what-is-a-stock');
await s2.page.waitForSelector('[data-tries]');
const triesAgain = await textOf(s2.page, '[data-tries]');
expect(triesAgain === 'Best so far 63%. 3 tries left.', `student's lesson page after the reset: "${triesAgain}"`);
expect((await s2.page.$('a[href="#/learn/what-is-a-stock/exam"]')) !== null, 'the reset exam can be taken again');

// ---------------------------------------------------------------- second mentor
// Every mentor can open the game and see the roster. Only its admins can change it, and the
// server, not the disabled buttons, is what refuses.
const m2 = await open('mentor-2', { width: 1280, height: 900 });
await m2.page.goto(server.origin + '/#/mentor');
await m2.page.waitForSelector('[data-auth="up"]');
await m2.page.click('[data-auth="up"]');
await m2.page.fill('#m-email', 'second@gil1906.org');
await m2.page.fill('#m-pass', 'another-strong-password');
await m2.page.fill('#m-code2', 'brooklyn-alphas-2026');
await m2.page.fill('#m-name2', 'Bro. Second');
await m2.page.click('#m-submit');
await m2.page.waitForSelector('text=Mentor panel', { timeout: 15000 });
await m2.page.waitForSelector('.res-card', { timeout: 15000 });
await m2.page.goto(`${server.origin}/#/mentor/game/${gameId}`);
await m2.page.waitForSelector('[data-admin-banner]', { timeout: 15000 });
const CONTROLS = ['[data-status="paused"]', '#ann', '#ann-form button[type="submit"]', '#r-name', '#rules-form button[type="submit"]', '#rs-cash', '#reset-form button[type="submit"]', '[data-lessons-save]', '[data-lesson-check="order-types"]', '[data-pin]', '[data-rename]', '[data-remove]'];
const nonAdmin = await m2.page.evaluate((controls) => ({
  banner: document.querySelector('[data-admin-banner]')?.textContent.replace(/\s+/g, ' ').trim(),
  note: document.querySelector('[data-admin-note]')?.textContent.trim() ?? null,
  addForm: !!document.querySelector('[data-admin-email]'),
  removes: document.querySelectorAll('[data-admin-remove]').length,
  admins: [...document.querySelectorAll('[data-admin-list] .list-row')].map((r) => r.textContent.replace(/\s+/g, ' ').trim()),
  roster: (document.querySelector('#roster-panel')?.textContent || '').includes('Jalen R.'),
  checked: document.querySelector('[data-lesson-check="order-types"]')?.checked ?? null,
  count: document.querySelector('[data-required-count]')?.textContent.trim() ?? null,
  selectAll: document.querySelectorAll('[data-track-all]').length,
  enabled: controls.filter((sel) => !(document.querySelector(sel)?.disabled ?? false))
}), CONTROLS);
expect(/You are not an admin of this game\./.test(nonAdmin.banner || ''), `non-admin banner: "${nonAdmin.banner}"`);
expect(nonAdmin.note === 'Only admins can change this game. Ask one of them to add you.', `non-admin note: "${nonAdmin.note}"`);
expect(!nonAdmin.addForm && nonAdmin.removes === 0 && nonAdmin.admins.length === 1 && /Bro\. Tester/.test(nonAdmin.admins[0]), `non-admin sees the admin list read-only: ${JSON.stringify(nonAdmin)}`);
expect(nonAdmin.roster, 'non-admin still sees the roster');
expect(nonAdmin.checked === true && nonAdmin.count === '1 lesson required' && nonAdmin.selectAll === 0, `non-admin sees the required list read-only: ${JSON.stringify(nonAdmin)}`);
expect(nonAdmin.enabled.length === 0, `controls that should be disabled for a non-admin: ${nonAdmin.enabled.join(', ')}`);
const refusedChange = await clientError(m2.page, (store, gid) => store.api.setGameLessons(gid, ['order-types']), gameId);
expect(/admins can change it/.test(refusedChange), `the server refuses a non-admin's change: "${refusedChange}"`);
const refusedReset = await clientError(m2.page, (store, p) => store.api.resetExam(p, 'what-is-a-stock'), pid);
expect(/admins can change it/.test(refusedReset), `the server refuses a non-admin's exam reset: "${refusedReset}"`);
if (SHOTS) await m2.page.screenshot({ path: `${SHOTS}/live-mentor2-not-admin.png`, fullPage: true });

// The first mentor adds them by email. Both Remove buttons wake up now that there are two admins.
await m.page.goto(`${server.origin}/#/mentor/game/${gameId}`);
await m.page.waitForSelector('[data-admin-email]');
await m.page.fill('[data-admin-email]', 'second@gil1906.org');
await m.page.click('[data-admin-add]');
await m.page.waitForSelector('.toast.good:has-text("Admin added")', { timeout: 15000 });
await m.page.waitForFunction(() => document.querySelectorAll('[data-admin-list] .list-row').length === 2, null, { timeout: 15000 });
const adminList = await m.page.evaluate(() => ({
  rows: [...document.querySelectorAll('[data-admin-list] .list-row')].map((r) => r.textContent.replace(/\s+/g, ' ').trim()),
  removeOff: [...document.querySelectorAll('[data-admin-remove]')].map((b) => b.disabled),
  head: document.querySelector('[data-admins-panel] .panel-head')?.textContent.replace(/\s+/g, ' ').trim()
}));
expect(adminList.rows.some((r) => /Bro\. Second/.test(r) && /second@gil1906\.org/.test(r)), `the new admin is listed: ${JSON.stringify(adminList.rows)}`);
expect(adminList.removeOff.join() === 'false,false' && /2 admins/.test(adminList.head), `two admins, both removable: ${JSON.stringify(adminList)}`);
expect((await server.sql(`select count(*)::int n from public.game_admins`))[0].n === 2, 'the server has two admins');

// The second mentor's controls work now.
await m2.page.goto(server.origin + '/#/mentor');
await m2.page.waitForSelector('.res-card');
await m2.page.goto(`${server.origin}/#/mentor/game/${gameId}`);
await m2.page.waitForSelector('[data-admin-email]', { timeout: 15000 });
const nowAdmin = await m2.page.evaluate((controls) => ({
  banner: !!document.querySelector('[data-admin-banner]'),
  note: !!document.querySelector('[data-admin-note]'),
  disabled: controls.filter((sel) => document.querySelector(sel)?.disabled ?? true)
}), CONTROLS);
expect(!nowAdmin.banner && !nowAdmin.note && nowAdmin.disabled.length === 0, `the new admin's controls are on: ${JSON.stringify(nowAdmin)}`);
await m2.page.fill('#ann', 'Welcome to the fall challenge.');
await m2.page.click('#ann-form button[type="submit"]');
await m2.page.waitForSelector('.toast.good:has-text("Announcement saved")', { timeout: 15000 });
const ann = await saved('the announcement', `select announcement from public.games`, (rows) => rows[0]?.announcement === 'Welcome to the fall challenge.');
expect(ann.length === 1, 'the new admin changed the game');
if (SHOTS) await m2.page.screenshot({ path: `${SHOTS}/live-mentor2-admin.png`, fullPage: true });

// The scheduled cycle still runs cleanly with real orders in the book.
const cycle = await server.cron('refresh');
expect(cycle.cycle && cycle.cycle.market.is_open === true, 'cycle runs during the session');

for (const x of [m, s, s2, m2]) {
  failures.push(...x.errors);
  await x.ctx.close();
}
await browser.close();
await server.close();

if (failures.length) {
  console.error('FAILED\n' + failures.map((f) => ' - ' + f).join('\n'));
  process.exit(1);
}
console.log('ok: live mode end to end (mentor signup, sync, search, new game, QR, admins panel, required lessons, join, trading locked until the lesson is passed with the server refusing an order, lesson exam with tries, trades, rules, orders, leaderboard, rejoin, roster with activity and the Required column, notes, exam reset, second mentor refused as a non-admin then added by email)');
process.exit(0);
