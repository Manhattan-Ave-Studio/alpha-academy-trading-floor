// End-to-end tests of the database: market clock, order types, buying power, game rules,
// snapshots, leaderboard, rejoin with PIN, row level security, game admins, required lessons,
// and exam tries.
// Run: npm test
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { createDb } from './harness.mjs';

let h;
let mentor;
let s1;
let s2;
let game;
let p1;
let p2;
let mentor2;

// Monday, October 12, 2026 (Eastern Daylight Time: ET = UTC-4)
const MON_10AM = '2026-10-12T14:00:00Z';
const MON_1101 = '2026-10-12T15:01:00Z';
const MON_CLOSE_PLUS_5 = '2026-10-12T20:05:00Z';
const MON_CLOSE_PLUS_20 = '2026-10-12T20:20:00Z';
const MON_5PM = '2026-10-12T21:00:00Z';
const TUE_931 = '2026-10-13T13:31:00Z';

const num = (x) => Number(x);
const near = (a, b, eps = 0.0001) => assert.ok(Math.abs(num(a) - num(b)) <= eps, `${a} != ${b}`);

async function rejects(promise, pattern, message) {
  await assert.rejects(promise, (e) => {
    assert.match(String(e.message), pattern, message);
    return true;
  });
}

before(async () => {
  h = await createDb();
  await h.setNow(MON_10AM);
  mentor = await h.createUser({ email: 'mentor@example.org' });
  s1 = await h.createUser({ anon: true });
  s2 = await h.createUser({ anon: true });
  await h.sql(`select private.set_mentor_code('brooklyn-alphas-2026')`);
});

test('market clock knows sessions, weekends, holidays, and early closes', async () => {
  const st = (await h.sql(`select private.market_state('2026-10-12T14:00:00Z') s`))[0].s;
  assert.equal(st.is_open, true);
  assert.equal(st.session_date, '2026-10-12');
  const sat = (await h.sql(`select private.market_state('2026-10-10T16:00:00Z') s`))[0].s;
  assert.equal(sat.is_open, false);
  assert.equal(sat.next_open_at, '2026-10-12T13:30:00+00:00');
  const thanksgiving = (await h.sql(`select private.market_state('2026-11-26T16:00:00Z') s`))[0].s;
  assert.equal(thanksgiving.is_open, false);
  const blackFriday = (await h.sql(`select private.market_state('2026-11-27T17:59:00Z') s`))[0].s;
  assert.equal(blackFriday.is_open, true, 'open before the 1:00 p.m. early close');
  const afterEarly = (await h.sql(`select private.market_state('2026-11-27T18:01:00Z') s`))[0].s;
  assert.equal(afterEarly.is_open, false, 'closed after the 1:00 p.m. early close');
});

test('mentor code gates mentor access', async () => {
  await rejects(h.rpc1(mentor, 'claim_mentor', { p_code: 'wrong-code-123' }), /mentor code is not right/);
  await rejects(h.rpc1(s1, 'claim_mentor', { p_code: 'brooklyn-alphas-2026' }), /email account/);
  assert.equal(await h.rpc1(mentor, 'claim_mentor', { p_code: 'brooklyn-alphas-2026', p_display_name: 'Bro. Aiken' }), true);
  await rejects(h.rpc1(s1, 'create_game', { p_name: 'Nope' }), /Mentor access/);
});

test('mentor creates a game with a join code', async () => {
  game = await h.rpc1(mentor, 'create_game', {
    p_name: 'Fall Challenge',
    p_starting_cash: 100000,
    p_starts_at: '2026-10-12T13:00:00Z'
  });
  assert.match(game.join_code, /^[A-HJ-NP-Z2-9]{6}$/);
  assert.equal(num(game.starting_cash), 100000);
});

test('students join with code, name, and PIN', async () => {
  await rejects(h.rpc1(s1, 'join_game', { p_code: 'ZZZZZZ', p_name: 'Jalen', p_pin: '1234' }), /No game matches/);
  await rejects(h.rpc1(s1, 'join_game', { p_code: game.join_code, p_name: 'Jalen', p_pin: '12' }), /4 to 6 digits/);
  await rejects(h.rpc1(s1, 'join_game', { p_code: game.join_code, p_name: '!', p_pin: '1234' }), /2 to 24/);
  p1 = await h.rpc1(s1, 'join_game', { p_code: game.join_code.toLowerCase(), p_name: '  Jalen  ', p_pin: '1234' });
  assert.equal(p1.display_name, 'Jalen');
  assert.equal(num(p1.cash), 100000);
  const again = await h.rpc1(s1, 'join_game', { p_code: game.join_code, p_name: 'Jalen', p_pin: '1234' });
  assert.equal(again.id, p1.id, 'joining twice returns the same player');
  await rejects(h.rpc1(s2, 'join_game', { p_code: game.join_code, p_name: 'jalen', p_pin: '9999' }), /already uses the name/);
  p2 = await h.rpc1(s2, 'join_game', { p_code: game.join_code, p_name: 'Marcus', p_pin: '4321' });
  assert.ok(p2.id);
});

test('anon and students cannot call service functions or write tables', async () => {
  await rejects(h.rpc1(s1, 'ingest_quotes', { p_rows: '[]' }), /permission denied/);
  await rejects(h.rpc1(null, 'place_order', { p_player_id: p1.id, p_symbol: 'AAPL', p_side: 'buy', p_type: 'market', p_qty: 1 }), /permission denied/);
  await rejects(h.select(s1, `update public.players set cash = 999999999 where id = $1`, [p1.id]), /permission denied/);
  await rejects(h.select(s1, `insert into public.positions (player_id, symbol, qty, avg_cost) values ($1, 'AAPL', 1000, 1)`, [p1.id]), /permission denied/);
});

test('market buy fills immediately during the session at the fresh quote', async () => {
  await h.setNow(MON_10AM);
  await h.quotes([
    { symbol: 'AAPL', price: 200, prev_close: 198, trade_time: MON_10AM },
    { symbol: 'SPY', price: 600, prev_close: 598, trade_time: MON_10AM },
    { symbol: 'MSFT', price: 400, prev_close: 401, trade_time: MON_10AM }
  ]);
  const o = await h.rpc1(s1, 'place_order', { p_player_id: p1.id, p_symbol: 'aapl', p_side: 'buy', p_type: 'market', p_qty: 10, p_note: 'Strong iPhone cycle' });
  assert.equal(o.status, 'filled');
  near(o.filled_price, 200);
  const [pl] = await h.sql(`select cash from public.players where id = $1`, [p1.id]);
  near(pl.cash, 98000);
  const [pos] = await h.sql(`select qty, avg_cost from public.positions where player_id = $1 and symbol = 'AAPL'`, [p1.id]);
  near(pos.qty, 10);
  near(pos.avg_cost, 200);
});

