// Demo mode: the full app with a simulated market, sample classmates, and progress saved in this
// browser. Used when no Supabase project is configured, and for previews.

import * as sim from '../engine/sim.js';
import { validateOrder, applyFill, processOpenOrders, orderDecision, reservedCash, newId, OrderError, round2 } from '../engine/trading.js';
import { UNIVERSE, universeEntry, BENCHMARK_SYMBOL } from '../data/universe.js';
import { addDaysIso } from '../lib/calendar.js';
import { passedCount } from '../data/lessons.js';
import { load, save, remove } from '../lib/storage.js';

const KEY = 'aatf.demo.v1';
const GAME_ID = 'demo-game';
const ME = 'demo-me';

const BOTS = [
  { id: 'bot-1', name: 'Malik J.', picks: [['SPY', 60000], ['VTI', 30000], ['BND', 8000]] },
  { id: 'bot-2', name: 'Andre W.', picks: [['NVDA', 30000], ['MSFT', 25000], ['AAPL', 20000], ['META', 20000]] },
  { id: 'bot-3', name: 'Jalen R.', picks: [['NKE', 20000], ['SBUX', 15000], ['NFLX', 20000], ['DIS', 15000], ['SPOT', 20000]] },
  { id: 'bot-4', name: 'Chris B.', picks: [['SCHD', 40000], ['KO', 20000], ['JNJ', 20000], ['O', 15000]] },
  { id: 'bot-5', name: 'Devon M.', picks: [['TSLA', 90000]] },
  { id: 'bot-6', name: 'Isaiah T.', picks: [['VOO', 30000], ['JPM', 15000], ['LLY', 15000], ['XOM', 10000], ['COST', 15000], ['VXUS', 10000]] },
  { id: 'bot-7', name: 'Marcus K.', picks: [['RBLX', 30000], ['TTWO', 25000], ['SONY', 20000], ['AMD', 20000]] },
  { id: 'bot-8', name: 'Kofi A.', picks: [['GS', 25000], ['V', 25000], ['MA', 25000], ['HOOD', 15000]] }
];

const delay = (v) => Promise.resolve(v);
const now = () => Date.now();
// Minutes since each sample classmate was last active (by the last digit of the id), so the mentor
// roster shows every activity state: active now, in the last hour, and earlier.
const DEMO_IDLE_MINUTES = [2, 1, 3, 18, 42, 140, 400, 1500, 4400, 9000];
const iso = (ms) => new Date(ms).toISOString();
const etToday = () => sim.etIso(now());
const atEt = (day, hours) => sim.etMidnight(day) + hours * 3600000;

function symbolRow(u) {
  return {
    symbol: u.symbol,
    name: u.name,
    exchange: null,
    asset_type: u.type,
    sector: u.sector,
    blurb: u.blurb,
    featured: true,
    collections: u.collections,
    tradable: true
  };
}

export class DemoApi {
  constructor(config = {}) {
    this.mode = 'demo';
    this.config = config;
    this.state = null;
  }

  async init() {
    this.state = load(KEY);
    if (!this.state || this.state.version !== 1) this.state = this.seed();
    this.tick();
  }

  persist() {
    save(KEY, this.state);
  }

  // ------------------------------------------------------------ seed

