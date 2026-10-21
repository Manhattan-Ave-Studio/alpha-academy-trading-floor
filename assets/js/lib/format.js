// Number, money, percent, and Eastern-time formatting.

const usd2 = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 });
const usd0 = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const plain = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });
const MINUS = '−';

const isNum = (v) => v != null && v !== '' && Number.isFinite(Number(v));

export function money(v, { whole = false } = {}) {
  if (!isNum(v)) return 'n/a';
  const x = Number(v);
  const s = (whole ? usd0 : usd2).format(Math.abs(x));
  return x < 0 ? MINUS + s : s;
}

export function moneySigned(v) {
  if (!isNum(v)) return 'n/a';
  const x = Number(v);
  const s = usd2.format(Math.abs(x));
  if (Math.abs(x) < 0.005) return usd2.format(0);
  return (x > 0 ? '+' : MINUS) + s;
}

/** Price with sensible precision: cents above $1, more digits for sub-dollar prices. */
export function price(v) {
  if (!isNum(v)) return 'n/a';
  const x = Number(v);
  if (Math.abs(x) < 1) return '$' + x.toFixed(4);
  return usd2.format(x);
}

export function pct(v, digits = 2) {
  if (!isNum(v)) return 'n/a';
  return Number(v).toFixed(digits) + '%';
}

export function pctSigned(v, digits = 2) {
  if (!isNum(v)) return 'n/a';
  const x = Number(v);
  if (Math.abs(x) < 0.5 * Math.pow(10, -digits)) return (0).toFixed(digits) + '%';
  return (x > 0 ? '+' : MINUS) + Math.abs(x).toFixed(digits) + '%';
}

export function shares(v) {
  if (!isNum(v)) return 'n/a';
  const x = Number(v);
  const s = Math.abs(x - Math.round(x)) < 1e-9 ? Math.round(x).toLocaleString('en-US') : x.toLocaleString('en-US', { maximumFractionDigits: 4 });
  return s;
}

export function number(v, digits = 2) {
  if (!isNum(v)) return 'n/a';
  return Number(v).toLocaleString('en-US', { maximumFractionDigits: digits });
}

export function compactMoney(v) {
  if (!isNum(v)) return 'n/a';
  const x = Number(v);
  const abs = Math.abs(x);
  if (abs >= 1e12) return '$' + (x / 1e12).toFixed(2) + 'T';
  if (abs >= 1e9) return '$' + (x / 1e9).toFixed(2) + 'B';
  if (abs >= 1e6) return '$' + (x / 1e6).toFixed(1) + 'M';
  return usd0.format(x);
}

export function compactNumber(v) {
  if (!isNum(v)) return 'n/a';
  const x = Number(v);
  const abs = Math.abs(x);
  if (abs >= 1e9) return (x / 1e9).toFixed(2) + 'B';
  if (abs >= 1e6) return (x / 1e6).toFixed(2) + 'M';
  if (abs >= 1e3) return (x / 1e3).toFixed(1) + 'K';
  return plain.format(x);
}

export function trend(v) {
  if (!isNum(v) || Math.abs(Number(v)) < 1e-9) return 'flat';
  return Number(v) > 0 ? 'up' : 'down';
}

export function arrow(v) {
  const t = trend(v);
  return t === 'up' ? '▲' : t === 'down' ? '▼' : '';
}

const etTimeFmt = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour: 'numeric', minute: '2-digit' });
const etDayFmt = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', month: 'short', day: 'numeric' });
const etDayYearFmt = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', month: 'short', day: 'numeric', year: 'numeric' });
const etWeekdayFmt = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', weekday: 'short' });
const etIsoFmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' });

const toDate = (t) => (t instanceof Date ? t : new Date(typeof t === 'string' && t.length === 10 ? t + 'T16:00:00Z' : t));

export function etTime(t) {
  if (!t) return '';
  return etTimeFmt.format(toDate(t)) + ' ET';
}

export function etDay(t) {
  if (!t) return '';
  return etDayFmt.format(toDate(t));
}

export function etDayYear(t) {
  if (!t) return '';
  return etDayYearFmt.format(toDate(t));
}

export function etWhen(t) {
  if (!t) return '';
  const d = toDate(t);
  const today = etIsoFmt.format(new Date());
  const that = etIsoFmt.format(d);
  if (today === that) return etTime(d);
  return `${etDayFmt.format(d)}, ${etTimeFmt.format(d)} ET`;
}

export function etWeekdayTime(t) {
  if (!t) return '';
  const d = toDate(t);
  return `${etWeekdayFmt.format(d)} ${etTimeFmt.format(d)} ET`;
}

export function etIsoDate(t = new Date()) {
  return etIsoFmt.format(toDate(t));
}

export function ago(t, nowMs = Date.now()) {
  if (!t) return '';
  const s = Math.round((nowMs - toDate(t).getTime()) / 1000);
  if (s < 45) return 'just now';
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} hr ago`;
  const days = Math.round(s / 86400);
  return days === 1 ? 'yesterday' : `${days} days ago`;
}

/**
 * Minutes since a player's last activity that still count as "active now". A student with the app
 * on screen sends a heartbeat about once a minute (app.js), so this allows a missed beat or two.
 */
export const ACTIVE_NOW_MINUTES = 5;
/** Minutes that count as "in the last hour" on the mentor roster. */
export const ACTIVE_RECENT_MINUTES = 60;

/** A player's activity for the mentor roster: key is now, hour, earlier, or never. */
export function activity(t, nowMs = Date.now()) {
  if (!t) return { key: 'never', label: 'Never' };
  const minutes = (nowMs - toDate(t).getTime()) / 60000;
  if (minutes <= ACTIVE_NOW_MINUTES) return { key: 'now', label: 'Active now' };
  return { key: minutes <= ACTIVE_RECENT_MINUTES ? 'hour' : 'earlier', label: ago(t, nowMs) };
}

/** Counts for the roster summary: players active now, and active in the last hour (including now). */
export function activityCounts(rows, nowMs = Date.now()) {
  const keys = rows.map((r) => activity(r.last_active_at, nowMs).key);
  return { total: rows.length, now: keys.filter((k) => k === 'now').length, hour: keys.filter((k) => k === 'now' || k === 'hour').length };
}

export function initials(symbol) {
  return String(symbol || '?').replace(/[^A-Z0-9]/gi, '').slice(0, 4).toUpperCase();
}

export const ORDER_TYPE_LABEL = { market: 'Market', limit: 'Limit', stop: 'Stop', stop_limit: 'Stop limit' };
export const TIF_LABEL = { day: 'Day', gtc: "Good 'til canceled" };
export const STATUS_LABEL = { open: 'Open', filled: 'Filled', cancelled: 'Canceled', rejected: 'Rejected', expired: 'Expired' };