test('benchmark start price is captured on the first cycle', async () => {
  const r = await h.cycle();
  assert.equal(r.benchmarks_set, 1);
  const [g] = await h.sql(`select benchmark_start_price from public.games where id = $1`, [game.id]);
  near(g.benchmark_start_price, 600);
});

test('buy limit waits, reserves buying power, then fills when price falls to the limit', async () => {
  const o = await h.rpc1(s1, 'place_order', { p_player_id: p1.id, p_symbol: 'AAPL', p_side: 'buy', p_type: 'limit', p_qty: 5, p_limit_price: 190, p_time_in_force: 'gtc' });
  assert.equal(o.status, 'open');
  const pf = await h.rpc1(s1, 'get_portfolio', { p_player_id: p1.id });
  near(pf.reserved, 950);
  near(pf.buying_power, 98000 - 950);

  await h.setNow('2026-10-12T14:30:00Z');
  await h.quotes([{ symbol: 'AAPL', price: 191, trade_time: '2026-10-12T14:30:00Z' }]);
  let r = await h.cycle();
  assert.equal(r.orders_filled, 0);
  await h.setNow('2026-10-12T14:31:00Z');
  await h.quotes([{ symbol: 'AAPL', price: 189, trade_time: '2026-10-12T14:31:00Z' }]);
  r = await h.cycle();
  assert.equal(r.orders_filled, 1);
  const [f] = await h.sql(`select status, filled_price from public.orders where id = $1`, [o.id]);
  assert.equal(f.status, 'filled');
  near(f.filled_price, 189, 0.00001);
  const [pos] = await h.sql(`select qty, avg_cost from public.positions where player_id = $1 and symbol = 'AAPL'`, [p1.id]);
  near(pos.qty, 15);
  near(pos.avg_cost, 196.3333);
});

test('sell stop protects a position and records realized P/L', async () => {
  const o = await h.rpc1(s1, 'place_order', { p_player_id: p1.id, p_symbol: 'AAPL', p_side: 'sell', p_type: 'stop', p_qty: 15, p_stop_price: 185, p_time_in_force: 'gtc' });
  assert.equal(o.status, 'open');
  await rejects(
    h.rpc1(s1, 'place_order', { p_player_id: p1.id, p_symbol: 'AAPL', p_side: 'sell', p_type: 'market', p_qty: 1 }),
    /sell up to 0 shares/
  );
  await h.setNow('2026-10-12T14:40:00Z');
  await h.quotes([{ symbol: 'AAPL', price: 184, trade_time: '2026-10-12T14:40:00Z' }]);
  await h.cycle();
  const [f] = await h.sql(`select status, filled_price from public.orders where id = $1`, [o.id]);
  assert.equal(f.status, 'filled');
  const [pl] = await h.sql(`select cash, realized_pl from public.players where id = $1`, [p1.id]);
  // 98000 - 945 (limit buy) + 15 * 184 = 99815
  near(pl.cash, 99815);
  // proceeds 2760 minus cost 15 * 196.3333 = 2945.00
  near(pl.realized_pl, -185);
  const pos = await h.sql(`select * from public.positions where player_id = $1 and symbol = 'AAPL'`, [p1.id]);
  assert.equal(pos.length, 0);
});

test('stop-limit triggers on a gap, then fills as a limit order', async () => {
  await h.setNow('2026-10-12T15:00:00Z');
  await h.quotes([{ symbol: 'MSFT', price: 400, trade_time: '2026-10-12T15:00:00Z' }]);
  await h.rpc1(s1, 'place_order', { p_player_id: p1.id, p_symbol: 'MSFT', p_side: 'buy', p_type: 'market', p_qty: 10 });
  const o = await h.rpc1(s1, 'place_order', {
    p_player_id: p1.id, p_symbol: 'MSFT', p_side: 'sell', p_type: 'stop_limit', p_qty: 10,
    p_stop_price: 390, p_limit_price: 388, p_time_in_force: 'day'
  });
  assert.equal(o.status, 'open');
  await h.setNow(MON_1101);
  await h.quotes([{ symbol: 'MSFT', price: 385, trade_time: MON_1101 }]);
  await h.cycle();
  let [x] = await h.sql(`select status, stop_triggered from public.orders where id = $1`, [o.id]);
  assert.equal(x.status, 'open');
  assert.equal(x.stop_triggered, true, 'gapped below the limit: triggered but waiting');
  await h.setNow('2026-10-12T15:02:00Z');
  await h.quotes([{ symbol: 'MSFT', price: 388.5, trade_time: '2026-10-12T15:02:00Z' }]);
  await h.cycle();
  [x] = await h.sql(`select status, filled_price from public.orders where id = $1`, [o.id]);
  assert.equal(x.status, 'filled');
  near(x.filled_price, 388.5);
});

test('buy stop waits below the stop and fills once price rises through it', async () => {
  await h.setNow('2026-10-12T15:10:00Z');
  await h.quotes([{ symbol: 'NVDA', price: 205, prev_close: 200, trade_time: '2026-10-12T15:10:00Z' }]);
  const o = await h.rpc1(s2, 'place_order', { p_player_id: p2.id, p_symbol: 'NVDA', p_side: 'buy', p_type: 'stop', p_qty: 4, p_stop_price: 210 });
  assert.equal(o.status, 'open');
  await h.setNow('2026-10-12T15:11:00Z');
  await h.quotes([{ symbol: 'NVDA', price: 211, trade_time: '2026-10-12T15:11:00Z' }]);
  await h.cycle();
  const [x] = await h.sql(`select status, filled_price from public.orders where id = $1`, [o.id]);
  assert.equal(x.status, 'filled');
  near(x.filled_price, 211);
});