  seed() {
    const t = now();
    const startDay = sim.lastTradingDayBefore(addDaysIso(sim.etIso(t), -13), t);
    const startAt = atEt(startDay, 9.5);
    const fillAt = atEt(startDay, 15.9);
    const close = (s, d) => sim.closeOn(s, d, t);
    const game = {
      id: GAME_ID,
      name: 'Fall Market Challenge',
      join_code: 'DEMO26',
      status: 'active',
      starting_cash: 100000,
      starts_at: iso(startAt),
      ends_at: null,
      allow_fractional: true,
      max_position_pct: null,
      min_share_price: 1,
      commission: 0,
      show_holdings: true,
      announcement: 'Welcome to the Fall Market Challenge. Research before you buy, and use the "Why this trade?" note so we can talk through your picks at Saturday session.',
      benchmark_symbol: BENCHMARK_SYMBOL,
      benchmark_start_price: close(BENCHMARK_SYMBOL, startDay),
      created_at: iso(startAt - 86400000)
    };
    const me = {
      id: ME,
      display_name: 'Demo Student',
      cash: 100000,
      realized_pl: 0,
      created_at: iso(startAt),
      positions: {},
      orders: [],
      transactions: [
        { id: newId('t'), order_id: null, kind: 'adjustment', symbol: null, qty: null, price: null, amount: 100000, fee: 0, realized_pl: null, cash_after: 100000, note: 'Starting cash', created_at: iso(startAt) }
      ],
      watchlist: ['SPOT', 'RBLX', 'KO', 'DIS'],
      lessons: {
        'what-is-a-stock': { score: 100, completed_at: iso(startAt + 3600000) },
        'how-the-market-works': { score: 63, completed_at: iso(startAt + 7200000) }
      }
    };
    const days = sim.tradingDaysBetween(startDay, sim.etIso(t), t);
    const dayAgo = (k) => days[Math.max(0, days.length - k)];
    const sample = [
      { at: fillAt, day: startDay, symbol: 'SPY', side: 'buy', notional: 25000, note: 'Start with the whole market, then add a few companies I know.' },
      { at: fillAt, day: startDay, symbol: 'AAPL', side: 'buy', qty: 40, note: 'Everyone at school has an iPhone. Services revenue keeps growing.' },
      { at: fillAt, day: startDay, symbol: 'NKE', side: 'buy', qty: 120, note: 'Brand I wear every day. Stock is down from its high, so I am buying slowly.' },
      { at: fillAt, day: startDay, symbol: 'JPM', side: 'buy', qty: 30, note: 'Biggest U.S. bank. Steady earnings.' },
      { at: fillAt, day: startDay, symbol: 'SBUX', side: 'buy', qty: 100 },
      { at: atEt(dayAgo(3), 11), day: dayAgo(3), symbol: 'NVDA', side: 'buy', qty: 20, note: 'AI chips. Small position because it moves a lot.' },
      { at: atEt(dayAgo(2), 14), day: dayAgo(2), symbol: 'SBUX', side: 'sell', qty: 40, note: 'Trimming to free up cash for research picks.' }
    ];
    for (const s of sample) {
      const price = close(s.symbol, s.day);
      const order = {
        id: newId('o'), player_id: ME, game_id: GAME_ID, symbol: s.symbol, side: s.side, order_type: 'market',
        qty: s.qty ?? null, notional: s.notional ?? null, limit_price: null, stop_price: null, time_in_force: 'day',
        status: 'open', stop_triggered: false, filled_qty: null, filled_price: null, filled_at: null, reason: null,
        note: s.note ?? null, created_at: iso(s.at), updated_at: iso(s.at)
      };
      me.orders.unshift(order);
      applyFill(me, order, price, game, iso(s.at));
    }
    const ko = sim.quote('KO', t).price;
    me.orders.unshift({
      id: newId('o'), player_id: ME, game_id: GAME_ID, symbol: 'KO', side: 'buy', order_type: 'limit',
      qty: 50, notional: null, limit_price: Math.round(ko * 0.95 * 100) / 100, stop_price: null, time_in_force: 'gtc',
      status: 'open', stop_triggered: false, filled_qty: null, filled_price: null, filled_at: null, reason: null,
      note: 'Waiting for a dip before buying a dividend stock.', created_at: iso(t - 86400000), updated_at: iso(t - 86400000)
    });
    const state = { version: 1, created_at: iso(t), game, me, mentorMode: false };
    this.state = state;
    save(KEY, state);
    return state;
  }

  async resetDemo() {
    remove(KEY);
    this.state = this.seed();
    return true;
  }

  // ------------------------------------------------------------ helpers

  get game() {
    return this.state.game;
  }

  priceOf = (sym) => sim.quote(sym, now())?.price ?? null;

