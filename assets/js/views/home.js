// Home: portfolio value, performance vs the S&P 500, holdings, watchlist, movers, and learning.
import { html, raw, n } from '../lib/dom.js';
import { money, moneySigned, pct, pctSigned, trend, arrow, etDay, etIsoDate, shares as fmtShares } from '../lib/format.js';
import { PriceChart } from '../lib/charts.js';
import { icon } from '../lib/icons.js';
import { term } from '../lib/ui.js';
import { store, playerId, gameId, mergeQuotes, quoteOf, isDemo } from '../state.js';
import { LESSONS, passedCount, nextToStudy, lessonNumber, lessonById, requiredLeft, requiredUnknown, tradingLocked } from '../data/lessons.js';
import { quoteRow, symBadge, livePrice, liveChange, demoBanner, footer, changeOf, empty } from './common.js';

export async function performanceSeries(pid, game, summary, totalNow) {
  const api = store.api;
  const [snaps, spy] = await Promise.all([
    api.getSnapshots(pid).catch(() => []),
    game.benchmark_start_price ? api.getBars(game.benchmark_symbol || 'SPY', '1Y').catch(() => null) : null
  ]);
  const today = etIsoDate();
  const pts = (snaps || []).map((s) => ({ t: String(s.d).slice(0, 10), v: Number(s.total_value) }));
  const startDay = etIsoDate(game.starts_at);
  if (!pts.length || pts[0].t > startDay) pts.unshift({ t: startDay, v: Number(game.starting_cash) });
  if (pts[pts.length - 1].t < today) pts.push({ t: today, v: Number(totalNow) });
  else pts[pts.length - 1].v = Number(totalNow);
  let bench = [];
  const start = Number(game.benchmark_start_price);
  if (start > 0 && spy?.bars) {
    const closes = new Map(spy.bars.map((b) => [String(b.t).slice(0, 10), Number(b.c)]));
    let last = start;
    bench = pts.map((p) => {
      if (p.t === today && summary?.benchmark?.price) last = Number(summary.benchmark.price);
      else if (closes.has(p.t)) last = closes.get(p.t);
      else if (p.t === startDay) last = start;
      return { t: p.t, v: Math.round((Number(game.starting_cash) * last) / start * 100) / 100 };
    });
  }
  return { pts, bench };
}

export function perfTip(pts, bench) {
  return (i, b) => {
    const p = pts[i];
    const bv = b ?? (bench[i] ? bench[i].v : null);
    return `<b>${etDay(p.t)}</b><br>You ${money(p.v)}${bv != null ? `<br><span class="muted">S&amp;P 500 ${money(bv)}</span>` : ''}`;
  };
}