test('buying power, dollar orders, minimum price, and position limits are enforced', async () => {
  await h.setNow('2026-10-12T15:20:00Z');
  await h.quotes([
    { symbol: 'AAPL', price: 200, trade_time: '2026-10-12T15:20:00Z' },
    { symbol: 'SPY', price: 601, trade_time: '2026-10-12T15:20:00Z' }
  ]);
  await rejects(
    h.rpc1(s2, 'place_order', { p_player_id: p2.id, p_symbol: 'AAPL', p_side: 'buy', p_type: 'market', p_qty: 1000 }),
    /Not enough buying power/
  );
  const dollar = await h.rpc1(s2, 'place_order', { p_player_id: p2.id, p_symbol: 'AAPL', p_side: 'buy', p_type: 'market', p_notional: 500 });
  assert.equal(dollar.status, 'filled');
  near(dollar.filled_qty, 2.5);
  await rejects(
    h.rpc1(s2, 'place_order', { p_player_id: p2.id, p_symbol: 'AAPL', p_side: 'buy', p_type: 'limit', p_notional: 500, p_limit_price: 150 }),
    /market buy orders/
  );

  await h.rpc1('service', 'ingest_symbols', { p_rows: JSON.stringify([{ symbol: 'CHEAP', name: 'Cheap Co', exchange: 'NASDAQ' }]) });
  await h.quotes([{ symbol: 'CHEAP', price: 0.5, trade_time: '2026-10-12T15:20:00Z' }]);
  await rejects(
    h.rpc1(s2, 'place_order', { p_player_id: p2.id, p_symbol: 'CHEAP', p_side: 'buy', p_type: 'market', p_qty: 10 }),
    /priced under \$1\.00/
  );

  await h.rpc1(mentor, 'update_game', { p_game_id: game.id, p_patch: JSON.stringify({ max_position_pct: 25, allow_fractional: false }) });
  await rejects(
    h.rpc1(s2, 'place_order', { p_player_id: p2.id, p_symbol: 'AAPL', p_side: 'buy', p_type: 'market', p_qty: 200 }),
    /game limit for one stock is 25%/
  );
  const etf = await h.rpc1(s2, 'place_order', { p_player_id: p2.id, p_symbol: 'SPY', p_side: 'buy', p_type: 'market', p_qty: 60 });
  assert.equal(etf.status, 'filled', 'ETFs are exempt from the single-stock limit');
  await rejects(
    h.rpc1(s2, 'place_order', { p_player_id: p2.id, p_symbol: 'AAPL', p_side: 'buy', p_type: 'market', p_qty: 1.5 }),
    /whole number of shares/
  );
  await h.rpc1(mentor, 'update_game', { p_game_id: game.id, p_patch: JSON.stringify({ max_position_pct: null, allow_fractional: true }) });
});

test('day orders expire at the close; after-hours market orders fill at the next open', async () => {
  await h.setNow('2026-10-12T15:30:00Z');
  await h.quotes([{ symbol: 'AAPL', price: 200, trade_time: '2026-10-12T15:30:00Z' }]);
  const dayLimit = await h.rpc1(s1, 'place_order', { p_player_id: p1.id, p_symbol: 'AAPL', p_side: 'buy', p_type: 'limit', p_qty: 1, p_limit_price: 150 });
  assert.equal(dayLimit.status, 'open');

  await h.setNow(MON_CLOSE_PLUS_5);
  let r = await h.cycle();
  assert.ok(r.orders_expired >= 1);
  let [x] = await h.sql(`select status from public.orders where id = $1`, [dayLimit.id]);
  assert.equal(x.status, 'expired');

  await h.setNow(MON_5PM);
  await h.quotes([{ symbol: 'AAPL', price: 201, trade_time: '2026-10-12T20:00:00Z' }]);
  const night = await h.rpc1(s1, 'place_order', { p_player_id: p1.id, p_symbol: 'AAPL', p_side: 'buy', p_type: 'market', p_qty: 2 });
  assert.equal(night.status, 'open', 'market closed: order waits');
  r = await h.cycle();
  [x] = await h.sql(`select status from public.orders where id = $1`, [night.id]);
  assert.equal(x.status, 'open', 'a day order placed after the close is good for the next session');

  await h.setNow(TUE_931);
  r = await h.cycle();
  [x] = await h.sql(`select status from public.orders where id = $1`, [night.id]);
  assert.equal(x.status, 'open', 'no fill on a stale quote from yesterday');
  await h.quotes([{ symbol: 'AAPL', price: 203, trade_time: TUE_931 }]);
  r = await h.cycle();
  [x] = await h.sql(`select status, filled_price from public.orders where id = $1`, [night.id]);
  assert.equal(x.status, 'filled');
  near(x.filled_price, 203);
});

test('closing snapshots are taken once, 15 minutes after the close', async () => {
  await h.setNow('2026-10-13T20:10:00Z');
  let r = await h.cycle();
  assert.equal(r.snapshots, 0, 'too early');
  await h.setNow('2026-10-13T20:16:00Z');
  r = await h.cycle();
  assert.equal(r.snapshots, 2);
  r = await h.cycle();
  assert.equal(r.snapshots, 0, 'only once per session');
  // Monday's snapshot was taken by the 5 p.m. cycle in the previous test.
  const snaps = await h.sql(`select d from public.portfolio_snapshots where player_id = $1 order by d`, [p1.id]);
  assert.deepEqual(snaps.map((s) => s.d.toISOString().slice(0, 10)), ['2026-10-12', '2026-10-13']);
});

test("today's change for a position bought today starts from its cost", async () => {
  await h.quotes([
    { symbol: 'AAPL', price: 205, prev_close: 201, trade_time: '2026-10-13T19:59:00Z' },
    { symbol: 'NVDA', price: 215, prev_close: 212, trade_time: '2026-10-13T19:59:00Z' }
  ]);
  const mine = await h.rpc1(s1, 'get_portfolio', { p_player_id: p1.id });
  const aapl = mine.positions.find((p) => p.symbol === 'AAPL');
  near(aapl.day_change, 2 * (205 - 203), 0.001); // bought Tuesday morning at 203
  near(aapl.day_change_pct, 0.99, 0.001);
  const theirs = await h.rpc1(s2, 'get_portfolio', { p_player_id: p2.id });
  const nvda = theirs.positions.find((p) => p.symbol === 'NVDA');
  near(nvda.day_change, 4 * (215 - 212), 0.001); // held since Monday: from the previous close
});

