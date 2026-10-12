// Live mode: Supabase for accounts, games, and trades; the `market` edge function for prices.
// Requires window.supabase (vendor/supabase.js) and a project URL + publishable key in config.js.

const FRESH_MS = 90 * 1000;

// Database functions raise plain-English messages; pass them straight through.
function errorMessage(error, fallback) {
  if (!error) return fallback;
  return error.message || error.error_description || fallback;
}

export class LiveApi {
  constructor(config) {
    this.mode = 'live';
    this.config = config;
    this.client = window.supabase.createClient(config.supabaseUrl, config.supabaseKey, {
      auth: { persistSession: true, autoRefreshToken: true, storageKey: 'aatf.auth' }
    });
    this.ensured = new Map();
    this.session = null;
  }

  async init() {
    const { data } = await this.client.auth.getSession();
    this.session = data.session;
  }

  // ------------------------------------------------------------ plumbing

  async rpc(fn, args = {}) {
    const { data, error } = await this.client.rpc(fn, args);
    if (error) throw new Error(errorMessage(error, 'Something went wrong. Try again.'));
    return data;
  }

  async fn(action, body = {}) {
    const { data, error } = await this.client.functions.invoke('market', { body: { action, ...body } });
    if (error) {
      let msg = 'Market data is unavailable right now.';
      try {
        const ctx = await error.context?.json?.();
        if (ctx?.error) msg = ctx.error;
      } catch (_) {
        // keep default
      }
      throw new Error(msg);
    }
    return data;
  }

  async select(query) {
    const { data, error } = await query;
    if (error) throw new Error(errorMessage(error, 'Could not load data.'));
    return data;
  }

  userId() {
    return this.session?.user?.id ?? null;
  }

  async ensureSession() {
    if (this.session) return this.session;
    const { data, error } = await this.client.auth.signInAnonymously();
    if (error) {
      if (/anonymous/i.test(error.message)) {
        throw new Error('Student sign-in is turned off for this site. Ask your mentor to enable anonymous sign-ins in Supabase.');
      }
      if (/rate limit/i.test(error.message)) {
        throw new Error('Too many people joined from this network in the last hour. Wait a few minutes or ask your mentor to raise the limit.');
      }
      throw new Error(error.message);
    }
    this.session = data.session;
    return this.session;
  }

  // ------------------------------------------------------------ session

  async getSession() {
    const { data } = await this.client.auth.getSession();
    this.session = data.session;
    if (!this.session) return null;
    const u = this.session.user;
    return { userId: u.id, isAnonymous: !!u.is_anonymous, email: u.email ?? null };
  }

  onAuthChange(cb) {
    this.client.auth.onAuthStateChange((_event, session) => {
      this.session = session;
      cb(session);
    });
  }

  async myPlayers() {
    const uid = this.userId();
    if (!uid) return [];
    const rows = await this.select(
      this.client.from('players').select('*, games(*)').eq('user_id', uid).order('created_at', { ascending: false })
    );
    return rows.map((r) => {
      const { games, ...player } = r;
      return { player, game: games };
    });
  }

  async joinGame(code, name, pin) {
    await this.ensureSession();
    return this.rpc('join_game', { p_code: code, p_name: name, p_pin: pin });
  }

  async rejoinGame(code, name, pin) {
    await this.ensureSession();
    return this.rpc('rejoin_game', { p_code: code, p_name: name, p_pin: pin });
  }

  async signOut() {
    await this.client.auth.signOut();
    this.session = null;
  }

  async isMentor() {
    const uid = this.userId();
    if (!uid || this.session?.user?.is_anonymous) return false;
    const rows = await this.select(this.client.from('mentors').select('user_id').eq('user_id', uid));
    return rows.length > 0;
  }