  /** Expire and fill orders. Called on load and every few seconds by the app. */
  tick() {
    const s = this.state;
    if (!s) return [];
    const t = now();
    const today = sim.etIso(t);
    const nowIso = iso(t);
    let changed = false;
    for (const o of s.me.orders) {
      if (o.status !== 'open') continue;
      if (o.time_in_force === 'day' && sim.etIso(Date.parse(o.created_at)) < today) {
        Object.assign(o, { status: 'expired', reason: 'Day order expired at the end of the demo trading day.', updated_at: nowIso });
        changed = true;
      } else if (o.time_in_force === 'gtc' && t - Date.parse(o.created_at) > 90 * 86400000) {
        Object.assign(o, { status: 'expired', reason: 'Good til canceled orders expire after 90 days.', updated_at: nowIso });
        changed = true;
      }
    }
    let filled = [];
    if (s.game.status === 'active') {
      filled = processOpenOrders(s.me, this.priceOf, s.game, nowIso);
      if (filled.length) changed = true;
    }
    if (changed) this.persist();
    return filled.filter((o) => o.status === 'filled');
  }

  botState(bot) {
    const startDay = sim.etIso(Date.parse(this.game.starts_at));
    const t = now();
    const positions = {};
    let cash = this.game.starting_cash;
    for (const [sym, dollars] of bot.picks) {
      const px = sim.closeOn(sym, startDay, t);
      const qty = Math.floor((dollars / px) * 10000) / 10000;
      const cost = round2(qty * px);
      cash -= cost;
      positions[sym] = { qty, avg_cost: px, opened_at: this.game.starts_at };
    }
    return { cash: round2(cash), realized_pl: 0, positions, orders: [], transactions: [] };
  }

  playerState(id) {
    if (id === ME) return this.state.me;
    const bot = BOTS.find((b) => b.id === id);
    return bot ? this.botState(bot) : null;
  }

  valueOnDay(state, day, txnsAsc) {
    // Replays the ledger to the end of `day` and values holdings at that day's close.
    const end = sim.etMidnight(addDaysIso(day, 1));
    let cash = this.game.starting_cash;
    const pos = {};
    if (txnsAsc) {
      cash = 0;
      for (const tx of txnsAsc) {
        if (Date.parse(tx.created_at) >= end) break;
        if (tx.kind === 'adjustment' || tx.kind === 'reset') cash = tx.cash_after;
        else cash += tx.amount;
        if (tx.kind === 'buy') pos[tx.symbol] = (pos[tx.symbol] || 0) + tx.qty;
        if (tx.kind === 'sell') pos[tx.symbol] = (pos[tx.symbol] || 0) - tx.qty;
      }
    } else {
      cash = state.cash;
      for (const [sym, p] of Object.entries(state.positions)) pos[sym] = p.qty;
    }
    let v = cash;
    for (const [sym, q] of Object.entries(pos)) if (q > 1e-9) v += q * sim.closeOn(sym, day, now());
    return round2(v);
  }