test('leaderboard ranks players and marks the caller', async () => {
  const rows = await h.rpc(s2, 'get_leaderboard', { p_game_id: game.id });
  assert.equal(rows.length, 2);
  assert.equal(num(rows[0].rank), 1);
  const me = rows.find((r) => r.is_me);
  assert.equal(me.player_id, p2.id);
  await rejects(h.rpc(await h.createUser({ anon: true }), 'get_leaderboard', { p_game_id: game.id }), /not part of this game/);
  const summary = await h.rpc1(s1, 'game_summary', { p_game_id: game.id });
  assert.equal(summary.player_count, 2);
  assert.equal(summary.benchmark.symbol, 'SPY');
});

test('row level security keeps orders private and holdings private unless shared', async () => {
  const theirOrders = await h.select(s2, `select * from public.orders where player_id = $1`, [p1.id]);
  assert.equal(theirOrders.length, 0);
  const mine = await h.select(s1, `select * from public.orders where player_id = $1`, [p1.id]);
  assert.ok(mine.length > 0);
  const players = await h.select(s2, `select id from public.players where game_id = $1`, [game.id]);
  assert.equal(players.length, 2, 'classmates are visible on the roster');
  let pos = await h.select(s2, `select * from public.positions where player_id = $1`, [p1.id]);
  assert.equal(pos.length, 0);
  await h.rpc1(mentor, 'update_game', { p_game_id: game.id, p_patch: JSON.stringify({ show_holdings: true }) });
  pos = await h.select(s2, `select * from public.positions where player_id = $1`, [p1.id]);
  assert.ok(pos.length > 0, 'holdings visible when the mentor turns sharing on');
  const outsider = await h.createUser({ anon: true });
  pos = await h.select(outsider, `select * from public.positions where player_id = $1`, [p1.id]);
  assert.equal(pos.length, 0);
  const secrets = h.select(s1, `select * from private.player_secrets`);
  await rejects(secrets, /permission denied/);
});

test('rejoin on a new device with PIN, lockout after 5 misses, mentor reset', async () => {
  const phone = await h.createUser({ anon: true });
  let r = await h.rpc1(phone, 'rejoin_game', { p_code: game.join_code, p_name: 'jalen', p_pin: '0000' });
  assert.equal(r.ok, false);
  assert.match(r.message, /does not match/);
  for (let i = 0; i < 4; i++) {
    r = await h.rpc1(phone, 'rejoin_game', { p_code: game.join_code, p_name: 'Jalen', p_pin: '0000' });
  }
  assert.match(r.message, /locked/);
  r = await h.rpc1(phone, 'rejoin_game', { p_code: game.join_code, p_name: 'Jalen', p_pin: '1234' });
  assert.equal(r.ok, false, 'locked even with the right PIN');
  await h.rpc1(mentor, 'reset_player_pin', { p_player_id: p1.id, p_new_pin: '2468' });
  r = await h.rpc1(phone, 'rejoin_game', { p_code: game.join_code, p_name: 'Jalen', p_pin: '2468' });
  assert.equal(r.ok, true);
  assert.equal(r.player.id, p1.id);
  const [pl] = await h.sql(`select user_id from public.players where id = $1`, [p1.id]);
  assert.equal(pl.user_id, phone.id);
  await rejects(h.rpc1(s1, 'place_order', { p_player_id: p1.id, p_symbol: 'AAPL', p_side: 'buy', p_type: 'market', p_qty: 1 }), /does not belong/);
  s1 = phone;
});

test('cancel, watchlist, lessons, and roster', async () => {
  await h.setNow('2026-10-14T14:00:00Z');
  await h.quotes([{ symbol: 'AAPL', price: 205, trade_time: '2026-10-14T14:00:00Z' }]);
  const o = await h.rpc1(s1, 'place_order', { p_player_id: p1.id, p_symbol: 'AAPL', p_side: 'buy', p_type: 'limit', p_qty: 1, p_limit_price: 100, p_time_in_force: 'gtc' });
  await rejects(h.rpc1(s2, 'cancel_order', { p_order_id: o.id }), /no longer open/);
  const c = await h.rpc1(s1, 'cancel_order', { p_order_id: o.id });
  assert.equal(c.status, 'cancelled');

  await h.rpc(s1, 'set_watch', { p_player_id: p1.id, p_symbol: 'nke', p_on: true });
  let w = await h.select(s1, `select symbol from public.watchlist where player_id = $1`, [p1.id]);
  assert.deepEqual(w.map((x) => x.symbol), ['NKE']);
  await h.rpc(s1, 'set_watch', { p_player_id: p1.id, p_symbol: 'NKE', p_on: false });
  w = await h.select(s1, `select symbol from public.watchlist where player_id = $1`, [p1.id]);
  assert.equal(w.length, 0);

  await h.rpc(s1, 'complete_lesson', { p_player_id: p1.id, p_lesson_id: 'order-types', p_score: 67 });
  await h.rpc(s1, 'complete_lesson', { p_player_id: p1.id, p_lesson_id: 'order-types', p_score: 33 });
  const [lp] = await h.select(s1, `select score from public.lesson_progress where player_id = $1`, [p1.id]);
  assert.equal(lp.score, 67, 'best score is kept');

  let roster = await h.rpc(mentor, 'game_roster', { p_game_id: game.id });
  assert.equal(roster.length, 2);
  assert.ok(roster.every((r) => r.display_name));
  assert.equal(roster.find((r) => r.player_id === p1.id).lessons_completed, 0, 'a 67% best score has not passed yet');
  await h.rpc(s1, 'complete_lesson', { p_player_id: p1.id, p_lesson_id: 'order-types', p_score: 88 });
  roster = await h.rpc(mentor, 'game_roster', { p_game_id: game.id });
  assert.equal(roster.find((r) => r.player_id === p1.id).lessons_completed, 1, 'passing at 75% or better counts');
  await rejects(h.rpc(s1, 'game_roster', { p_game_id: game.id }), /Mentor access/);
  const games = await h.rpc1(mentor, 'mentor_games');
  assert.equal(games.length, 1);
});

test('search finds symbols by ticker and name', async () => {
  const bySymbol = await h.rpc(null, 'search_symbols', { p_query: 'nk' });
  assert.equal(bySymbol[0].symbol, 'NKE');
  const byName = await h.rpc(null, 'search_symbols', { p_query: 'coca' });
  assert.equal(byName[0].symbol, 'KO');
  const weird = await h.rpc(null, 'search_symbols', { p_query: '%' });
  assert.equal(weird.length, 0);
});

