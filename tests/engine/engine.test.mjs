// The demo engine must follow the same rules and math as the database engine.
// These scenarios mirror tests/sql/trading.test.mjs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateOrder, applyFill, orderDecision, processOpenOrders, reservedCash, OrderError } from '../../assets/js/engine/trading.js';

const near = (a, b, eps = 0.0001) => assert.ok(Math.abs(a - b) <= eps, `${a} != ${b}`);

// progress is the player's lesson progress, checked against game.required_lessons.
function setup(overrides = {}, progress = {}) {
  const game = {
    status: 'active', starts_at: '2026-10-12T13:00:00Z', ends_at: null, allow_fractional: true,
    max_position_pct: null, min_share_price: 1, commission: 0, ...overrides
  };
  const state = { cash: 100000, realized_pl: 0, positions: {}, orders: [], transactions: [] };
  const prices = {};
  const priceOf = (s) => prices[s] ?? null;
  const now = Date.parse('2026-10-12T14:00:00Z');
  const place = (input, info = { tradable: true, asset_type: 'stock' }) => {
    const clean = validateOrder({ game, state, symbolInfo: info, quote: { price: prices[input.symbol] }, input, now, priceOf, progress });
    const o = { id: String(state.orders.length + 1), ...clean, status: 'open', stop_triggered: false, created_at: new Date(now).toISOString() };
    state.orders.unshift(o);
    const d = orderDecision(o, prices[o.symbol]);
    if (d === 'fill') applyFill(state, o, prices[o.symbol], game, o.created_at);
    else if (d === 'trigger') o.stop_triggered = true;
    return o;
  };
  const tick = () => processOpenOrders(state, priceOf, game, new Date(now).toISOString());
  return { game, state, prices, place, tick, priceOf, progress };
}

test('market buy, limit buy, and sell stop match the database results', () => {
  const t = setup();
  t.prices.AAPL = 200;
  const m = t.place({ symbol: 'AAPL', side: 'buy', order_type: 'market', qty: 10 });
  assert.equal(m.status, 'filled');
  near(t.state.cash, 98000);

  const l = t.place({ symbol: 'AAPL', side: 'buy', order_type: 'limit', qty: 5, limit_price: 190, time_in_force: 'gtc' });
  assert.equal(l.status, 'open');
  near(reservedCash(t.state, t.priceOf, 0), 950);
  t.prices.AAPL = 191;
  assert.equal(t.tick().length, 0);
  t.prices.AAPL = 189;
  t.tick();
  assert.equal(l.status, 'filled');
  near(t.state.positions.AAPL.qty, 15);
  near(t.state.positions.AAPL.avg_cost, 196.3333);

  const s = t.place({ symbol: 'AAPL', side: 'sell', order_type: 'stop', qty: 15, stop_price: 185, time_in_force: 'gtc' });
  assert.equal(s.status, 'open');
  assert.throws(() => t.place({ symbol: 'AAPL', side: 'sell', order_type: 'market', qty: 1 }), /sell up to 0 shares/);
  t.prices.AAPL = 184;
  t.tick();
  assert.equal(s.status, 'filled');
  near(t.state.cash, 99815);
  near(t.state.realized_pl, -185);
  assert.equal(t.state.positions.AAPL, undefined);
});

test('stop-limit triggers on a gap and fills later as a limit', () => {
  const t = setup();
  t.prices.MSFT = 400;
  t.place({ symbol: 'MSFT', side: 'buy', order_type: 'market', qty: 10 });
  const o = t.place({ symbol: 'MSFT', side: 'sell', order_type: 'stop_limit', qty: 10, stop_price: 390, limit_price: 388 });
  t.prices.MSFT = 385;
  t.tick();
  assert.equal(o.status, 'open');
  assert.equal(o.stop_triggered, true);
  t.prices.MSFT = 388.5;
  t.tick();
  assert.equal(o.status, 'filled');
  near(o.filled_price, 388.5);
});

