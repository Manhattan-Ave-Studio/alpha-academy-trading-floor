// Alpha Academy Trading Floor: market data edge function.
//
// One function, several actions (POST JSON {action, ...}):
//   quotes   {symbols: string[]}       fresh quotes for symbols on screen (signed-in users)
//   bars     {symbol, range}            chart data: 1D, 1W (intraday) or 1Y, 5Y (daily)
//   news     {symbol?}                  recent headlines
//   profile  {symbol}                   company details and key stats
//   status   {}                         data pipeline health (signed-in users)
//   refresh  {}                         every minute from pg_cron: prices, fills, expiries, snapshots
//   sync     {}                         symbol list and market calendar (cron weekly, or a mentor)
//
// Secrets (Edge Functions > Secrets):
//   ALPACA_KEY_ID, ALPACA_SECRET_KEY   free Alpaca paper account keys (required for live prices)
//   CRON_SECRET                        long random string, also stored in Vault for the cron job
//   FINNHUB_API_KEY                    optional: logos, market cap, P/E, dividend yield
//   ALPACA_FEED                        optional: iex (default, real time) or delayed_sip
//   ALLOWED_ORIGINS                    optional: comma-separated site origins for CORS (default *)
//
// Deploy with JWT verification off (the function checks callers itself):
//   supabase functions deploy market --no-verify-jwt

import { createClient } from 'npm:@supabase/supabase-js@2';

const ALPACA_DATA = 'https://data.alpaca.markets';
const ALPACA_TRADING = Deno.env.get('ALPACA_TRADING_URL') ?? 'https://paper-api.alpaca.markets';
const FINNHUB_BASE = 'https://finnhub.io/api/v1';
const FEED = Deno.env.get('ALPACA_FEED') ?? 'iex';
const ALPACA_KEY = Deno.env.get('ALPACA_KEY_ID') ?? '';
const ALPACA_SECRET = Deno.env.get('ALPACA_SECRET_KEY') ?? '';
const FINNHUB_KEY = Deno.env.get('FINNHUB_API_KEY') ?? '';
const CRON_SECRET = Deno.env.get('CRON_SECRET') ?? '';
const ALLOWED_ORIGINS = (Deno.env.get('ALLOWED_ORIGINS') ?? '*').split(',').map((s) => s.trim()).filter(Boolean);
const EXCHANGES = new Set(['NYSE', 'NASDAQ', 'ARCA', 'AMEX', 'BATS']);
const SYMBOL_RE = /^[A-Z][A-Z0-9.\-]{0,9}$/;

// deno-lint-ignore no-explicit-any
type Json = any;

// Clock in milliseconds. Tests replace it with setClock(); production uses the system time.
let clock: () => number = () => Date.now();
export function setClock(fn: () => number) {
  clock = fn;
}

class PublicError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

function adminKey(): string {
  const dict = Deno.env.get('SUPABASE_SECRET_KEYS');
  if (dict) {
    try {
      const keys = JSON.parse(dict);
      const k = keys.default ?? Object.values(keys)[0];
      if (typeof k === 'string' && k) return k;
    } catch (_) {
      // fall through to the legacy key
    }
  }
  return Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
}

const admin = createClient(Deno.env.get('SUPABASE_URL') ?? '', adminKey(), {
  auth: { persistSession: false, autoRefreshToken: false }
});

async function rpc(fn: string, args: Record<string, unknown> = {}): Promise<Json> {
  const { data, error } = await admin.rpc(fn, args);
  if (error) throw new Error(`${fn}: ${error.message}`);
  return data;
}

// ---------------------------------------------------------------------------
// Time helpers (U.S. Eastern)
// ---------------------------------------------------------------------------

function zoneParts(ms: number) {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  });
  const p: Record<string, string> = {};
  for (const part of dtf.formatToParts(new Date(ms))) p[part.type] = part.value;
  return p;
}

export function etDate(ms: number): string {
  const p = zoneParts(ms);
  return `${p.year}-${p.month}-${p.day}`;
}

export function etToUtc(date: string, time: string): string {
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  const p = zoneParts(guess);
  const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  const offsetMin = (asUtc - guess) / 60000;
  return new Date(guess - offsetMin * 60000).toISOString();
}