  async mentorSignIn(email, password) {
    const { data, error } = await this.client.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message === 'Invalid login credentials' ? 'That email and password do not match.' : error.message);
    this.session = data.session;
  }

  async mentorSignUp(email, password) {
    const { data, error } = await this.client.auth.signUp({ email, password });
    if (error) throw new Error(error.message);
    this.session = data.session;
    return { needsConfirm: !data.session };
  }

  async claimMentor(code, name) {
    return this.rpc('claim_mentor', { p_code: code, p_display_name: name || null });
  }

  // ------------------------------------------------------------ market

  async marketStatus() {
    return this.rpc('market_status');
  }

  async featured() {
    const syms = await this.select(this.client.from('symbols').select('*').eq('featured', true).order('symbol'));
    const quotes = await this.dbQuotes(syms.map((s) => s.symbol));
    return syms.map((s) => ({ ...s, quote: quotes[s.symbol] ?? null }));
  }

  async dbQuotes(symbols) {
    if (!symbols.length) return {};
    const rows = await this.select(this.client.from('quotes').select('*').in('symbol', symbols));
    return Object.fromEntries(rows.map((r) => [r.symbol, r]));
  }

  /** Quotes from the database; symbols with no price or a stale one are refreshed by the function. */
  async getQuotes(symbols, { ensure = true } = {}) {
    const list = [...new Set(symbols.map((s) => s.toUpperCase()))].slice(0, 50);
    let quotes = await this.dbQuotes(list);
    if (!ensure || !this.session) return quotes;
    const t = Date.now();
    const need = list.filter((s) => {
      const q = quotes[s];
      const last = this.ensured.get(s) || 0;
      if (t - last < 60 * 1000) return false;
      return !q || t - Date.parse(q.updated_at) > FRESH_MS;
    });
    if (need.length) {
      need.forEach((s) => this.ensured.set(s, t));
      try {
        const res = await this.fn('quotes', { symbols: need });
        quotes = { ...quotes, ...(res.quotes || {}) };
      } catch (_) {
        // keep database values; the scheduled refresh will catch up
      }
    }
    return quotes;
  }

  async searchSymbols(q) {
    if (!String(q || '').trim()) return [];
    return this.rpc('search_symbols', { p_query: q, p_limit: 20 });
  }

  async getSymbol(sym) {
    const rows = await this.select(this.client.from('symbols').select('*').eq('symbol', sym.toUpperCase()));
    return rows[0] ?? null;
  }

  async getSymbols(list) {
    if (!list.length) return [];
    return this.select(this.client.from('symbols').select('*').in('symbol', list.map((x) => x.toUpperCase())));
  }

  async getProfile(sym) {
    return this.fn('profile', { symbol: sym });
  }

  async getBars(sym, range) {
    return this.fn('bars', { symbol: sym, range });
  }

  async getNews(sym) {
    const res = await this.fn('news', sym ? { symbol: sym } : {});
    return res.news || [];
  }

  // ------------------------------------------------------------ game

  async gameSummary(gameId) {
    return this.rpc('game_summary', { p_game_id: gameId });
  }

  async getPortfolio(playerId) {
    return this.rpc('get_portfolio', { p_player_id: playerId });
  }

  async getLeaderboard(gameId) {
    return this.rpc('get_leaderboard', { p_game_id: gameId });
  }

  async getSnapshots(playerId) {
    return this.select(
      this.client.from('portfolio_snapshots').select('d, total_value').eq('player_id', playerId).order('d')
    );
  }

  async listOrders(playerId, { status, limit = 150 } = {}) {
    let q = this.client.from('orders').select('*').eq('player_id', playerId).order('created_at', { ascending: false }).limit(limit);
    if (status === 'open') q = q.eq('status', 'open');
    if (status === 'closed') q = q.neq('status', 'open');
    return this.select(q);
  }

  async listTransactions(playerId) {
    return this.select(
      this.client.from('transactions').select('*').eq('player_id', playerId).order('created_at', { ascending: false }).limit(200)
    );
  }

  async placeOrder(playerId, o) {
    return this.rpc('place_order', {
      p_player_id: playerId,
      p_symbol: o.symbol,
      p_side: o.side,
      p_type: o.order_type,
      p_qty: o.qty ?? null,
      p_notional: o.notional ?? null,
      p_limit_price: o.limit_price ?? null,
      p_stop_price: o.stop_price ?? null,
      p_time_in_force: o.time_in_force || 'day',
      p_note: o.note || null
    });
  }

  async cancelOrder(orderId) {
    return this.rpc('cancel_order', { p_order_id: orderId });
  }

  async getWatchlist(playerId) {
    const rows = await this.select(
      this.client.from('watchlist').select('symbol').eq('player_id', playerId).order('added_at', { ascending: false })
    );
    return rows.map((r) => r.symbol);
  }

  async setWatch(playerId, symbol, on) {
    return this.rpc('set_watch', { p_player_id: playerId, p_symbol: symbol, p_on: on });
  }

  async lessonProgress(playerId) {
    const rows = await this.select(this.client.from('lesson_progress').select('*').eq('player_id', playerId));
    return Object.fromEntries(rows.map((r) => [r.lesson_id, { score: r.score, completed_at: r.completed_at }]));
  }

  async completeLesson(playerId, lessonId, score) {
    return this.rpc('complete_lesson', { p_player_id: playerId, p_lesson_id: lessonId, p_score: score });
  }

  async heartbeat(playerId) {
    try {
      await this.rpc('heartbeat', { p_player_id: playerId });
    } catch (_) {
      // not important
    }
  }

  // ------------------------------------------------------------ mentor

  async mentorGames() {
    return this.rpc('mentor_games');
  }

  async createGame(g) {
    return this.rpc('create_game', {
      p_name: g.name,
      p_starting_cash: g.starting_cash,
      p_starts_at: g.starts_at || null,
      p_ends_at: g.ends_at || null,
      p_allow_fractional: g.allow_fractional,
      p_max_position_pct: g.max_position_pct ?? null,
      p_min_share_price: g.min_share_price,
      p_commission: g.commission,
      p_show_holdings: g.show_holdings,
      p_announcement: g.announcement || null
    });
  }

  async updateGame(gameId, patch) {
    return this.rpc('update_game', { p_game_id: gameId, p_patch: patch });
  }

  async roster(gameId) {
    return this.rpc('game_roster', { p_game_id: gameId });
  }

  async resetPin(playerId, pin) {
    return this.rpc('reset_player_pin', { p_player_id: playerId, p_new_pin: pin });
  }

  async renamePlayer(playerId, name) {
    return this.rpc('rename_player', { p_player_id: playerId, p_name: name });
  }

  async removePlayer(playerId) {
    return this.rpc('remove_player', { p_player_id: playerId });
  }

  async resetGame(gameId, startingCash) {
    return this.rpc('reset_game', { p_game_id: gameId, p_starting_cash: startingCash ?? null });
  }

  async addMentor(email) {
    return this.rpc('add_mentor_by_email', { p_email: email });
  }

  async setMentorCode(code) {
    return this.rpc('set_mentor_code', { p_code: code });
  }

  async syncMarketData() {
    return this.fn('sync');
  }

  async systemStatus() {
    return this.fn('status');
  }
}
