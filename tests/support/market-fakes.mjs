// Test doubles shared by the edge-function test and the live-mode browser test:
// a fetch() that answers like Alpaca and Finnhub, and a bundler that loads the real
// supabase/functions/market/index.ts in Node with a fake Supabase client.
import { build } from 'esbuild';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

export function createFakeMarket({ now }) {
  const prices = { AAPL: 200, SPY: 600, MSFT: 400, NEWCO: 12.5 };
  const log = [];
  const price = (sym) => prices[sym] ?? 50;
  const ok = (body) => new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });

  const snap = (sym) => {
    const p = price(sym);
    const t = now();
    return {
      latestTrade: { t: new Date(t - 5000).toISOString(), x: 'V', p, s: 100, c: ['@'], i: 1, z: 'C' },
      latestQuote: { t: new Date(t - 4000).toISOString(), ax: 'V', ap: p + 0.02, as: 1, bx: 'V', bp: p - 0.02, bs: 1, c: ['R'] },
      minuteBar: { t: '2026-10-12T13:59:00Z', o: p, h: p, l: p, c: p, v: 1000 },
      dailyBar: { t: '2026-10-12T04:00:00Z', o: p - 1, h: p + 1, l: p - 2, c: p, v: 50000 },
      prevDailyBar: { t: '2026-10-09T04:00:00Z', o: p - 3, h: p, l: p - 4, c: p - 2, v: 900000 }
    };
  };

  const dailyBars = (sym, start, end) => {
    const out = [];
    const d = new Date(start.slice(0, 10) + 'T04:00:00Z');
    const last = Date.parse(end);
    let i = 0;
    while (d.getTime() <= last) {
      const dow = d.getUTCDay();
      if (dow !== 0 && dow !== 6) {
        const c = price(sym) * (0.7 + 0.3 * (i / 1300)) * (1 + 0.01 * Math.sin(i / 3));
        out.push({ t: d.toISOString(), o: c, h: c * 1.01, l: c * 0.99, c, v: 1000000, n: 10, vw: c });
        i++;
      }
      d.setUTCDate(d.getUTCDate() + 1);
    }
    return out;
  };

  const intraday = (sym, start, end, minutes) => {
    const out = [];
    for (let t = Date.parse(start) - 60 * 60000, k = 0; t <= Date.parse(end); t += minutes * 60000, k++) {
      const p = price(sym) * (1 + 0.004 * Math.sin(k / 2));
      out.push({ t: new Date(t).toISOString(), o: p, h: p, l: p, c: p, v: 100 });
    }
    return out;
  };

  async function fetchFn(url) {
    const u = new URL(String(url));
    log.push(`${u.hostname}${u.pathname}?${u.searchParams.toString()}`);
    if (u.hostname === 'data.alpaca.markets') {
      if (u.pathname === '/v2/stocks/snapshots') {
        const syms = u.searchParams.get('symbols').split(',');
        if (syms.includes('BADX')) {
          return new Response(JSON.stringify({ code: 40010001, message: 'invalid symbol: BADX' }), { status: 400 });
        }
        return ok(Object.fromEntries(syms.map((s) => [s, snap(s)])));
      }
      if (u.pathname === '/v2/stocks/bars') {
        const sym = u.searchParams.get('symbols');
        const tf = u.searchParams.get('timeframe');
        const start = u.searchParams.get('start');
        const end = u.searchParams.get('end');
        const list = tf === '1Day' ? dailyBars(sym, start, end) : intraday(sym, start, end, tf === '5Min' ? 5 : 30);
        return ok({ bars: { [sym]: list }, next_page_token: null });
      }
      if (u.pathname === '/v1beta1/news') {
        return ok({
          news: [
            { id: 1, headline: '<b>Apple</b> unveils new chip', summary: '<p>Details &amp; more</p>', url: 'https://example.com/apple', source: 'benzinga', created_at: '2026-10-12T12:00:00Z', symbols: ['AAPL'], images: [{ size: 'thumb', url: 'https://img.example.com/t.jpg' }] },
            { id: 2, headline: 'Bad link', summary: '', url: 'javascript:alert(1)', source: 'x', created_at: '2026-10-12T11:00:00Z', symbols: ['AAPL'], images: [] }
          ],
          next_page_token: null
        });
      }
    }
    if (u.hostname === 'paper-api.alpaca.markets') {
      if (u.pathname === '/v2/calendar') {
        return ok([
          { date: '2026-10-12', open: '09:30', close: '16:00', session_open: '0400', session_close: '2000' },
          { date: '2026-10-13', open: '09:30', close: '16:00', session_open: '0400', session_close: '2000' }
        ]);
      }
      if (u.pathname === '/v2/assets') {
        return ok([
          { symbol: 'NEWCO', name: 'NewCo Inc. Class A Common Stock', exchange: 'NASDAQ', tradable: true, status: 'active' },
          { symbol: 'OTCX', name: 'Pink Sheet Co', exchange: 'OTC', tradable: true, status: 'active' },
          { symbol: 'NEWETF', name: 'Sample Equal Weight ETF', exchange: 'ARCA', tradable: true, status: 'active' },
          { symbol: 'AAPL', name: 'Apple Inc. Common Stock', exchange: 'NASDAQ', tradable: true, status: 'active' }
        ]);
      }
    }
    if (u.hostname === 'finnhub.io') {
      if (u.pathname === '/api/v1/stock/profile2') {
        return ok({ logo: 'https://static.finnhub.io/logo/aapl.png', finnhubIndustry: 'Technology', marketCapitalization: 3000000, weburl: 'https://www.apple.com/', ipo: '1980-12-12', shareOutstanding: 15000, country: 'US' });
      }
      if (u.pathname === '/api/v1/stock/metric') {
        return ok({ metric: { peTTM: 30.5, epsTTM: 6.5, dividendYieldIndicatedAnnual: 0.45, beta: 1.2, '52WeekHigh': 260, '52WeekLow': 170 } });
      }
    }
    return new Response('not found', { status: 404 });
  }

  return { fetch: fetchFn, prices, log, snap };
}