test('broker calendar sync replaces the seeded range', async () => {
  const n = await h.rpc1('service', 'ingest_calendar', {
    p_rows: JSON.stringify([
      { date: '2026-12-21', open: '09:30', close: '16:00' },
      { date: '2026-12-22', open: '09:30', close: '16:00' }
    ])
  });
  assert.equal(n, 2);
  const rows = await h.sql(`select d from public.market_calendar where d between '2026-12-21' and '2026-12-22'`);
  assert.equal(rows.length, 2);
});

test('game end cancels open orders and blocks trading; reset restarts everyone', async () => {
  await h.setNow('2026-10-15T14:00:00Z');
  await h.quotes([{ symbol: 'AAPL', price: 210, trade_time: '2026-10-15T14:00:00Z' }]);
  const open = await h.rpc1(s2, 'place_order', { p_player_id: p2.id, p_symbol: 'AAPL', p_side: 'buy', p_type: 'limit', p_qty: 1, p_limit_price: 100, p_time_in_force: 'gtc' });
  await h.rpc1(mentor, 'update_game', { p_game_id: game.id, p_patch: JSON.stringify({ ends_at: '2026-10-15T14:30:00Z' }) });
  await h.setNow('2026-10-15T14:31:00Z');
  const r = await h.cycle();
  assert.equal(r.games_ended, 1);
  const [x] = await h.sql(`select status from public.orders where id = $1`, [open.id]);
  assert.equal(x.status, 'cancelled');
  await rejects(
    h.rpc1(s2, 'place_order', { p_player_id: p2.id, p_symbol: 'AAPL', p_side: 'buy', p_type: 'market', p_qty: 1 }),
    /has ended/
  );

  const g = await h.rpc1(mentor, 'reset_game', { p_game_id: game.id, p_starting_cash: 10000 });
  assert.equal(g.status, 'active');
  const players = await h.sql(`select cash, realized_pl from public.players where game_id = $1`, [game.id]);
  assert.ok(players.every((p) => num(p.cash) === 10000 && num(p.realized_pl) === 0));
  const pos = await h.sql(`select count(*)::int n from public.positions where player_id in ($1, $2)`, [p1.id, p2.id]);
  assert.equal(pos[0].n, 0);
});

test('heartbeat marks only the caller’s own player active on the roster', async () => {
  const activeAt = async (playerId) => {
    const roster = await h.rpc(mentor, 'game_roster', { p_game_id: game.id });
    return new Date(roster.find((r) => r.player_id === playerId).last_active_at).toISOString();
  };
  await h.setNow('2026-10-16T14:00:00Z');
  await h.rpc(s1, 'heartbeat', { p_player_id: p1.id });
  assert.equal(await activeAt(p1.id), '2026-10-16T14:00:00.000Z');
  const before = await activeAt(p2.id);

  await h.setNow('2026-10-16T14:02:00Z');
  await h.rpc(s1, 'heartbeat', { p_player_id: p2.id });
  assert.equal(await activeAt(p2.id), before, 'a heartbeat for another student’s player changes nothing');
  const stranger = await h.createUser({ anon: true });
  await h.rpc(stranger, 'heartbeat', { p_player_id: p1.id });
  assert.equal(await activeAt(p1.id), '2026-10-16T14:00:00.000Z', 'nor does one from outside the game');

  await h.rpc(s2, 'heartbeat', { p_player_id: p2.id });
  assert.equal(await activeAt(p2.id), '2026-10-16T14:02:00.000Z');
});

test('students cannot read anyone’s last activity directly; their own player row still loads', async () => {
  await rejects(h.select(s2, 'select display_name, last_active_at from public.players'), /permission denied/);
  await rejects(h.select(s2, 'select * from public.players'), /permission denied/);
  const own = await h.select(s2, 'select id, game_id, user_id, display_name, cash, realized_pl, created_at from public.players where user_id = $1', [s2.id]);
  assert.equal(own.length, 1);
  assert.equal(own[0].id, p2.id);
  const classmates = await h.select(s2, 'select id, display_name from public.players where game_id = $1', [game.id]);
  assert.equal(classmates.length, 2, 'names stay visible within the game, as before');
  const roster = await h.rpc(mentor, 'game_roster', { p_game_id: game.id });
  assert.ok(roster.every((r) => r.last_active_at), 'mentors still see activity on the roster');
});

// ---------------------------------------------------------------------------
// Game admins, required lessons, and exam tries (20261021000100_modules_and_admins.sql).
// These tests share the game, players, and mentor from above: s1 is Jalen's phone after the
// rejoin test, p1 passed 'order-types' on the third try, and the game was reset to $10,000.
// ---------------------------------------------------------------------------

const ONLY_ADMINS = /Only this game's admins can change it\. Ask one of them to add you as an admin\./;
const NO_GAME = '00000000-0000-0000-0000-000000000000';
const marketBuy = (who, playerId) =>
  h.rpc1(who, 'place_order', { p_player_id: playerId, p_symbol: 'AAPL', p_side: 'buy', p_type: 'market', p_qty: 1 });
const takeExam = (who, playerId, lessonId, score) =>
  h.rpc1(who, 'complete_lesson', { p_player_id: playerId, p_lesson_id: lessonId, p_score: score });
const gameFor = async (who) => (await h.rpc1(who, 'mentor_games')).find((g) => g.id === game.id);
const rosterFor = async (who) =>
  Object.fromEntries((await h.rpc(who, 'game_roster', { p_game_id: game.id })).map((r) => [r.player_id, r]));
const at = (t) => new Date(t).toISOString();

test('whoever creates a game is its first admin, and mentor_games says so', async () => {
  const rows = await h.sql(`select user_id, added_by from public.game_admins where game_id = $1`, [game.id]);
  assert.deepEqual(rows, [{ user_id: mentor.id, added_by: mentor.id }]);
  const g = await gameFor(mentor);
  assert.equal(g.is_admin, true);
  assert.deepEqual(g.admins, [{ user_id: mentor.id, email: 'mentor@example.org', display_name: 'Bro. Aiken' }]);
  assert.deepEqual(g.required_lessons, []);
});

