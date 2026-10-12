// Simulated market for demo mode. Deterministic: every visitor sees the same prices at the same
// moment, with no server. Daily history follows the NYSE calendar; "today" trades around the
// clock so the demo can be explored at any hour. Stocks share a market factor, so they tend to
// rise and fall together the way real markets do.

import { UNIVERSE } from '../data/universe.js';
import { isTradingDay, addDaysIso } from '../lib/calendar.js';

const ANCHOR = '2026-10-01'; // each symbol closes at its curated demo price on this date
const HISTORY_START = '2021-06-01';
const MU = 0.07;
const MINUTES = 1440;

const RHO = {
  SPY: 0.99, VOO: 0.99, VTI: 0.98, DIA: 0.95, QQQ: 0.93, IWM: 0.86, SCHD: 0.86, VXUS: 0.72,
  XLK: 0.9, XLF: 0.85, XLV: 0.75, XLE: 0.6, BND: -0.15
};

const META = new Map(UNIVERSE.map((u) => [u.symbol, { base: u.demo[0], sigma: u.demo[1], rho: RHO[u.symbol] ?? 0.55 }]));

export function hasSymbol(sym) {
  return META.has(sym);
}

function hash32(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rand(seed) {
  let t = (seed + 0x6d2b79f5) >>> 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

function normal(key) {
  const s = hash32(key);
  const u1 = Math.max(rand(s), 1e-12);
  const u2 = rand(s ^ 0x9e3779b9);
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

const etDateFmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' });
const etClockFmt = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hourCycle: 'h23', hour: '2-digit', minute: '2-digit', second: '2-digit' });

export function etIso(ms) {
  return etDateFmt.format(new Date(ms));
}

function etSecondsOfDay(ms) {
  const parts = Object.fromEntries(etClockFmt.formatToParts(new Date(ms)).map((p) => [p.type, p.value]));
  return (+parts.hour % 24) * 3600 + +parts.minute * 60 + +parts.second;
}

/** Midnight ET (as epoch ms) for an ET calendar date. */
export function etMidnight(iso) {
  const guess = Date.parse(iso + 'T05:00:00Z');
  const secs = etSecondsOfDay(guess);
  return guess - (secs > 43200 ? secs - 86400 : secs) * 1000;
}

// ---------------------------------------------------------------- daily history

let dayCache = { today: null, days: [] };
function tradingDaysBefore(today) {
  if (dayCache.today === today) return dayCache.days;
  const days = [];
  for (let d = HISTORY_START; d < today; d = addDaysIso(d, 1)) if (isTradingDay(d)) days.push(d);
  dayCache = { today, days };
  closeCache.clear();
  return days;
}

function dailyReturn(sym, d, sigma, rho) {
  const sd = sigma / Math.sqrt(252);
  const m = normal('MKT|' + d);
  const e = normal(sym + '|' + d);
  return (MU - (sigma * sigma) / 2) / 252 + sd * (rho * m + Math.sqrt(Math.max(0, 1 - rho * rho)) * e);
}

const closeCache = new Map();
function closes(sym, today) {
  const key = sym + '|' + today;
  if (closeCache.has(key)) return closeCache.get(key);
  const meta = META.get(sym);
  const days = tradingDaysBefore(today);
  const logs = new Float64Array(days.length);
  let ai = days.indexOf(ANCHOR);
  if (ai < 0) ai = days.length - 1;
  logs[ai] = Math.log(meta.base);
  for (let i = ai + 1; i < days.length; i++) logs[i] = logs[i - 1] + dailyReturn(sym, days[i], meta.sigma, meta.rho);
  for (let i = ai - 1; i >= 0; i--) logs[i] = logs[i + 1] - dailyReturn(sym, days[i + 1], meta.sigma, meta.rho);
  const out = { days, values: Array.from(logs, (x) => Math.round(Math.exp(x) * 100) / 100) };
  closeCache.set(key, out);
  return out;
}

export function closeOn(sym, iso, nowMs = Date.now()) {
  const c = closes(sym, etIso(nowMs));
  let lo = 0;
  let hi = c.days.length - 1;
  let found = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (c.days[mid] <= iso) {
      found = mid;
      lo = mid + 1;
    } else hi = mid - 1;
  }
  return found >= 0 ? c.values[found] : c.values[0];
}

// ---------------------------------------------------------------- intraday paths

const mktCache = new Map();
function marketMinutes(date) {
  if (mktCache.has(date)) return mktCache.get(date);
  const a = new Float64Array(MINUTES + 1);
  for (let m = 1; m <= MINUTES; m++) a[m] = normal(`MKT|${date}|${m}`);
  mktCache.set(date, a);
  if (mktCache.size > 12) mktCache.delete(mktCache.keys().next().value);
  return a;
}

const pathCache = new Map();
/** Cumulative log moves for one symbol over one ET day, optionally bridged to end at a close. */
function dayPath(sym, date, prevClose, endClose = null) {
  const key = `${sym}|${date}|${endClose ?? 'live'}`;
  if (pathCache.has(key)) return pathCache.get(key);
  const meta = META.get(sym);
  const sd = meta.sigma / Math.sqrt(252);
  const sdm = sd / Math.sqrt(MINUTES);
  const drift = (MU - (meta.sigma * meta.sigma) / 2) / 252 / MINUTES;
  const rho = meta.rho;
  const ind = Math.sqrt(Math.max(0, 1 - rho * rho));
  const mkt = marketMinutes(date);
  const cum = new Float64Array(MINUTES + 1);
  cum[0] = sd * 0.25 * normal(`${sym}|gap|${date}`);
  for (let m = 1; m <= MINUTES; m++) {
    cum[m] = cum[m - 1] + drift + sdm * (rho * mkt[m] + ind * normal(`${sym}|${date}|${m}`));
  }
  if (endClose != null) {
    const target = Math.log(endClose / prevClose);
    const diff = cum[MINUTES] - target;
    for (let m = 0; m <= MINUTES; m++) cum[m] -= (m / MINUTES) * diff;
  }
  const out = { prev: prevClose, cum };
  pathCache.set(key, out);
  if (pathCache.size > 400) pathCache.delete(pathCache.keys().next().value);
  return out;
}

