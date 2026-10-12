// Integration test for supabase/functions/market/index.ts.
// The function is compiled with esbuild and run in Node with:
//   * a fake Supabase client whose rpc() calls the real SQL functions in PGlite (as service_role)
//   * a mocked fetch() that answers like Alpaca and Finnhub
//   * a fixed clock (Monday 10:00 a.m. ET) shared by the function (setClock) and the database (app.now)
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { createDb } from '../sql/harness.mjs';
import { createFakeMarket, callRpc, loadMarketFunction } from '../support/market-fakes.mjs';

const MON_10AM = Date.parse('2026-10-12T14:00:00Z');
let nowMs = MON_10AM;

let h;
let mod;
let mentor;
let student;
const tokens = new Map();
const market = createFakeMarket({ now: () => nowMs });
const fetchLog = market.log;
const snap = market.snap;

function fakeClient() {
  return {
    rpc: async (fn, args) => {
      try {
        return { data: await callRpc(h, 'service', fn, args), error: null };
      } catch (e) {
        return { data: null, error: { message: e.message } };
      }
    },
    auth: {
      getUser: async (jwt) => (tokens.has(jwt)
        ? { data: { user: tokens.get(jwt) }, error: null }
        : { data: { user: null }, error: { message: 'invalid JWT' } })
    }
  };
}

async function call(body, { token, cron, method = 'POST', origin = 'https://gil1906.org' } = {}) {
  const headers = { 'content-type': 'application/json', origin };
  if (token) headers.authorization = `Bearer ${token}`;
  if (cron) headers['x-cron-secret'] = cron;
  const res = await mod.handle(new Request('https://fn.local/market', {
    method,
    headers,
    body: method === 'POST' ? JSON.stringify(body) : undefined
  }));
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch (_) {
    json = text;
  }
  return { status: res.status, body: json, headers: res.headers };
}

before(async () => {
  h = await createDb({ postgrestTypes: true });
  await h.setNow(new Date(MON_10AM).toISOString());

  mentor = await h.createUser({ email: 'mentor@example.org' });
  student = await h.createUser({ anon: true });
  await h.sql(`insert into public.mentors (user_id) values ($1)`, [mentor.id]);
  tokens.set('a.mentor.jwt', { id: mentor.id, email: mentor.email });
  tokens.set('a.student.jwt', { id: student.id, is_anonymous: true });

  globalThis.fetch = market.fetch;
  mod = await loadMarketFunction({
    env: {
      SUPABASE_URL: 'https://fake.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'service-key',
      ALPACA_KEY_ID: 'alpaca-key',
      ALPACA_SECRET_KEY: 'alpaca-secret',
      CRON_SECRET: 'cron-secret-for-tests',
      FINNHUB_API_KEY: 'finnhub-key'
    },
    client: fakeClient
  });
  mod.setClock(() => nowMs);
});

test('CORS preflight and method checks', async () => {
  const pre = await call(null, { method: 'OPTIONS' });
  assert.equal(pre.status, 200);
  assert.equal(pre.headers.get('access-control-allow-origin'), '*');
  const get = await call(null, { method: 'GET' });
  assert.equal(get.status, 405);
});

test('market data requires a signed-in user; refresh requires the cron secret', async () => {
  assert.equal((await call({ action: 'quotes', symbols: ['AAPL'] })).status, 401);
  assert.equal((await call({ action: 'quotes', symbols: ['AAPL'] }, { token: 'x.y.z' })).status, 401);
  assert.equal((await call({ action: 'refresh' })).status, 401);
  assert.equal((await call({ action: 'refresh' }, { cron: 'wrong' })).status, 401);
  assert.equal((await call({ action: 'sync' }, { token: 'a.student.jwt' })).status, 403);
});

test('scheduled refresh loads prices for featured symbols and runs the cycle', async () => {
  fetchLog.length = 0;
  const r = await call({ action: 'refresh' }, { cron: 'cron-secret-for-tests' });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.ok(r.body.refreshed >= 90, `refreshed ${r.body.refreshed}`);
  assert.equal(r.body.cycle.market.is_open, true);
  const snapCalls = fetchLog.filter((x) => x.includes('/v2/stocks/snapshots'));
  assert.equal(snapCalls.length, 1, 'one batched snapshot call');
  assert.ok(fetchLog.every((x) => !x.includes('/v2/assets')), 'no symbol sync while the market is open');
  const [q] = await h.sql(`select price, prev_close, trade_time from public.quotes where symbol = 'AAPL'`);
  assert.equal(Number(q.price), 200);
  assert.equal(Number(q.prev_close), 198);
  const [st] = await h.sql(`select value from public.app_status where key = 'last_refresh'`);
  assert.ok(st.value.count >= 90);
});

test('quotes action refreshes stale symbols and skips unknown ones', async () => {
  nowMs = MON_10AM + 2 * 60000;
  await h.setNow(new Date(nowMs).toISOString());
  fetchLog.length = 0;
  const r = await call({ action: 'quotes', symbols: ['aapl', 'NEWCO', 'bad symbol!'] }, { token: 'a.student.jwt' });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.deepEqual(Object.keys(r.body.quotes), ['AAPL']);
  assert.equal(r.body.market.is_open, true);
  assert.equal(fetchLog.length, 1);
  assert.match(fetchLog[0], /symbols=AAPL&/);
});