test('every mentor can open a game and its roster, but only its admins can change it', async () => {
  mentor2 = await h.createUser({ email: 'second@example.org' });
  assert.equal(await h.rpc1(mentor2, 'claim_mentor', { p_code: 'brooklyn-alphas-2026', p_display_name: 'Bro. Second' }), true);
  const g = await gameFor(mentor2);
  assert.equal(g.is_admin, false);
  assert.deepEqual(g.admins.map((a) => a.email), ['mentor@example.org']);
  assert.deepEqual(g.required_lessons, []);
  const roster = await h.rpc(mentor2, 'game_roster', { p_game_id: game.id });
  assert.equal(roster.length, 2, 'the roster is open to every mentor');
  const admins = await h.select(mentor2, `select user_id from public.game_admins where game_id = $1`, [game.id]);
  assert.deepEqual(admins.map((a) => a.user_id), [mentor.id], 'so is the admin list');

  await rejects(h.rpc1(mentor2, 'update_game', { p_game_id: game.id, p_patch: JSON.stringify({ announcement: 'Nope' }) }), ONLY_ADMINS);
  await rejects(h.rpc1(mentor2, 'reset_game', { p_game_id: game.id }), ONLY_ADMINS);
  await rejects(h.rpc1(mentor2, 'reset_player_pin', { p_player_id: p1.id, p_new_pin: '1357' }), ONLY_ADMINS);
  await rejects(h.rpc1(mentor2, 'rename_player', { p_player_id: p1.id, p_name: 'Jay' }), ONLY_ADMINS);
  await rejects(h.rpc1(mentor2, 'remove_player', { p_player_id: p2.id }), ONLY_ADMINS);
  await rejects(h.rpc1(mentor2, 'set_game_lessons', { p_game_id: game.id, p_lesson_ids: ['order-types'] }), ONLY_ADMINS);
  await rejects(h.rpc1(mentor2, 'set_game_admin', { p_game_id: game.id, p_email: 'second@example.org', p_on: true }), ONLY_ADMINS);
  await rejects(h.rpc1(mentor2, 'reset_exam', { p_player_id: p1.id, p_lesson_id: 'order-types' }), ONLY_ADMINS);

  const [after] = await h.sql(`select announcement, starting_cash from public.games where id = $1`, [game.id]);
  assert.equal(after.announcement, null);
  near(after.starting_cash, 10000);
  const players = await h.sql(`select display_name from public.players where game_id = $1 order by display_name`, [game.id]);
  assert.deepEqual(players.map((p) => p.display_name), ['Jalen', 'Marcus'], 'nothing changed');
  const [lessons] = await h.sql(`select count(*)::int n from public.game_lessons where game_id = $1`, [game.id]);
  assert.equal(lessons.n, 0);
});

test('admins add other mentors by email, and a game always keeps one admin', async () => {
  await h.createUser({ email: 'parent@example.org' });
  await rejects(
    h.rpc1(mentor, 'set_game_admin', { p_game_id: game.id, p_email: 'parent@example.org', p_on: true }),
    /No mentor uses the email parent@example.org\. They need to create a mentor login and enter the mentor code first\./
  );
  await rejects(h.rpc1(mentor, 'set_game_admin', { p_game_id: game.id, p_email: 'nobody@example.org', p_on: true }), /No mentor uses the email nobody@example.org/);
  await rejects(h.rpc1(mentor, 'set_game_admin', { p_game_id: game.id, p_email: '', p_on: true }), /No mentor uses the email/);
  await rejects(h.rpc1(mentor, 'set_game_admin', { p_game_id: NO_GAME, p_email: 'second@example.org', p_on: true }), /Game not found/);
  await rejects(
    h.rpc1(mentor, 'set_game_admin', { p_game_id: game.id, p_email: 'mentor@example.org', p_on: false }),
    /A game needs at least one admin\. Add another admin before removing this one\./
  );

  let admins = await h.rpc1(mentor, 'set_game_admin', { p_game_id: game.id, p_email: '  Second@Example.org ', p_on: true });
  assert.deepEqual(
    admins.map((a) => [a.user_id, a.email, a.display_name]),
    [[mentor.id, 'mentor@example.org', 'Bro. Aiken'], [mentor2.id, 'second@example.org', 'Bro. Second']],
    'email case and spaces do not matter'
  );
  admins = await h.rpc1(mentor, 'set_game_admin', { p_game_id: game.id, p_email: 'second@example.org', p_on: true });
  assert.equal(admins.length, 2, 'adding an admin twice changes nothing');
  const [row] = await h.sql(`select added_by from public.game_admins where game_id = $1 and user_id = $2`, [game.id, mentor2.id]);
  assert.equal(row.added_by, mentor.id);

  assert.equal((await gameFor(mentor2)).is_admin, true);
  const g = await h.rpc1(mentor2, 'update_game', { p_game_id: game.id, p_patch: JSON.stringify({ announcement: 'Welcome back' }) });
  assert.equal(g.announcement, 'Welcome back');
  await h.rpc1(mentor2, 'reset_player_pin', { p_player_id: p2.id, p_new_pin: '4321' });
  const renamed = await h.rpc1(mentor2, 'rename_player', { p_player_id: p2.id, p_name: 'Marcus' });
  assert.equal(renamed.display_name, 'Marcus');

  // Either admin can remove the other, but never the last one standing.
  admins = await h.rpc1(mentor2, 'set_game_admin', { p_game_id: game.id, p_email: 'mentor@example.org', p_on: false });
  assert.deepEqual(admins.map((a) => a.user_id), [mentor2.id]);
  await rejects(h.rpc1(mentor, 'update_game', { p_game_id: game.id, p_patch: JSON.stringify({ announcement: 'Nope' }) }), ONLY_ADMINS);
  await rejects(h.rpc1(mentor2, 'set_game_admin', { p_game_id: game.id, p_email: 'second@example.org', p_on: false }), /at least one admin/);
  admins = await h.rpc1(mentor2, 'set_game_admin', { p_game_id: game.id, p_email: 'mentor@example.org', p_on: true });
  assert.equal(admins.length, 2);
  admins = await h.rpc1(mentor, 'set_game_admin', { p_game_id: game.id, p_email: 'second@example.org', p_on: false });
  assert.deepEqual(admins.map((a) => a.user_id), [mentor.id]);
  admins = await h.rpc1(mentor, 'set_game_admin', { p_game_id: game.id, p_email: 'second@example.org', p_on: false });
  assert.deepEqual(admins.map((a) => a.user_id), [mentor.id], 'removing someone who is not an admin changes nothing');
  assert.equal((await gameFor(mentor2)).is_admin, false);
  await rejects(h.rpc1(mentor2, 'update_game', { p_game_id: game.id, p_patch: JSON.stringify({ announcement: 'Nope' }) }), ONLY_ADMINS);
});