export async function render() {
  const api = store.api;
  const pid = playerId();
  const gid = gameId();
  const [pf, summary, board, watch] = await Promise.all([
    api.getPortfolio(pid),
    api.gameSummary(gid),
    api.getLeaderboard(gid),
    api.getWatchlist(pid)
  ]);
  store.portfolio = pf;
  store.summary = summary;
  store.watchlist = watch;
  const game = summary.game;
  const watchInfo = new Map();
  if (watch.length) {
    const [qs, infos] = await Promise.all([api.getQuotes(watch).catch(() => ({})), api.getSymbols(watch).catch(() => [])]);
    mergeQuotes(qs);
    infos.forEach((i) => watchInfo.set(i.symbol, i));
  }
  const lessons = await api.lessonProgress(pid).catch(() => ({}));
  store.lessons = lessons;
  // The summary carries the game's required lessons; keep the trade screens reading the same copy.
  if (store.current && game) store.current.game = game;

  const me = board.find((r) => r.is_me);
  const bench = summary.benchmark;
  const done = passedCount(lessons);
  const required = (game.required_lessons || []).filter((id) => lessonById(id));
  const left = requiredLeft(required, lessons);
  const unknown = requiredUnknown(game.required_lessons);
  const locked = tradingLocked(game, lessons);
  const next = left[0] || nextToStudy(lessons);
  const movers = store.featured
    .filter((f) => f.quote && f.asset_type !== 'etf')
    .map((f) => ({ ...f, c: changeOf(f.quote).pct }))
    .filter((f) => f.c != null)
    .sort((a, b) => b.c - a.c);
  const gainers = movers.filter((f) => f.c > 0).slice(0, 3);
  const losers = movers.filter((f) => f.c < 0).reverse().slice(0, 3);
  const beat = bench?.return_pct != null ? Number(pf.total_return_pct) - Number(bench.return_pct) : null;

  const markup = html`
    ${game.announcement ? html`<div class="banner gold" role="note">${raw(icon('mentor'))}<div class="grow"><span class="eyebrow">From your mentors</span><br>${game.announcement}</div></div>` : ''}
    ${locked ? html`<div class="banner gold" role="note" data-trading-locked>${raw(icon('lock'))}
      <div class="grow"><span class="eyebrow">Required lessons</span><br>${left.length ? html`Trading opens after you pass: ${left.map((l, i) => html`${i ? ', ' : ''}<a href="#/learn/${l.id}">${l.title}</a>`)}.` : ''}${unknown.length ? ' This game also requires a lesson that is no longer in the course. Ask a mentor to save the required lessons again.' : ''}</div>
      <a class="btn small" href="#/learn">${raw(icon('learn'))} Learn</a>
    </div>` : ''}
    ${demoBanner()}
    <div class="grid-2">
      <div class="stack" style="gap:20px">
        <section class="panel hero-value" aria-labelledby="pv">
          <div class="split">
            <span class="eyebrow" id="pv">Your portfolio · ${game.name}</span>
            ${me ? html`<a class="chip gold" href="#/leaderboard">Rank ${me.rank} of ${board.length}</a>` : ''}
          </div>
          <div class="stack" style="gap:8px">
            <div class="big" data-pf="total_value">${money(pf.total_value)}</div>
            <div class="change-line">
              <span data-pf="day_change" class="${trend(pf.day_change)}">${arrow(pf.day_change)} ${moneySigned(pf.day_change)}</span>
              <span data-pf="day_change_pct" class="${trend(pf.day_change_pct)}">${pctSigned(pf.day_change_pct)}</span>
              <span class="muted" style="font-weight:500">today</span>
            </div>
          </div>
          <div class="kpis">
            <div class="kpi"><span class="label">${term('total-return', 'Total return')}</span>
              <span class="value"><span data-pf="total_return_pct" class="${trend(pf.total_return_pct)}">${pctSigned(pf.total_return_pct)}</span></span>
              <span class="sub muted">${moneySigned(pf.total_return)} since the start</span></div>
            <div class="kpi"><span class="label">${term('benchmark', 'S&P 500 benchmark')}</span>
              <span class="value ${trend(bench?.return_pct)}">${bench?.return_pct != null ? pctSigned(bench.return_pct) : 'n/a'}</span>
              <span class="sub ${beat == null || Math.abs(beat) < 0.005 ? 'muted' : beat > 0 ? 'up' : 'down'}">${beat == null ? 'Starts with the first price' : Math.abs(beat) < 0.005 ? 'Even with the index' : beat > 0 ? `You are ahead by ${pct(beat)}` : `You trail by ${pct(Math.abs(beat))}`}</span></div>
            <div class="kpi"><span class="label">${term('buying-power', 'Buying power')}</span>
              <span class="value" data-pf="buying_power">${money(pf.buying_power)}</span>
              <span class="sub muted">${money(pf.holdings_value)} invested</span></div>
          </div>
        </section>

        <section class="panel">
          <div class="panel-head"><h3>You vs. the S&amp;P 500</h3>
            <div class="legend"><span><i style="background: var(--gold)"></i>You</span><span><i class="dash"></i>S&amp;P 500 (SPY), same starting cash</span></div></div>
          <div class="chart" id="perf-chart"></div>
        </section>

        <section class="panel flush">
          <div class="panel-head"><h3>Your holdings</h3><a class="btn ghost small" href="#/portfolio">See portfolio</a></div>
          ${pf.positions.length
            ? html`<div class="list">${pf.positions.slice(0, 6).map((p) => html`<a class="list-row" href="#/stock/${p.symbol}">
                ${symBadge(p.symbol, p.asset_type)}
                <span class="who"><b>${p.symbol}</b><span>${fmtShares(p.qty)} shares · ${money(p.market_value)}</span></span>
                <span class="px"><span class="${trend(p.unrealized_pl)}">${moneySigned(p.unrealized_pl)}</span><span class="${trend(p.unrealized_pct)}">${pctSigned(p.unrealized_pct)} total</span></span>
              </a>`)}</div>`
            : empty('No holdings yet', 'Find a company you know on Markets and make your first trade.', html`<a class="btn" href="#/markets">Explore markets</a>`)}
        </section>
      </div>

      <div class="stack" style="gap:20px">
        <section class="panel flush">
          <div class="panel-head"><h3>Watchlist</h3><a class="btn ghost small" href="#/markets">Add</a></div>
          ${watch.length
            ? html`<div class="list">${watch.slice(0, 8).map((sym) => quoteRow(watchInfo.get(sym) ?? { symbol: sym, name: '' }))}</div>`
            : empty('Nothing on your watchlist', 'Tap the star on any stock to follow it here.')}
        </section>

        <section class="panel">
          <div class="panel-head"><h3>Today's movers</h3><span class="faint" style="font-size:var(--step--1)">Featured companies</span></div>
          ${movers.length
            ? html`<div class="stack" style="gap:6px">
                <span class="eyebrow">Up the most</span>
                ${gainers.length ? html`<div class="list">${gainers.map((f) => quoteRow(f))}</div>` : html`<p class="muted" style="font-size:var(--step--1)">Every featured company is down or flat today.</p>`}
                <span class="eyebrow" style="margin-top:10px">Down the most</span>
                ${losers.length ? html`<div class="list">${losers.map((f) => quoteRow(f))}</div>` : html`<p class="muted" style="font-size:var(--step--1)">Every featured company is up or flat today.</p>`}
              </div>`
            : empty('Prices are loading')}
        </section>

        <section class="panel">
          <div class="panel-head"><h3>Keep learning</h3><a class="btn ghost small" href="#/learn">All lessons</a></div>
          <div class="stack">
            <div class="split"><span class="muted">${done} of ${LESSONS.length} lessons passed</span><span class="data">${Math.round((done / LESSONS.length) * 100)}%</span></div>
            <div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="${LESSONS.length}" aria-valuenow="${done}"><span style="width:${(done / LESSONS.length) * 100}%"></span></div>
            ${required.length ? html`<div class="split"><span class="muted">Required before trading</span><span class="data ${locked ? 'gold' : 'up'}">${required.length - left.length} of ${required.length} passed</span></div>` : ''}
            ${next ? html`<a class="lesson-card" href="#/learn/${next.id}">
                <span class="badge">${lessonNumber(next)}</span>
                <span><b>${next.title}</b>${locked ? html` <span class="chip gold small">Required</span>` : ''}<br><span class="meta">${next.summary}</span></span>
                <span class="meta">${next.minutes} min</span></a>` : html`<p class="muted">Every lesson passed. Try the calculators next.</p>`}
          </div>
        </section>
      </div>
    </div>
    ${footer()}`;

  return {
    html: markup,
    async mount(el) {
      const chartEl = el.querySelector('#perf-chart');
      const chart = new PriceChart(chartEl, { label: 'Your portfolio value compared with the S&P 500' });
      try {
        const { pts, bench: b } = await performanceSeries(pid, game, summary, pf.total_value);
        chart.setData({
          points: pts,
          bench: b,
          color: '--gold',
          xLabel: (t) => etDay(t),
          yLabel: (v) => '$' + Math.round(v).toLocaleString('en-US'),
          tip: perfTip(pts, b),
          empty: 'Your chart fills in after the first market close.'
        });
      } catch (_) {
        chart.setData({ points: [], empty: 'Performance history is not available yet.' });
      }
      return () => chart.destroy();
    }
  };
}
