// App state shared by the views, plus the loaders that fill it.
import { load, save } from './lib/storage.js';

export const store = {
  config: null,
  api: null,
  session: null,
  isMentor: false,
  players: [],
  current: null,
  summary: null,
  portfolio: null,
  market: null,
  featured: [],
  quotes: {},
  lessons: {},
  watchlist: []
};

const CURRENT_KEY = 'aatf.currentPlayer';

export function isDemo() {
  return store.api?.mode === 'demo';
}

export function playerId() {
  return store.current?.player?.id ?? null;
}

export function gameId() {
  return store.current?.game?.id ?? null;
}

export function quoteOf(sym) {
  return store.quotes[sym] ?? null;
}

export function mergeQuotes(map) {
  for (const [k, v] of Object.entries(map || {})) if (v) store.quotes[k] = v;
}

export async function loadSession() {
  const api = store.api;
  store.session = await api.getSession();
  store.players = store.session ? await api.myPlayers() : [];
  const saved = load(CURRENT_KEY);
  store.current = store.players.find((p) => p.player.id === saved) ?? store.players[0] ?? null;
  store.isMentor = store.session ? await api.isMentor().catch(() => false) : false;
}

export function setCurrent(pid) {
  store.current = store.players.find((p) => p.player.id === pid) ?? store.current;
  if (store.current) save(CURRENT_KEY, store.current.player.id);
}

export async function refreshMarket() {
  const api = store.api;
  const [market, featured] = await Promise.all([
    api.marketStatus().catch(() => store.market),
    api.featured().catch(() => store.featured)
  ]);
  store.market = market;
  store.featured = featured || [];
  for (const f of store.featured) if (f.quote) store.quotes[f.symbol] = f.quote;
}

export async function refreshPlayer() {
  const api = store.api;
  const pid = playerId();
  if (!pid) {
    store.portfolio = null;
    return;
  }
  const [portfolio, watchlist, lessons, summary] = await Promise.all([
    api.getPortfolio(pid),
    api.getWatchlist(pid),
    api.lessonProgress(pid),
    api.gameSummary(gameId())
  ]);
  store.portfolio = portfolio;
  store.watchlist = watchlist;
  store.lessons = lessons;
  store.summary = summary;
  if (summary?.game && store.current) store.current.game = summary.game;
}

/** Re-reads the game alone (its status and required lessons), the copy the trading lock is decided from,
 * so an admin's change reaches the student's screens without a visit to Home or a reload. */
export async function refreshGame() {
  const gid = gameId();
  if (!gid) return null;
  const summary = await store.api.gameSummary(gid);
  if (summary?.game && store.current?.game?.id === summary.game.id) {
    store.summary = summary;
    store.current.game = summary.game;
  }
  return summary;
}

export function savedTheme() {
  return load('aatf.theme', 'auto');
}

export function applyTheme(mode) {
  save('aatf.theme', mode);
  const root = document.documentElement;
  if (mode === 'light' || mode === 'dark') root.setAttribute('data-theme', mode);
  else root.removeAttribute('data-theme');
}