test('students cannot assign lessons, manage admins, reset exams, or see who the admins are', async () => {
  await rejects(h.rpc1(s1, 'set_game_lessons', { p_game_id: game.id, p_lesson_ids: ['order-types'] }), /Mentor access/);
  await rejects(h.rpc1(s1, 'set_game_admin', { p_game_id: game.id, p_email: 'mentor@example.org', p_on: true }), /Mentor access/);
  await rejects(h.rpc1(s1, 'reset_exam', { p_player_id: p1.id, p_lesson_id: 'order-types' }), /Mentor access/);
  await rejects(h.rpc1(null, 'set_game_lessons', { p_game_id: game.id, p_lesson_ids: ['order-types'] }), /permission denied/);
  await rejects(h.rpc1(null, 'set_game_admin', { p_game_id: game.id, p_email: 'mentor@example.org', p_on: true }), /permission denied/);
  await rejects(h.rpc1(null, 'reset_exam', { p_player_id: p1.id, p_lesson_id: 'order-types' }), /permission denied/);
  await rejects(h.select(s1, `insert into public.game_lessons (game_id, lesson_id) values ($1, 'order-types')`, [game.id]), /permission denied/);
  await rejects(h.select(s1, `insert into public.game_admins (game_id, user_id) values ($1, $2)`, [game.id, s1.id]), /permission denied/);
  await rejects(h.select(s1, `update public.lesson_progress set attempts = 0 where player_id = $1`, [p1.id]), /permission denied/);
  assert.equal((await h.select(s1, `select * from public.game_admins`)).length, 0, 'the admin list is for mentors');
  const [n] = await h.sql(`select count(*)::int n from public.game_admins where game_id = $1`, [game.id]);
  assert.equal(n.n, 1);
});

test('set_game_lessons replaces the list, and game_summary carries it to students', async () => {
  await rejects(h.rpc1(mentor, 'set_game_lessons', { p_game_id: NO_GAME, p_lesson_ids: ['order-types'] }), /Game not found/);
  let ids = await h.rpc1(mentor, 'set_game_lessons', { p_game_id: game.id, p_lesson_ids: ['order-types', 'what-is-a-stock'] });
  assert.deepEqual(ids, ['order-types', 'what-is-a-stock']);
  ids = await h.rpc1(mentor, 'set_game_lessons', { p_game_id: game.id, p_lesson_ids: ['researching-a-company', 'researching-a-company'] });
  assert.deepEqual(ids, ['researching-a-company'], 'the old list is gone and a repeat collapses');
  await rejects(h.rpc1(mentor, 'set_game_lessons', { p_game_id: game.id, p_lesson_ids: ['Order Types'] }), /Unknown lesson/);
  assert.deepEqual((await gameFor(mentor)).required_lessons, ['researching-a-company'], 'a bad id leaves the list as it was');
  ids = await h.rpc1(mentor, 'set_game_lessons', { p_game_id: game.id, p_lesson_ids: ['what-is-a-stock', 'order-types'] });
  assert.deepEqual(ids, ['what-is-a-stock', 'order-types'], 'kept in the order given');

  const summary = await h.rpc1(s1, 'game_summary', { p_game_id: game.id });
  assert.deepEqual(summary.game.required_lessons, ['what-is-a-stock', 'order-types']);
  assert.equal(summary.player_count, 2);
  assert.deepEqual((await gameFor(mentor2)).required_lessons, ['what-is-a-stock', 'order-types']);
  const mine = await h.select(s2, `select lesson_id from public.game_lessons where game_id = $1 order by position`, [game.id]);
  assert.deepEqual(mine.map((r) => r.lesson_id), ['what-is-a-stock', 'order-types'], 'students in the game can read the list');
  const outsider = await h.createUser({ anon: true });
  assert.equal((await h.select(outsider, `select lesson_id from public.game_lessons`)).length, 0);
});

test('place_order is refused until the student passes every required lesson', async () => {
  await h.setNow('2026-10-16T14:10:00Z');
  await h.quotes([{ symbol: 'AAPL', price: 210, prev_close: 208, trade_time: '2026-10-16T14:10:00Z' }]);
  const locked = /Finish your required lessons before trading\. Open Learn to see what is left\./;
  await rejects(marketBuy(s1, p1.id), locked, 'Jalen passed order-types but not what-is-a-stock');
  await rejects(marketBuy(s2, p2.id), locked);

  await h.rpc1(mentor, 'update_game', { p_game_id: game.id, p_patch: JSON.stringify({ status: 'paused' }) });
  await rejects(marketBuy(s2, p2.id), /Trading is paused/, 'the game status answers first, as in the demo engine');
  await h.rpc1(mentor, 'update_game', { p_game_id: game.id, p_patch: JSON.stringify({ status: 'active' }) });

  let r = await takeExam(s1, p1.id, 'what-is-a-stock', 50);
  assert.equal(r.attempts, 1);
  await rejects(marketBuy(s1, p1.id), locked, 'a failing score does not count');
  r = await takeExam(s1, p1.id, 'what-is-a-stock', 75);
  assert.deepEqual([r.score, r.attempts], [75, 2]);
  const o = await marketBuy(s1, p1.id);
  assert.equal(o.status, 'filled', 'passing at exactly 75 opens trading');
  near(o.filled_price, 210);
  const [pl] = await h.sql(`select cash from public.players where id = $1`, [p1.id]);
  near(pl.cash, 10000 - 210);

  await rejects(marketBuy(s2, p2.id), locked, 'a classmate who has not passed stays locked');
  const pf = await h.rpc1(s2, 'get_portfolio', { p_player_id: p2.id });
  near(pf.cash, 10000);
  assert.equal((await h.rpc(s2, 'get_leaderboard', { p_game_id: game.id })).length, 2, 'everything but orders stays open');
});