function addDays(date: string, days: number): string {
  const t = Date.parse(date + 'T12:00:00Z') + days * 86400000;
  return new Date(t).toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// HTTP helpers
// ---------------------------------------------------------------------------

function corsHeaders(origin: string): Record<string, string> {
  const allow = ALLOWED_ORIGINS.includes('*') ? '*' : (ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0] ?? '');
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin'
  };
}

function json(body: Json, status: number, cors: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
  });
}

function safeEqual(a: string, b: string): boolean {
  if (!a || !b || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function cleanSymbol(s: unknown): string {
  const v = String(s ?? '').trim().toUpperCase();
  if (!SYMBOL_RE.test(v)) throw new PublicError('That is not a valid ticker symbol.');
  return v;
}

function cleanSymbols(list: unknown, max: number): string[] {
  if (!Array.isArray(list)) return [];
  const out = new Set<string>();
  for (const s of list) {
    const v = String(s ?? '').trim().toUpperCase();
    if (SYMBOL_RE.test(v)) out.add(v);
    if (out.size >= max) break;
  }
  return [...out];
}

function stripHtml(s: unknown): string {
  return String(s ?? '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim();
}

async function getUser(req: Request) {
  const jwt = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '').trim();
  if (!jwt || jwt.split('.').length !== 3) return null;
  const { data, error } = await admin.auth.getUser(jwt);
  if (error || !data?.user) return null;
  return data.user;
}

// ---------------------------------------------------------------------------
// Providers
// ---------------------------------------------------------------------------

async function alpaca(path: string, params: Record<string, string>, base = ALPACA_DATA): Promise<Json> {
  if (!ALPACA_KEY || !ALPACA_SECRET) {
    throw new PublicError('Live market data is not connected yet. Ask your mentor to add the Alpaca keys.', 503);
  }
  const url = new URL(path, base);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url, {
    headers: { 'APCA-API-KEY-ID': ALPACA_KEY, 'APCA-API-SECRET-KEY': ALPACA_SECRET, accept: 'application/json' }
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`alpaca ${res.status} ${url.pathname}: ${text.slice(0, 300)}`);
  }
  return res.json();
}

async function finnhub(path: string, params: Record<string, string>): Promise<Json> {
  const url = new URL(FINNHUB_BASE + path);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set('token', FINNHUB_KEY);
  const res = await fetch(url, { headers: { accept: 'application/json' } });
  if (!res.ok) {
    console.warn('finnhub', res.status, path);
    return null;
  }
  return res.json();
}

async function alpacaBars(symbol: string, params: Record<string, string>): Promise<Json[]> {
  const out: Json[] = [];
  let token = '';
  for (let i = 0; i < 10; i++) {
    const q: Record<string, string> = { symbols: symbol, limit: '10000', sort: 'asc', ...params };
    if (token) q.page_token = token;
    const res = await alpaca('/v2/stocks/bars', q);
    out.push(...(res?.bars?.[symbol] ?? []));
    token = res?.next_page_token ?? '';
    if (!token) break;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Quotes
// ---------------------------------------------------------------------------

type Market = {
  is_open: boolean;
  session_date: string | null;
  open_at: string | null;
  close_at: string | null;
  last_close_at: string | null;
  last_close_date: string | null;
  next_open_at: string | null;
};

async function marketState(): Promise<Market> {
  return await rpc('market_status');
}

export function snapshotToQuote(symbol: string, s: Json, market: Market) {
  if (!s) return null;
  const trade = s.latestTrade;
  const daily = s.dailyBar;
  const prev = s.prevDailyBar;
  const quote = s.latestQuote;
  const dailyDate = daily?.t ? etDate(Date.parse(daily.t)) : null;
  const dailyIsToday = !!(market.is_open && dailyDate && dailyDate === market.session_date);

  let price: number | null = null;
  let tradeTime: string | null = null;
  if (market.is_open && trade?.p > 0) {
    price = trade.p;
    tradeTime = trade.t;
  } else if (daily?.c > 0) {
    // Market closed: use the session close, timestamped at that session's 4:00 p.m.
    price = daily.c;
    tradeTime = dailyDate ? etToUtc(dailyDate, '16:00') : daily.t;
  } else if (trade?.p > 0) {
    price = trade.p;
    tradeTime = trade.t;
  }
  if (!(price && price > 0)) return null;

  let prevClose = prev?.c ?? null;
  if (market.is_open && daily && !dailyIsToday) prevClose = daily.c;

  return {
    symbol,
    price,
    prev_close: prevClose,
    open: market.is_open && !dailyIsToday ? null : daily?.o ?? null,
    high: market.is_open && !dailyIsToday ? null : daily?.h ?? null,
    low: market.is_open && !dailyIsToday ? null : daily?.l ?? null,
    volume: market.is_open && !dailyIsToday ? null : daily?.v ?? null,
    bid: quote?.bp > 0 ? quote.bp : null,
    ask: quote?.ap > 0 ? quote.ap : null,
    trade_time: tradeTime,
    source: `alpaca-${FEED}`
  };
}

async function refreshSymbols(symbols: string[], market: Market): Promise<number> {
  let total = 0;
  for (let i = 0; i < symbols.length; i += 200) {
    let list = symbols.slice(i, i + 200);
    for (let attempt = 0; attempt < 5 && list.length; attempt++) {
      try {
        const res = await alpaca('/v2/stocks/snapshots', { symbols: list.join(','), feed: FEED });
        const map = res?.snapshots ?? res ?? {};
        const rows = Object.entries(map)
          .map(([sym, snap]) => snapshotToQuote(sym, snap, market))
          .filter(Boolean);
        if (rows.length) total += await rpc('ingest_quotes', { p_rows: rows });
        break;
      } catch (e) {
        const bad = /invalid symbol:?\s*([A-Za-z0-9.\-]+)/i.exec(String((e as Error)?.message ?? ''))?.[1]?.toUpperCase();
        if (!bad || !list.includes(bad)) throw e;
        await rpc('svc_mark_untradable', { p_symbol: bad });
        list = list.filter((s) => s !== bad);
      }
    }
  }
  return total;
}

async function quotes(body: Json) {
  const symbols = cleanSymbols(body.symbols, 50);
  const market = await marketState();
  if (!symbols.length) return { quotes: {}, market };

  const rows: Json[] = (await rpc('svc_get_quotes', { p_symbols: symbols })) ?? [];
  const bySym = new Map(rows.map((r) => [r.symbol, r]));
  const now = clock();
  const lastClose = market.last_close_at ? Date.parse(market.last_close_at) : 0;
  const stale = symbols.filter((s) => {
    const r = bySym.get(s);
    if (!r) return true;
    const updated = Date.parse(r.updated_at);
    if (market.is_open) return now - updated > 60_000;
    return updated < lastClose + 5 * 60_000 && now - updated > 10 * 60_000;
  });

  if (stale.length && ALPACA_KEY) {
    const valid: string[] = (await rpc('svc_existing_symbols', { p_symbols: stale })) ?? [];
    if (valid.length) await refreshSymbols(valid, market);
  }
  await rpc('touch_symbols', { p_symbols: symbols });
  const fresh: Json[] = (await rpc('svc_get_quotes', { p_symbols: symbols })) ?? [];
  return { quotes: Object.fromEntries(fresh.map((r) => [r.symbol, r])), market };
}

// ---------------------------------------------------------------------------
// Bars
// ---------------------------------------------------------------------------

async function ensureDailyBars(symbol: string, market: Market) {
  const recent = await rpc('svc_cache_get', { p_key: `bars-sync:${symbol}`, p_max_age_seconds: 1800 });
  if (recent) return;
  const cov = await rpc('svc_bar_coverage', { p_symbol: symbol });
  const today = etDate(clock());
  let start: string | null = null;
  if (!cov?.count) start = addDays(today, -(365 * 5 + 10));
  else if (market.last_close_date && cov.last < market.last_close_date) start = addDays(cov.last, 1);
  if (!start) return;

  const end = new Date(clock() - 16 * 60_000).toISOString();
  const bars = await alpacaBars(symbol, { timeframe: '1Day', start, end, adjustment: 'split', feed: 'sip' });
  const closeSettled = market.last_close_at ? clock() >= Date.parse(market.last_close_at) + 20 * 60_000 : false;
  const rows = bars
    .map((b) => ({ d: etDate(Date.parse(b.t)), o: b.o, h: b.h, l: b.l, c: b.c, v: b.v }))
    .filter((r) => r.d < today || (r.d === market.last_close_date && closeSettled));
  if (rows.length) await rpc('ingest_daily_bars', { p_symbol: symbol, p_rows: rows });
  await rpc('svc_cache_put', { p_key: `bars-sync:${symbol}`, p_payload: { at: new Date(clock()).toISOString(), rows: rows.length } });
}

async function intradayBars(symbol: string, range: '1D' | '1W', market: Market) {
  const key = `bars:${range}:${symbol}`;
  const cached = await rpc('svc_cache_get', { p_key: key, p_max_age_seconds: market.is_open ? 60 : 1800 });
  if (cached) return cached;

  const today = etDate(clock());
  const sessions: Json[] = (await rpc('svc_sessions', { p_from: addDays(today, -12), p_to: today })) ?? [];
  const started = sessions.filter((s) => Date.parse(s.open_at) <= clock());
  const pick = range === '1D' ? started.slice(-1) : started.slice(-5);
  if (!pick.length) return [];

  const bars = await alpacaBars(symbol, {
    timeframe: range === '1D' ? '5Min' : '30Min',
    start: new Date(Date.parse(pick[0].open_at)).toISOString(),
    end: new Date(clock()).toISOString(),
    feed: 'iex'
  });
  const out = bars
    .filter((b) => {
      const t = Date.parse(b.t);
      return pick.some((s) => t >= Date.parse(s.open_at) && t < Date.parse(s.close_at));
    })
    .map((b) => ({ t: b.t, o: b.o, h: b.h, l: b.l, c: b.c, v: b.v }));
  await rpc('svc_cache_put', { p_key: key, p_payload: out });
  return out;
}

async function bars(body: Json) {
  const symbol = cleanSymbol(body.symbol);
  const range = String(body.range ?? '1Y').toUpperCase();
  const market = await marketState();
  if (range === '1D' || range === '1W') {
    return { symbol, range, intraday: true, bars: await intradayBars(symbol, range, market) };
  }
  if (range !== '1Y' && range !== '5Y') throw new PublicError('Range must be 1D, 1W, 1Y, or 5Y.');
  const exists: string[] = (await rpc('svc_existing_symbols', { p_symbols: [symbol] })) ?? [];
  if (!exists.length) throw new PublicError('Unknown symbol.', 404);
  await ensureDailyBars(symbol, market);
  const from = addDays(etDate(clock()), range === '5Y' ? -(365 * 5 + 5) : -372);
  const rows: Json[] = (await rpc('svc_bars', { p_symbol: symbol, p_from: from })) ?? [];
  return {
    symbol,
    range,
    intraday: false,
    bars: rows.map((r) => ({ t: r.d, o: num(r.o), h: num(r.h), l: num(r.l), c: num(r.c), v: r.v == null ? null : Number(r.v) }))
  };
}

function num(x: unknown): number | null {
  return x == null ? null : Number(x);
}

// ---------------------------------------------------------------------------
// News and profile
// ---------------------------------------------------------------------------

async function news(body: Json) {
  const symbol = body.symbol ? cleanSymbol(body.symbol) : '';
  const key = `news:${symbol || 'market'}`;
  const cached = await rpc('svc_cache_get', { p_key: key, p_max_age_seconds: 900 });
  if (cached) return { news: cached };
  const params: Record<string, string> = { limit: '12', sort: 'desc', exclude_contentless: 'true' };
  if (symbol) params.symbols = symbol;
  const res = await alpaca('/v1beta1/news', params);
  const items = (res?.news ?? [])
    .filter((n: Json) => typeof n.url === 'string' && /^https:\/\//i.test(n.url))
    .map((n: Json) => {
      const img = (n.images ?? []).find((i: Json) => i.size === 'thumb') ?? (n.images ?? []).find((i: Json) => i.size === 'small');
      return {
        id: n.id,
        headline: stripHtml(n.headline).slice(0, 220),
        summary: stripHtml(n.summary).slice(0, 320),
        url: n.url,
        source: stripHtml(n.source),
        created_at: n.created_at,
        symbols: (n.symbols ?? []).slice(0, 6),
        image: img && /^https:\/\//i.test(img.url) ? img.url : null
      };
    });
  await rpc('svc_cache_put', { p_key: key, p_payload: items });
  return { news: items };
}

async function profile(body: Json) {
  const symbol = cleanSymbol(body.symbol);
  const info = await rpc('svc_symbol_info', { p_symbol: symbol });
  if (!info) throw new PublicError('Unknown symbol.', 404);

  let fundamentals: Json = null;
  if (FINNHUB_KEY) {
    const key = `profile:${symbol}`;
    fundamentals = await rpc('svc_cache_get', { p_key: key, p_max_age_seconds: 86400 });
    if (!fundamentals) {
      const [p2, m] = await Promise.all([
        finnhub('/stock/profile2', { symbol }),
        info.asset_type === 'stock' ? finnhub('/stock/metric', { symbol, metric: 'all' }) : Promise.resolve(null)
      ]);
      const metric = m?.metric ?? {};
      fundamentals = {
        logo: typeof p2?.logo === 'string' && /^https:\/\//.test(p2.logo) ? p2.logo : null,
        industry: p2?.finnhubIndustry || null,
        website: typeof p2?.weburl === 'string' && /^https?:\/\//.test(p2.weburl) ? p2.weburl : null,
        ipo: p2?.ipo || null,
        country: p2?.country || null,
        market_cap: p2?.marketCapitalization ? p2.marketCapitalization * 1e6 : null,
        shares_outstanding: p2?.shareOutstanding ? p2.shareOutstanding * 1e6 : null,
        pe: metric.peTTM ?? metric.peBasicExclExtraTTM ?? null,
        eps: metric.epsTTM ?? metric.epsBasicExclExtraItemsTTM ?? null,
        dividend_yield: metric.dividendYieldIndicatedAnnual ?? metric.currentDividendYieldTTM ?? null,
        beta: metric.beta ?? null,
        week52_high: metric['52WeekHigh'] ?? null,
        week52_low: metric['52WeekLow'] ?? null
      };
      if (p2 || m) await rpc('svc_cache_put', { p_key: key, p_payload: fundamentals });
    }
  }
  return { ...info, fundamentals };
}

// ---------------------------------------------------------------------------
// Scheduled work
// ---------------------------------------------------------------------------

async function refresh() {
  const started = clock();
  const market = await marketState();
  const now = clock();
  const lastClose = market.last_close_at ? Date.parse(market.last_close_at) : 0;
  const nextOpen = market.next_open_at ? Date.parse(market.next_open_at) : Number.POSITIVE_INFINITY;
  const inWindow = market.is_open || now - lastClose < 25 * 60_000 || nextOpen - now < 2 * 60_000;

  let refreshed = 0;
  let error: string | null = null;
  if (inWindow && ALPACA_KEY) {
    try {
      const symbols: string[] = (await rpc('active_symbols', { p_limit: 600 })) ?? [];
      refreshed = await refreshSymbols(symbols, market);
      await rpc('set_app_status', {
        p_key: 'last_refresh',
        p_value: { at: new Date(clock()).toISOString(), source: `alpaca-${FEED}`, count: refreshed }
      });
    } catch (e) {
      error = String((e as Error)?.message ?? e);
      console.error('refresh', error);
    }
  }

  // The cycle runs every minute even without new prices: expiries, game ends, snapshots.
  const cycle = await rpc('run_market_cycle');

  // Keep the calendar and symbol list current (weekly), without blocking the minute job for long.
  const lastSync = await rpc('svc_cache_get', { p_key: 'sync-marker', p_max_age_seconds: 7 * 86400 });
  if (!lastSync && ALPACA_KEY && !market.is_open) {
    try {
      await sync();
    } catch (e) {
      console.error('sync', e);
    }
  }
  return { refreshed, error, cycle, ms: clock() - started };
}

function cleanAssetName(name: string): string {
  return String(name ?? '')
    .replace(/\s+(Class [A-Z]\s+)?(Common Stock|Ordinary Shares|Common Shares|Capital Stock)(\s*\(.*\))?$/i, '')
    .replace(/\s+American Depositary Shares.*$/i, '')
    .trim();
}

function guessType(a: Json): 'etf' | 'stock' {
  const n = String(a.name ?? '');
  return /\b(ETF|ETN)\b|iShares|SPDR|Vanguard .*(Index|Fund)|Invesco QQQ|ProShares|Direxion|Select Sector/i.test(n) ? 'etf' : 'stock';
}

async function sync() {
  const today = etDate(clock());
  const cal = await alpaca('/v2/calendar', { start: addDays(today, -7), end: addDays(today, 400) }, ALPACA_TRADING);
  const calRows = (Array.isArray(cal) ? cal : []).map((c: Json) => ({ date: c.date, open: c.open, close: c.close }));
  const calendar = calRows.length ? await rpc('ingest_calendar', { p_rows: calRows }) : 0;

  const assets = await alpaca('/v2/assets', { status: 'active', asset_class: 'us_equity' }, ALPACA_TRADING);
  const rows = (Array.isArray(assets) ? assets : [])
    .filter((a: Json) => a.tradable && EXCHANGES.has(a.exchange) && SYMBOL_RE.test(a.symbol))
    .map((a: Json) => ({ symbol: a.symbol, name: cleanAssetName(a.name) || a.symbol, exchange: a.exchange, asset_type: guessType(a), tradable: true }));
  let symbols = 0;
  for (let i = 0; i < rows.length; i += 1000) {
    symbols += await rpc('ingest_symbols', { p_rows: rows.slice(i, i + 1000) });
  }
  const result = { at: new Date(clock()).toISOString(), calendar, symbols };
  await rpc('set_app_status', { p_key: 'last_sync', p_value: result });
  await rpc('svc_cache_put', { p_key: 'sync-marker', p_payload: result });
  return result;
}

async function status() {
  const s = await rpc('svc_status');
  return {
    ...s,
    alpaca_connected: !!(ALPACA_KEY && ALPACA_SECRET),
    finnhub_connected: !!FINNHUB_KEY,
    cron_secret_set: !!CRON_SECRET,
    feed: FEED,
    market: await marketState()
  };
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

export async function handle(req: Request): Promise<Response> {
  const cors = corsHeaders(req.headers.get('origin') ?? '');
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Use POST.' }, 405, cors);

  let body: Json = {};
  try {
    body = await req.json();
  } catch (_) {
    return json({ error: 'Send a JSON body.' }, 400, cors);
  }
  const action = String(body?.action ?? '');

  try {
    const fromCron = safeEqual(req.headers.get('x-cron-secret') ?? '', CRON_SECRET);
    if (action === 'refresh') {
      if (!fromCron) return json({ error: 'Not allowed.' }, 401, cors);
      return json(await refresh(), 200, cors);
    }
    if (action === 'sync') {
      if (!fromCron) {
        const user = await getUser(req);
        if (!user || !(await rpc('svc_is_mentor', { p_user: user.id }))) {
          return json({ error: 'Mentor access is required.' }, 403, cors);
        }
      }
      return json(await sync(), 200, cors);
    }

    const user = await getUser(req);
    if (!user) return json({ error: 'Sign in first.' }, 401, cors);
    switch (action) {
      case 'quotes':
        return json(await quotes(body), 200, cors);
      case 'bars':
        return json(await bars(body), 200, cors);
      case 'news':
        return json(await news(body), 200, cors);
      case 'profile':
        return json(await profile(body), 200, cors);
      case 'status':
        return json(await status(), 200, cors);
      default:
        return json({ error: 'Unknown action.' }, 400, cors);
    }
  } catch (e) {
    if (e instanceof PublicError) return json({ error: e.message }, e.status, cors);
    console.error(action, e);
    return json({ error: 'Market data is unavailable right now. Try again in a minute.' }, 502, cors);
  }
}

Deno.serve(handle);