  history(id) {
    const st = this.playerState(id);
    if (!st) return [];
    const t = now();
    const startDay = sim.etIso(Date.parse(this.game.starts_at));
    const days = sim.tradingDaysBetween(startDay, addDaysIso(sim.etIso(t), -1), t);
    const asc = id === ME ? [...st.transactions].reverse().sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at)) : null;
    return days.map((d) => ({ d, total_value: this.valueOnDay(st, d, asc) }));
  }

  // ------------------------------------------------------------ session

  async getSession() {
    return { userId: 'demo-user', isAnonymous: true, email: null, demo: true };
  }

  onAuthChange() {}

  async myPlayers() {
    const me = this.state.me;
    return [{ player: { id: me.id, display_name: me.display_name, game_id: GAME_ID, cash: me.cash, created_at: me.created_at }, game: this.game }];
  }

  async joinGame() {
    return (await this.myPlayers())[0].player;
  }

  async rejoinGame() {
    return { ok: true, player: (await this.myPlayers())[0].player };
  }

  async signOut() {
    return true;
  }

  async isMentor() {
    return !!this.state.mentorMode;
  }

  async setMentorMode(on) {
    this.state.mentorMode = !!on;
    this.persist();
  }

  async mentorSignIn() {
    await this.setMentorMode(true);
  }

  async mentorSignUp() {
    await this.setMentorMode(true);
    return { needsConfirm: false };
  }

  async claimMentor() {
    await this.setMentorMode(true);
    return true;
  }

  // ------------------------------------------------------------ market

  async marketStatus() {
    const t = iso(now());
    return { is_open: true, demo: true, live: false, now: t, session_date: etToday(), last_refresh: t, data_source: 'demo' };
  }

  async featured() {
    const t = now();
    return UNIVERSE.map((u) => ({ ...symbolRow(u), quote: sim.quote(u.symbol, t) }));
  }

  async getQuotes(symbols) {
    const t = now();
    const out = {};
    for (const s of symbols) {
      const q = sim.quote(s, t);
      if (q) out[s] = q;
    }
    return out;
  }

  async searchSymbols(query) {
    const q = String(query || '').trim();
    if (!q) return [];
    const U = q.toUpperCase();
    const L = q.toLowerCase();
    return UNIVERSE.filter((u) => u.symbol.startsWith(U) || u.name.toLowerCase().includes(L))
      .sort((a, b) => (b.symbol === U) - (a.symbol === U) || (b.symbol.startsWith(U)) - (a.symbol.startsWith(U)) || a.symbol.length - b.symbol.length)
      .slice(0, 20)
      .map(symbolRow);
  }

  async getSymbol(sym) {
    const u = universeEntry(sym);
    return u ? symbolRow(u) : null;
  }

  async getSymbols(list) {
    return list.map((s) => universeEntry(s)).filter(Boolean).map(symbolRow);
  }

  async getProfile(sym) {
    const u = universeEntry(sym);
    if (!u) return null;
    const w = sim.week52(sym, now());
    const bars = sim.dailyBars(sym, addDaysIso(etToday(), -45), now()).slice(-30);
    const avgVol = bars.length ? bars.reduce((s, b) => s + b.v, 0) / bars.length : null;
    return { ...symbolRow(u), week52_high: w.high, week52_low: w.low, avg_volume_30d: avgVol, fundamentals: null };
  }

  async getBars(sym, range) {
    const t = now();
    if (range === '1D' || range === '1W') return { intraday: true, bars: sim.intradayBars(sym, range, t) };
    const from = addDaysIso(sim.etIso(t), range === '5Y' ? -(365 * 5 + 5) : -372);
    return { intraday: false, bars: sim.dailyBars(sym, from, t) };
  }

  async getNews() {
    return [];
  }

  // ------------------------------------------------------------ game

  async gameSummary() {
    const g = this.game;
    const price = this.priceOf(g.benchmark_symbol);
    return {
      game: g,
      player_count: BOTS.length + 1,
      benchmark: {
        symbol: g.benchmark_symbol,
        start_price: g.benchmark_start_price,
        price,
        value: round2((g.starting_cash * price) / g.benchmark_start_price),
        return_pct: round2((price / g.benchmark_start_price - 1) * 100)
      },
      market: await this.marketStatus()
    };
  }

  portfolioFor(id) {
    const st = this.playerState(id);
    if (!st) throw new Error('Player not found.');
    const g = this.game;
    const t = now();
    const dayStart = sim.etMidnight(sim.etIso(t));
    const positions = Object.entries(st.positions).map(([symbol, p]) => {
      const u = universeEntry(symbol);
      const q = sim.quote(symbol, t);
      const mv = round2(p.qty * q.price);
      // A position opened today has gained or lost only since it was bought.
      const dayRef = Date.parse(p.opened_at) >= dayStart ? p.avg_cost : q.prev_close;
      return {
        symbol,
        name: u?.name ?? symbol,
        asset_type: u?.type ?? 'stock',
        sector: u?.sector ?? null,
        qty: p.qty,
        avg_cost: p.avg_cost,
        price: q.price,
        prev_close: q.prev_close,
        quote_time: q.updated_at,
        market_value: mv,
        cost_basis: round2(p.qty * p.avg_cost),
        unrealized_pl: round2(p.qty * (q.price - p.avg_cost)),
        unrealized_pct: p.avg_cost > 0 ? round2((q.price / p.avg_cost - 1) * 100) : null,
        day_change: round2(p.qty * (q.price - dayRef)),
        day_change_pct: dayRef > 0 ? round2((q.price / dayRef - 1) * 100) : null
      };
    }).sort((a, b) => b.market_value - a.market_value);
    const holdings = positions.reduce((s, p) => s + p.market_value, 0);
    const total = round2(st.cash + holdings);
    const reserved = round2(reservedCash(st, this.priceOf, g.commission));
    const yesterday = sim.lastTradingDayBefore(sim.etIso(t), t);
    const startDay = sim.etIso(Date.parse(g.starts_at));
    const asc = id === ME ? [...st.transactions].reverse().sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at)) : null;
    const ref = yesterday >= startDay ? this.valueOnDay(st, yesterday, asc) : g.starting_cash;
    const name = id === ME ? this.state.me.display_name : BOTS.find((b) => b.id === id)?.name;
    return {
      player_id: id,
      display_name: name,
      game_id: g.id,
      starting_cash: g.starting_cash,
      cash: round2(st.cash),
      reserved,
      buying_power: round2(Math.max(st.cash - reserved, 0)),
      holdings_value: round2(holdings),
      total_value: total,
      total_return: round2(total - g.starting_cash),
      total_return_pct: round2((total / g.starting_cash - 1) * 100),
      realized_pl: round2(st.realized_pl || 0),
      day_change: round2(total - ref),
      day_change_pct: round2((total / ref - 1) * 100),
      positions
    };
  }

  async getPortfolio(playerId) {
    return this.portfolioFor(playerId);
  }

  async getLeaderboard() {
    const ids = [ME, ...BOTS.map((b) => b.id)];
    const rows = ids.map((id) => {
      const p = this.portfolioFor(id);
      const st = this.playerState(id);
      return {
        player_id: id,
        display_name: p.display_name,
        total_value: p.total_value,
        return_pct: p.total_return_pct,
        day_change_pct: p.day_change_pct,
        holdings: p.positions.length,
        trades: id === ME ? st.orders.filter((o) => o.status === 'filled').length : BOTS.find((b) => b.id === id).picks.length,
        is_me: id === ME
      };
    });
    rows.sort((a, b) => b.total_value - a.total_value);
    rows.forEach((r, i) => {
      r.rank = i + 1;
    });
    return rows;
  }

  async getSnapshots(playerId) {
    return this.history(playerId);
  }

  async listOrders(playerId, { status } = {}) {
    if (playerId !== ME) return [];
    let list = this.state.me.orders;
    if (status === 'open') list = list.filter((o) => o.status === 'open');
    if (status === 'closed') list = list.filter((o) => o.status !== 'open');
    return [...list].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
  }

  async listTransactions(playerId) {
    if (playerId !== ME) return [];
    return [...this.state.me.transactions].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
  }

  async placeOrder(playerId, input) {
    if (playerId !== ME) throw new OrderError('That player does not belong to this account.');
    const st = this.state.me;
    const t = now();
    const symbol = String(input.symbol || '').toUpperCase();
    const u = universeEntry(symbol);
    const quote = u ? sim.quote(symbol, t) : null;
    const clean = validateOrder({
      game: this.game,
      state: st,
      symbolInfo: u ? { tradable: true, asset_type: u.type } : null,
      quote,
      input: { ...input, symbol },
      now: t,
      priceOf: this.priceOf
    });
    const nowIso = iso(t);
    const order = {
      id: newId('o'), player_id: ME, game_id: GAME_ID, ...clean,
      status: 'open', stop_triggered: false, filled_qty: null, filled_price: null, filled_at: null, reason: null,
      created_at: nowIso, updated_at: nowIso
    };
    st.orders.unshift(order);
    // The demo market is always open, so check the new order against the current price right away.
    const decision = orderDecision(order, quote.price);
    if (decision === 'fill') applyFill(st, order, quote.price, this.game, nowIso);
    else if (decision === 'trigger') Object.assign(order, { stop_triggered: true, updated_at: nowIso });
    this.persist();
    return order;
  }

  async cancelOrder(orderId) {
    const o = this.state.me.orders.find((x) => x.id === orderId && x.status === 'open');
    if (!o) throw new Error('That order is no longer open.');
    Object.assign(o, { status: 'cancelled', reason: 'Canceled by you.', updated_at: iso(now()) });
    this.persist();
    return o;
  }

  async getWatchlist(playerId) {
    return playerId === ME ? [...this.state.me.watchlist] : [];
  }

  async setWatch(playerId, symbol, on) {
    if (playerId !== ME) return;
    const list = this.state.me.watchlist;
    const s = symbol.toUpperCase();
    const i = list.indexOf(s);
    if (on && i < 0) list.unshift(s);
    if (!on && i >= 0) list.splice(i, 1);
    this.persist();
  }

  async lessonProgress(playerId) {
    return playerId === ME ? { ...this.state.me.lessons } : {};
  }

  async completeLesson(playerId, lessonId, score) {
    if (playerId !== ME) return;
    const prev = this.state.me.lessons[lessonId];
    if (!prev || score > prev.score) this.state.me.lessons[lessonId] = { score, completed_at: iso(now()) };
    this.persist();
  }

  async heartbeat() {}

  // ------------------------------------------------------------ mentor

  async mentorGames() {
    const lb = await this.getLeaderboard();
    return [{ ...this.game, player_count: lb.length, active_this_week: lb.length, trades: lb.reduce((s, r) => s + r.trades, 0) }];
  }

  async createGame() {
    throw new Error('Creating games needs the live setup. In the demo, edit the sample game instead.');
  }

  async updateGame(gameId, patch) {
    const g = this.game;
    const allowed = ['name', 'status', 'ends_at', 'allow_fractional', 'max_position_pct', 'min_share_price', 'commission', 'show_holdings', 'announcement'];
    for (const k of allowed) if (k in patch) g[k] = patch[k];
    if (g.status === 'ended') {
      for (const o of this.state.me.orders) if (o.status === 'open') Object.assign(o, { status: 'cancelled', reason: 'The game ended.' });
    }
    this.persist();
    return g;
  }

  async roster() {
    const lb = await this.getLeaderboard();
    return lb.map((r) => ({
      player_id: r.player_id,
      display_name: r.display_name,
      total_value: r.total_value,
      return_pct: r.return_pct,
      cash: this.portfolioFor(r.player_id).cash,
      holdings: r.holdings,
      trades: r.trades,
      open_orders: r.is_me ? this.state.me.orders.filter((o) => o.status === 'open').length : 0,
      lessons_completed: r.is_me ? passedCount(this.state.me.lessons) : (parseInt(r.player_id.slice(-1), 10) * 3) % 11,
      last_active_at: r.is_me ? iso(now()) : iso(now() - (DEMO_IDLE_MINUTES[parseInt(r.player_id.slice(-1), 10)] ?? 90) * 60000),
      joined_at: this.game.starts_at,
      locked: false
    }));
  }

  async resetPin() {
    return true;
  }

  async renamePlayer(playerId, name) {
    if (playerId === ME) {
      this.state.me.display_name = String(name).trim().slice(0, 24) || 'Demo Student';
      this.persist();
    }
    return true;
  }

  async removePlayer() {
    throw new Error('Sample classmates stay in the demo. On your live site, mentors can remove players.');
  }

  async resetGame() {
    await this.resetDemo();
    return this.game;
  }

  async addMentor() {
    return true;
  }

  async setMentorCode() {
    return true;
  }

  async syncMarketData() {
    return { calendar: 0, symbols: UNIVERSE.length };
  }

  async systemStatus() {
    return { demo: true, symbols: UNIVERSE.length, alpaca_connected: false, finnhub_connected: false };
  }
}