test('an invalid symbol in a batch is marked untradable and the batch retried', async () => {
  await h.rpc1('service', 'ingest_symbols', { p_rows: JSON.stringify([{ symbol: 'BADX', name: 'Delisted' }]) });
  nowMs += 2 * 60000;
  await h.setNow(new Date(nowMs).toISOString());
  const r = await call({ action: 'quotes', symbols: ['BADX', 'MSFT'] }, { token: 'a.student.jwt' });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.ok(r.body.quotes.MSFT);
  const [s] = await h.sql(`select tradable from public.symbols where symbol = 'BADX'`);
  assert.equal(s.tradable, false);
});

test('daily bars backfill once, exclude the unfinished session, then serve from the database', async () => {
  fetchLog.length = 0;
  const r = await call({ action: 'bars', symbol: 'AAPL', range: '1Y' }, { token: 'a.student.jwt' });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.intraday, false);
  assert.ok(r.body.bars.length > 240, `got ${r.body.bars.length} bars`);
  const last = r.body.bars[r.body.bars.length - 1];
  assert.equal(last.t, '2026-10-09', 'today is still trading, so the last stored bar is Friday');
  assert.equal(typeof last.c, 'number');
  assert.equal(fetchLog.filter((x) => x.includes('/v2/stocks/bars')).length, 1);
  assert.match(fetchLog[0], /feed=sip/);
  assert.match(fetchLog[0], /adjustment=split/);

  fetchLog.length = 0;
  const five = await call({ action: 'bars', symbol: 'AAPL', range: '5Y' }, { token: 'a.student.jwt' });
  assert.ok(five.body.bars.length > 1200);
  assert.equal(fetchLog.length, 0, 'served from the database');
});

test('intraday bars are trimmed to the regular session and cached', async () => {
  fetchLog.length = 0;
  const r = await call({ action: 'bars', symbol: 'AAPL', range: '1D' }, { token: 'a.student.jwt' });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.intraday, true);
  assert.ok(r.body.bars.length > 0);
  assert.ok(r.body.bars.every((b) => Date.parse(b.t) >= Date.parse('2026-10-12T13:30:00Z')), 'no pre-market bars');
  assert.match(fetchLog[0], /feed=iex/);
  const again = await call({ action: 'bars', symbol: 'AAPL', range: '1D' }, { token: 'a.student.jwt' });
  assert.equal(again.body.bars.length, r.body.bars.length);
  assert.equal(fetchLog.length, 1, 'second request served from cache');
});

test('news strips HTML, drops unsafe links, and caches', async () => {
  fetchLog.length = 0;
  const r = await call({ action: 'news', symbol: 'AAPL' }, { token: 'a.student.jwt' });
  assert.equal(r.status, 200);
  assert.equal(r.body.news.length, 1);
  assert.equal(r.body.news[0].headline, 'Apple unveils new chip');
  assert.equal(r.body.news[0].summary, 'Details & more');
  assert.equal(r.body.news[0].image, 'https://img.example.com/t.jpg');
  await call({ action: 'news', symbol: 'AAPL' }, { token: 'a.student.jwt' });
  assert.equal(fetchLog.length, 1);
});

test('profile combines curated info, stored bars, and Finnhub fundamentals', async () => {
  const r = await call({ action: 'profile', symbol: 'AAPL' }, { token: 'a.student.jwt' });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.symbol, 'AAPL');
  assert.match(r.body.blurb, /iPhone/);
  assert.equal(r.body.fundamentals.market_cap, 3e12);
  assert.equal(r.body.fundamentals.pe, 30.5);
  assert.ok(r.body.week52_high > 0, 'computed from stored bars');
  const unknown = await call({ action: 'profile', symbol: 'ZZZZ' }, { token: 'a.student.jwt' });
  assert.equal(unknown.status, 404);
});

test('mentor sync loads the calendar and the symbol list, skipping OTC', async () => {
  const r = await call({ action: 'sync' }, { token: 'a.mentor.jwt' });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.calendar, 2);
  const rows = await h.sql(`select symbol, name, asset_type, featured from public.symbols where symbol in ('NEWCO','OTCX','NEWETF','AAPL') order by symbol`);
  const by = Object.fromEntries(rows.map((x) => [x.symbol, x]));
  assert.equal(by.NEWCO.name, 'NewCo Inc.');
  assert.equal(by.NEWETF.asset_type, 'etf');
  assert.equal(by.OTCX, undefined);
  assert.equal(by.AAPL.name, 'Apple Inc.', 'curated names are kept');
  const q = await call({ action: 'quotes', symbols: ['NEWCO'] }, { token: 'a.student.jwt' });
  assert.equal(q.body.quotes.NEWCO.price, 12.5);
});

test('after the close, quotes use the session close timestamped at 4:00 p.m. ET', () => {
  const closed = { is_open: false, session_date: null, open_at: null, close_at: null, last_close_at: '2026-10-12T20:00:00Z', last_close_date: '2026-10-12', next_open_at: '2026-10-13T13:30:00Z' };
  const s = snap('AAPL');
  s.latestTrade.p = 201.5;
  const q = mod.snapshotToQuote('AAPL', s, closed);
  assert.equal(q.price, 200, 'uses the daily close, ignoring after-hours trades');
  assert.equal(q.trade_time, '2026-10-12T20:00:00.000Z');
  assert.equal(mod.etToUtc('2026-12-15', '16:00'), '2026-12-15T21:00:00.000Z', 'standard time');
  assert.equal(mod.etDate(Date.parse('2026-10-13T03:30:00Z')), '2026-10-12');
});

test('status reports connected services', async () => {
  const r = await call({ action: 'status' }, { token: 'a.mentor.jwt' });
  assert.equal(r.status, 200);
  assert.equal(r.body.alpaca_connected, true);
  assert.equal(r.body.finnhub_connected, true);
  assert.ok(r.body.symbols >= 97);
});
