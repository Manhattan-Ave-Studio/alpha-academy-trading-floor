// Live mode, end to end in a real browser, against a local stand-in for Supabase
// (tests/support/live-server.mjs) that runs the real migrations and the real market function.
//
// A mentor creates a login, unlocks the panel, syncs data, and creates a game.
// A student joins on a phone, buys a stock, places a limit order, takes a lesson check,
// then rejoins on a second device with the same name and PIN. The mentor sees it all.
//
//   npx playwright install chromium   (once)
//   node tests/e2e/live-smoke.mjs
//
// Optional: SCREENSHOTS=dir saves screenshots. FONT_CSS=file serves local fonts.
import { chromium } from 'playwright';
import { mkdirSync, readFileSync } from 'node:fs';
import { startLiveServer } from '../support/live-server.mjs';
import { takeExam } from '../support/exam.mjs';

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
if (SHOTS) await s.page.screenshot({ path: `${SHOTS}/live-student-home.png` });

await s.page.goto(server.origin + '/#/stock/AAPL');
await s.page.waitForSelector('[data-trade="buy"]');
await s.page.waitForSelector('#stock-chart canvas');
await s.page.waitForTimeout(800);
const news = await s.page.textContent('#news');
expect(news.includes('Apple unveils new chip'), 'news loads through the function');
expect(!news.includes('Bad link'), 'unsafe news links are dropped');
const stats = await s.page.textContent('#stats-more');
expect(stats.includes('$3.00T'), `market cap from Finnhub shows, got: ${stats.slice(0, 120)}`);
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

await s.page.goto(server.origin + '/#/learn/order-types/exam');
const examResult = await takeExam(s.page, 'order-types');
expect(/Lesson complete/.test(examResult) && /8 of 8 correct/.test(examResult), `lesson exam: ${examResult}`);
await s.page.waitForTimeout(500);
const lp = await server.sql(`select score from public.lesson_progress`);
expect(lp.length === 1 && lp[0].score === 100, 'lesson progress saved on the server');

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
const gameRow = await server.sql(`select id from public.games limit 1`);
await m.page.goto(`${server.origin}/#/mentor/game/${gameRow[0].id}`);
await m.page.waitForSelector('.table');
const roster = await m.page.textContent('.table');
expect(roster.includes('Jalen R.'), 'roster lists the student');
const pid = (await server.sql(`select id from public.players limit 1`))[0].id;
await m.page.goto(`${server.origin}/#/mentor/player/${pid}`);
await m.page.waitForSelector('text=Trade notes');
const notes = await m.page.textContent('.view');
expect(notes.includes('Testing the trade journal.'), 'mentor can read the trade note');
if (SHOTS) await m.page.screenshot({ path: `${SHOTS}/live-mentor-player.png`, fullPage: true });

// The scheduled cycle still runs cleanly with real orders in the book.
const cycle = await server.cron('refresh');
expect(cycle.cycle && cycle.cycle.market.is_open === true, 'cycle runs during the session');

for (const x of [m, s, s2]) {
  failures.push(...x.errors);
  await x.ctx.close();
}
await browser.close();
await server.close();

if (failures.length) {
  console.error('FAILED\n' + failures.map((f) => ' - ' + f).join('\n'));
  process.exit(1);
}
console.log('ok: live mode end to end (mentor signup, sync, search, new game, QR, join, trades, rules, orders, leaderboard, lesson exam, rejoin, roster, notes)');
process.exit(0);