test('buy stop fills only after the price rises through the stop', () => {
  const t = setup();
  t.prices.NVDA = 205;
  const o = t.place({ symbol: 'NVDA', side: 'buy', order_type: 'stop', qty: 4, stop_price: 210 });
  assert.equal(o.status, 'open');
  t.prices.NVDA = 211;
  t.tick();
  assert.equal(o.status, 'filled');
  near(o.filled_price, 211);
});

test('buying power, dollar orders, minimum price, position limits, and fractional rules', () => {
  const t = setup();
  t.prices.AAPL = 200;
  t.prices.SPY = 601;
  t.prices.CHEAP = 0.5;
  assert.throws(() => t.place({ symbol: 'AAPL', side: 'buy', order_type: 'market', qty: 1000 }), /Not enough buying power/);
  const d = t.place({ symbol: 'AAPL', side: 'buy', order_type: 'market', notional: 500 });
  near(d.filled_qty, 2.5);
  assert.throws(() => t.place({ symbol: 'AAPL', side: 'buy', order_type: 'limit', notional: 500, limit_price: 150 }), /market buy orders/);
  assert.throws(() => t.place({ symbol: 'CHEAP', side: 'buy', order_type: 'market', qty: 10 }), /priced under \$1\.00/);

  t.game.max_position_pct = 25;
  t.game.allow_fractional = false;
  assert.throws(() => t.place({ symbol: 'AAPL', side: 'buy', order_type: 'market', qty: 200 }), /game limit for one stock is 25%/);
  const etf = t.place({ symbol: 'SPY', side: 'buy', order_type: 'market', qty: 60 }, { tradable: true, asset_type: 'etf' });
  assert.equal(etf.status, 'filled');
  assert.throws(() => t.place({ symbol: 'AAPL', side: 'buy', order_type: 'market', qty: 1.5 }), /whole number of shares/);
  assert.ok(new OrderError('x') instanceof Error);
});

test('paused and ended games block trading with the database wording', () => {
  const t = setup({ status: 'paused' });
  t.prices.AAPL = 200;
  assert.throws(() => t.place({ symbol: 'AAPL', side: 'buy', order_type: 'market', qty: 1 }), /Trading is paused/);
  t.game.status = 'ended';
  assert.throws(() => t.place({ symbol: 'AAPL', side: 'buy', order_type: 'market', qty: 1 }), /has ended/);
});

test('required lessons close trading until they are passed, with the database wording', () => {
  const locked = /Finish your required lessons before trading\. Open Learn to see what is left\./;
  const t = setup({ required_lessons: ['what-is-a-stock', 'order-types'] }, { 'what-is-a-stock': { score: 90, completed_at: '2026-10-12T13:00:00Z' } });
  t.prices.AAPL = 200;
  const buy = (u = t) => u.place({ symbol: 'AAPL', side: 'buy', order_type: 'market', qty: 1 });
  assert.throws(() => buy(), locked);
  t.progress['order-types'] = { score: 74, attempts: 1 };
  assert.throws(() => buy(), locked, 'a near miss does not count');
  t.progress['order-types'] = { score: 75, attempts: 2 };
  assert.equal(buy().status, 'filled', 'passing at exactly 75 opens trading');
  near(t.state.cash, 99800);

  const paused = setup({ required_lessons: ['order-types'], status: 'paused' });
  paused.prices.AAPL = 200;
  assert.throws(() => buy(paused), /Trading is paused/, 'the game status answers before the lessons check, as in place_order');

  const open = setup({ required_lessons: [] });
  open.prices.AAPL = 200;
  assert.equal(buy(open).status, 'filled', 'a game that requires nothing never locks');
  const older = setup();
  older.prices.AAPL = 200;
  assert.equal(older.game.required_lessons, undefined);
  assert.equal(buy(older).status, 'filled', 'nor does a game saved before required lessons existed');
});