function priceAt(path, secondsOfDay) {
  const m = Math.min(MINUTES - 1, Math.floor(secondsOfDay / 60));
  const f = (secondsOfDay - m * 60) / 60;
  const lg = path.cum[m] + f * (path.cum[m + 1] - path.cum[m]);
  return path.prev * Math.exp(lg);
}

function todayInfo(sym, nowMs) {
  const today = etIso(nowMs);
  const c = closes(sym, today);
  const prev = c.values[c.values.length - 1];
  return { today, prev, path: dayPath(sym, today, prev) };
}

// ---------------------------------------------------------------- public API

export function quote(sym, nowMs = Date.now()) {
  if (!META.has(sym)) return null;
  const { prev, path } = todayInfo(sym, nowMs);
  const secs = etSecondsOfDay(nowMs);
  const price = Math.round(priceAt(path, secs) * 100) / 100;
  const upto = Math.min(MINUTES, Math.floor(secs / 60));
  let hi = -Infinity;
  let lo = Infinity;
  for (let m = 0; m <= upto; m++) {
    const v = path.prev * Math.exp(path.cum[m]);
    if (v > hi) hi = v;
    if (v < lo) lo = v;
  }
  hi = Math.max(hi, price);
  lo = Math.min(lo, price);
  const iso = new Date(nowMs).toISOString();
  const volSeed = rand(hash32(sym + '|vol'));
  return {
    symbol: sym,
    price,
    prev_close: prev,
    open: Math.round(prev * Math.exp(path.cum[0]) * 100) / 100,
    high: Math.round(hi * 100) / 100,
    low: Math.round(lo * 100) / 100,
    volume: Math.round((2e6 + volSeed * 4e7) * (secs / 86400)),
    trade_time: iso,
    updated_at: iso,
    source: 'demo'
  };
}

export function dailyBars(sym, fromIso, nowMs = Date.now()) {
  if (!META.has(sym)) return [];
  const meta = META.get(sym);
  const sd = meta.sigma / Math.sqrt(252);
  const c = closes(sym, etIso(nowMs));
  const out = [];
  const volSeed = rand(hash32(sym + '|vol'));
  for (let i = 1; i < c.days.length; i++) {
    const d = c.days[i];
    if (d < fromIso) continue;
    const prev = c.values[i - 1];
    const close = c.values[i];
    const o = prev * Math.exp(sd * 0.25 * normal(`${sym}|gap|${d}`));
    const h = Math.max(o, close) * Math.exp(Math.abs(normal(`${sym}|h|${d}`)) * sd * 0.35);
    const l = Math.min(o, close) / Math.exp(Math.abs(normal(`${sym}|l|${d}`)) * sd * 0.35);
    out.push({
      t: d,
      o: Math.round(o * 100) / 100,
      h: Math.round(h * 100) / 100,
      l: Math.round(l * 100) / 100,
      c: close,
      v: Math.round((2e6 + volSeed * 4e7) * (0.7 + 0.6 * rand(hash32(`${sym}|v|${d}`))))
    });
  }
  return out;
}

export function intradayBars(sym, range, nowMs = Date.now()) {
  if (!META.has(sym)) return [];
  const today = etIso(nowMs);
  const c = closes(sym, today);
  const step = range === '1D' ? 5 : 30;
  const out = [];
  const emit = (date, path, endSec) => {
    const midnight = etMidnight(date);
    for (let s = 0; s < endSec; s += step * 60) {
      const e = Math.min(endSec, s + step * 60);
      const o = priceAt(path, s);
      const cl = priceAt(path, Math.min(e, 86399));
      let hi = Math.max(o, cl);
      let lo = Math.min(o, cl);
      for (let m = Math.floor(s / 60); m <= Math.floor((e - 1) / 60); m++) {
        const v = path.prev * Math.exp(path.cum[m]);
        hi = Math.max(hi, v);
        lo = Math.min(lo, v);
      }
      out.push({ t: new Date(midnight + s * 1000).toISOString(), o: +o.toFixed(2), h: +hi.toFixed(2), l: +lo.toFixed(2), c: +cl.toFixed(2), v: null });
    }
  };
  if (range === '1W') {
    const n = c.days.length;
    for (let k = Math.max(1, n - 4); k < n; k++) {
      emit(c.days[k], dayPath(sym, c.days[k], c.values[k - 1], c.values[k]), 86400);
    }
  }
  const { path } = todayInfo(sym, nowMs);
  emit(today, path, Math.max(60, etSecondsOfDay(nowMs)));
  return out;
}

export function week52(sym, nowMs = Date.now()) {
  const c = closes(sym, etIso(nowMs));
  const vals = c.values.slice(-252);
  const q = quote(sym, nowMs);
  return { high: Math.max(...vals, q.price), low: Math.min(...vals, q.price) };
}

export function lastTradingDayBefore(iso, nowMs = Date.now()) {
  const days = tradingDaysBefore(etIso(nowMs));
  for (let i = days.length - 1; i >= 0; i--) if (days[i] < iso) return days[i];
  return days[0];
}

export function tradingDaysBetween(fromIso, toIso, nowMs = Date.now()) {
  return tradingDaysBefore(etIso(nowMs)).filter((d) => d >= fromIso && d <= toIso);
}