/** Calls a public SQL function the way the Data API would, returning JSON-shaped data. */
export async function callRpc(h, who, fn, args = {}) {
  const [meta] = await h.sql(
    `select p.proretset, t.typtype, p.prorettype::regtype::text as rt
     from pg_proc p join pg_namespace n on n.oid = p.pronamespace join pg_type t on t.oid = p.prorettype
     where n.nspname = 'public' and p.proname = $1`, [fn]);
  if (!meta) {
    const e = new Error(`Could not find the function public.${fn} in the schema cache`);
    e.code = 'PGRST202';
    throw e;
  }
  const keys = Object.keys(args || {});
  const argSql = keys.map((k, i) => `${k} => $${i + 1}`).join(', ');
  const vals = keys.map((k) => {
    const v = args[k];
    if (v && typeof v === 'object' && !(Array.isArray(v) && v.every((x) => typeof x === 'string'))) return JSON.stringify(v);
    return v;
  });
  return h.as(who, async (db) => {
    if (meta.typtype === 'c' || meta.rt === 'record') {
      const r = await db.query(`select * from public.${fn}(${argSql})`, vals);
      return JSON.parse(JSON.stringify(meta.proretset ? r.rows : r.rows[0] ?? null));
    }
    const r = await db.query(`select public.${fn}(${argSql}) as v`, vals);
    const out = meta.proretset ? r.rows.map((x) => x.v) : r.rows[0]?.v ?? null;
    return JSON.parse(JSON.stringify(out ?? null));
  });
}

/** Bundles and imports the market edge function with Deno and the Supabase client stubbed. */
export async function loadMarketFunction({ env, client }) {
  globalThis.__fakeSupabase = client;
  globalThis.Deno = { env: { get: (k) => env[k] }, serve: () => {} };
  const out = mkdtempSync(join(tmpdir(), 'market-fn-'));
  const result = await build({
    entryPoints: [join(root, 'supabase/functions/market/index.ts')],
    bundle: true,
    format: 'esm',
    platform: 'neutral',
    write: false,
    plugins: [{
      name: 'supabase-stub',
      setup(b) {
        b.onResolve({ filter: /^npm:@supabase\/supabase-js/ }, () => ({ path: 'stub', namespace: 'stub' }));
        b.onLoad({ filter: /.*/, namespace: 'stub' }, () => ({
          contents: 'export function createClient() { return globalThis.__fakeSupabase(); }',
          loader: 'js'
        }));
      }
    }]
  });
  const file = join(out, `market-${Date.now()}.mjs`);
  writeFileSync(file, result.outputFiles[0].text);
  return import(pathToFileURL(file).href);
}