test('complete_lesson counts tries, locks after the third miss, and ends after a pass', async () => {
  await h.setNow('2026-10-16T14:11:00Z');
  let r = await takeExam(s2, p2.id, 'reading-a-quote', 25);
  assert.deepEqual([r.player_id, r.lesson_id, r.score, r.attempts, at(r.completed_at)], [p2.id, 'reading-a-quote', 25, 1, '2026-10-16T14:11:00.000Z']);
  await h.setNow('2026-10-16T14:12:00Z');
  r = await takeExam(s2, p2.id, 'reading-a-quote', 50);
  assert.deepEqual([r.score, r.attempts, at(r.completed_at)], [50, 2, '2026-10-16T14:12:00.000Z'], 'a better score moves the date');
  await h.setNow('2026-10-16T14:13:00Z');
  r = await takeExam(s2, p2.id, 'reading-a-quote', 38);
  assert.deepEqual([r.score, r.attempts, at(r.completed_at)], [50, 3, '2026-10-16T14:12:00.000Z'], 'a worse score keeps the best and its date');
  await rejects(takeExam(s2, p2.id, 'reading-a-quote', 100), /You have used all 3 tries for this exam\. Ask a mentor to reset it\./);
  const [row] = await h.select(s2, `select score, attempts from public.lesson_progress where player_id = $1 and lesson_id = 'reading-a-quote'`, [p2.id]);
  assert.deepEqual(row, { score: 50, attempts: 3 }, 'the student can read their own count');

  r = await takeExam(s2, p2.id, 'bulls-bears-volatility', 140);
  assert.deepEqual([r.score, r.attempts], [100, 1], 'scores are kept between 0 and 100');
  await rejects(takeExam(s2, p2.id, 'bulls-bears-volatility', 60), /You already passed this lesson, so there is nothing to retake\./);
  await rejects(takeExam(s1, p1.id, 'order-types', 100), /already passed/, 'passed on the third try earlier, so no fourth is needed');
  await rejects(takeExam(s2, p2.id, 'Reading A Quote', 90), /Unknown lesson/);
  await rejects(takeExam(s1, p2.id, 'reading-a-quote', 90), /does not belong/);
  const [n] = await h.sql(`select count(*)::int n from public.lesson_progress where player_id = $1`, [p2.id]);
  assert.equal(n.n, 2, 'refused tries are not recorded');
});

test('reset_exam gives a fresh set of tries and keeps the best score', async () => {
  await rejects(h.rpc1(mentor2, 'reset_exam', { p_player_id: p2.id, p_lesson_id: 'reading-a-quote' }), ONLY_ADMINS);
  await rejects(h.rpc1(mentor, 'reset_exam', { p_player_id: p2.id, p_lesson_id: 'order-types' }), /This student has not taken that exam yet\./);
  let r = await h.rpc1(mentor, 'reset_exam', { p_player_id: p2.id, p_lesson_id: 'reading-a-quote' });
  assert.deepEqual([r.player_id, r.lesson_id, r.score, r.attempts], [p2.id, 'reading-a-quote', 50, 0]);
  await h.setNow('2026-10-16T14:14:00Z');
  r = await takeExam(s2, p2.id, 'reading-a-quote', 63);
  assert.deepEqual([r.score, r.attempts], [63, 1], 'the next try is the first of a new set');
  const [row] = await h.select(s2, `select score, attempts from public.lesson_progress where player_id = $1 and lesson_id = 'reading-a-quote'`, [p2.id]);
  assert.deepEqual(row, { score: 63, attempts: 1 });
  r = await h.rpc1(mentor, 'reset_exam', { p_player_id: p1.id, p_lesson_id: 'order-types' });
  assert.deepEqual([r.score, r.attempts], [88, 0]);
  await rejects(takeExam(s1, p1.id, 'order-types', 100), /already passed/, 'a reset never reopens a passed lesson');
});

test('game_roster counts the required lessons and how many each student has passed', async () => {
  let roster = await rosterFor(mentor);
  assert.deepEqual([roster[p1.id].lessons_required, roster[p1.id].lessons_required_passed, roster[p1.id].lessons_completed], [2, 2, 2]);
  assert.deepEqual(
    [roster[p2.id].lessons_required, roster[p2.id].lessons_required_passed, roster[p2.id].lessons_completed], [2, 0, 1],
    'a pass on a lesson that is not required does not count toward the requirement'
  );
  const theirs = await rosterFor(mentor2);
  assert.deepEqual([theirs[p2.id].lessons_required, theirs[p2.id].lessons_required_passed], [2, 0], 'a mentor who is not an admin sees the same counts');

  assert.deepEqual(await h.rpc1(mentor, 'set_game_lessons', { p_game_id: game.id, p_lesson_ids: [] }), []);
  roster = await rosterFor(mentor);
  assert.deepEqual([roster[p2.id].lessons_required, roster[p2.id].lessons_required_passed, roster[p2.id].lessons_completed], [0, 0, 1]);
  await h.setNow('2026-10-16T14:20:00Z');
  await h.quotes([{ symbol: 'AAPL', price: 211, trade_time: '2026-10-16T14:20:00Z' }]);
  const o = await marketBuy(s2, p2.id);
  assert.equal(o.status, 'filled', 'with nothing required, trading opens for everyone');
  near(o.filled_price, 211);
});

test('a game whose admins are all gone is open to every mentor', async () => {
  await h.sql(`delete from public.game_admins where game_id = $1`, [game.id]);
  for (const who of [mentor, mentor2]) {
    const g = await gameFor(who);
    assert.equal(g.is_admin, true);
    assert.deepEqual(g.admins, []);
  }
  const g = await h.rpc1(mentor2, 'update_game', { p_game_id: game.id, p_patch: JSON.stringify({ announcement: 'Open to all mentors' }) });
  assert.equal(g.announcement, 'Open to all mentors');
  assert.deepEqual(await h.rpc1(mentor2, 'set_game_lessons', { p_game_id: game.id, p_lesson_ids: ['order-types'] }), ['order-types']);
  let admins = await h.rpc1(mentor2, 'set_game_admin', { p_game_id: game.id, p_email: 'second@example.org', p_on: true });
  assert.deepEqual(admins.map((a) => a.user_id), [mentor2.id], 'the first mentor to add an admin takes the game over');
  await rejects(h.rpc1(mentor, 'update_game', { p_game_id: game.id, p_patch: JSON.stringify({ announcement: 'Nope' }) }), ONLY_ADMINS);

  // Deleting a mentor's account is how a game loses its admins: the admin row goes with it.
  await h.sql(`delete from auth.users where id = $1`, [mentor2.id]);
  assert.equal((await h.sql(`select count(*)::int n from public.game_admins where game_id = $1`, [game.id]))[0].n, 0);
  assert.equal((await gameFor(mentor)).is_admin, true);
  admins = await h.rpc1(mentor, 'set_game_admin', { p_game_id: game.id, p_email: 'mentor@example.org', p_on: true });
  assert.deepEqual(admins.map((a) => a.user_id), [mentor.id]);
  const [row] = await h.sql(`select added_by from public.game_admins where game_id = $1`, [game.id]);
  assert.equal(row.added_by, mentor.id);
});
