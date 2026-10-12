// Stock detail: price, chart, your position, key stats, about, news, and the trade buttons.
import { html, raw, n, $, $$ } from '../lib/dom.js';
import { money, moneySigned, price as fmtPrice, pctSigned, trend, arrow, etTime, etDay, etDayYear, etIsoDate, etWhen, shares as fmtShares, compactMoney, compactNumber, number, ago } from '../lib/format.js';
import { PriceChart } from '../lib/charts.js';
import { icon } from '../lib/icons.js';
import { term, toast } from '../lib/ui.js';
import { store, quoteOf, mergeQuotes, playerId, isDemo } from '../state.js';
import { addDaysIso } from '../lib/calendar.js';
import { symBadge, livePrice, liveChange, changeOf, footer, empty } from './common.js';
import { openTrade } from './trade.js';

const RANGES = ['1D', '1W', '1M', '3M', '6M', 'YTD', '1Y', '5Y'];
const RANGE_WORDS = { '1D': 'today', '1W': 'past week', '1M': 'past month', '3M': 'past 3 months', '6M': 'past 6 months', YTD: 'this year', '1Y': 'past year', '5Y': 'past 5 years' };
let lastRange = '1D';
let lastMode = 'line';

export async function render({ params, rerender }) {
  const api = store.api;
  const sym = params.sym.toUpperCase();
  const [info, quotes] = await Promise.all([api.getSymbol(sym), api.getQuotes([sym]).catch(() => ({}))]);
  mergeQuotes(quotes);
  if (!info) {
    return { html: html`<div class="panel">${empty(`We could not find ${sym}`, 'Check the ticker and try searching again.', html`<a class="btn" href="#/markets">Back to Markets</a>`)}</div>` };
  }
  const q = quoteOf(sym);
  const pos = store.portfolio?.positions?.find((p) => p.symbol === sym) ?? null;
  const watching = store.watchlist.includes(sym);
  const isEtf = info.asset_type === 'etf';
  const c = changeOf(q);

  const posCard = pos
    ? html`<section class="panel">
        <div class="panel-head"><h3>Your position</h3><span class="chip gold">${fmtShares(pos.qty)} shares</span></div>
        <dl class="stats">
          <div class="stat"><dt>Market value</dt><dd>${money(pos.market_value)}</dd></div>
          <div class="stat"><dt>${term('cost-basis', 'Average cost')}</dt><dd>${fmtPrice(pos.avg_cost)}</dd></div>
          <div class="stat"><dt>${term('unrealized-gain', 'Total return')}</dt><dd class="${trend(pos.unrealized_pl)}">${moneySigned(pos.unrealized_pl)} (${pctSigned(pos.unrealized_pct)})</dd></div>
          <div class="stat"><dt>${term('day-change', 'Today')}</dt><dd class="${trend(pos.day_change)}">${moneySigned(pos.day_change)}</dd></div>
          <div class="stat"><dt>Share of portfolio</dt><dd>${store.portfolio.total_value ? ((pos.market_value / store.portfolio.total_value) * 100).toFixed(1) + '%' : 'n/a'}</dd></div>
        </dl>
      </section>`
    : '';

  const markup = html`
    <div class="split"><a class="btn ghost small" href="#/markets">${raw(icon('back'))} Markets</a></div>
    <header class="stock-head">
      ${symBadge(sym, info.asset_type, null, 'lg')}
      <div style="min-width:0">
        <h1 style="font-size:var(--step-3)">${info.name}</h1>
        <div class="name">${sym}${info.exchange ? ` · ${info.exchange}` : ''}${info.sector && info.sector !== 'Fund' ? ` · ${info.sector}` : ''}${isEtf ? ' · Exchange-traded fund' : ''}</div>
      </div>
      <button class="icon-btn" type="button" data-watch aria-pressed="${watching}" aria-label="${watching ? 'Remove from watchlist' : 'Add to watchlist'}" title="Watchlist">${raw(icon('star'))}</button>
    </header>

    <div class="grid-2">
      <div class="stack" style="gap:20px">
        <section class="panel">
          <div class="stock-price">
            <span class="big">${livePrice(sym)}</span>
            ${liveChange(sym, { dollars: true, cls: 'data' })}
            <span class="muted" style="font-size:var(--step--1)">${q ? html`Today · ${isDemo() ? 'simulated' : 'as of'} <span data-q="${sym}" data-f="time">${etTime(q.trade_time)}</span>` : 'Loading price'}</span>
          </div>
          <div class="split" style="margin-top:16px">
            <div class="seg fill" role="group" aria-label="Chart range">
              ${RANGES.map((r) => html`<button type="button" data-range="${r}" aria-pressed="${r === lastRange}">${r}</button>`)}
            </div>
            <div class="row-wrap">
              <span class="data" id="range-change" style="font-size:var(--step--1)"></span>
              <div class="seg" role="group" aria-label="Chart style">
                <button type="button" data-mode="line" aria-pressed="${lastMode === 'line'}" title="Line">${raw(icon('line'))}<span class="sr-only">Line</span></button>
                <button type="button" data-mode="candle" aria-pressed="${lastMode === 'candle'}" title="Candles">${raw(icon('candles'))}<span class="sr-only">Candles</span></button>
              </div>
            </div>
          </div>
          <div class="chart tall" id="stock-chart" style="margin-top:12px"></div>
        </section>

        <div class="trade-bar sticky">
          <button class="btn buy" type="button" data-trade="buy">Buy ${sym}</button>
          <button class="btn sell" type="button" data-trade="sell" ${pos ? '' : 'disabled title="You do not own this yet"'}>Sell</button>
        </div>

        ${posCard}

        <section class="panel">
          <div class="panel-head"><h3>Key numbers</h3><a class="btn ghost small" href="#/learn/reading-a-quote">How to read these</a></div>
          <dl class="stats" id="stats">
            <div class="stat"><dt>${term('previous-close', 'Previous close')}</dt><dd>${fmtPrice(q?.prev_close)}</dd></div>
            <div class="stat"><dt>Open</dt><dd>${fmtPrice(q?.open)}</dd></div>
            <div class="stat"><dt>Day's range</dt><dd>${q?.low != null && q?.high != null ? `${fmtPrice(q.low)} to ${fmtPrice(q.high)}` : 'n/a'}</dd></div>
          </dl>
          <div id="stats-more" class="stack" style="margin-top:16px"><div class="skeleton" style="height:48px"></div></div>
        </section>

        <section class="panel">
          <div class="panel-head"><h3>About ${info.name}</h3></div>
          <div class="stack">
            ${info.blurb ? html`<p style="font-size:var(--step-1)">${info.blurb}</p>` : ''}
            <div id="about-more" class="muted"></div>
          </div>
        </section>
      </div>

      <div class="stack" style="gap:20px">
        <section class="panel">
          <div class="panel-head"><h3>News</h3></div>
          <div id="news" class="stack">${isDemo()
            ? html`<p class="muted">Headlines from real financial news sources appear here on your live site. In the demo, use this space to practice: what news would change your mind about ${sym}?</p>`
            : html`<div class="skeleton" style="height:56px"></div><div class="skeleton" style="height:56px"></div>`}</div>
        </section>
        <section class="panel">
          <div class="panel-head"><h3>Before you trade</h3></div>
          <div class="stack">
            <a class="lesson-card" href="#/learn/researching-a-company"><span class="badge">${raw(icon('book'))}</span><span><b>Research checklist</b><br><span class="meta">Eight questions to answer about any company</span></span><span></span></a>
            <a class="lesson-card" href="#/learn/order-types"><span class="badge">${raw(icon('orders'))}</span><span><b>Pick the right order</b><br><span class="meta">Market, limit, stop, and stop limit</span></span><span></span></a>
          </div>
        </section>
      </div>
    </div>
    ${footer()}`;

  return {
    html: markup,
    async mount(el) {
      const chart = new PriceChart($('#stock-chart', el), { label: `${sym} price chart` });
      const cache = {};
      let range = lastRange;
      let current = [];

      const apiRange = (r) => (r === '1D' || r === '1W' || r === '5Y' ? r : '1Y');
      async function bars(r) {
        const key = apiRange(r);
        if (!cache[key]) cache[key] = await api.getBars(sym, key);
        const res = cache[key];
        let list = (res.bars || []).map((b) => ({ t: b.t, o: n(b.o), h: n(b.h), l: n(b.l), c: n(b.c) })).filter((b) => b.c != null);
        const today = etIsoDate();
        if (!res.intraday) {
          const from = r === '1M' ? addDaysIso(today, -31) : r === '3M' ? addDaysIso(today, -92) : r === '6M' ? addDaysIso(today, -183) : r === 'YTD' ? today.slice(0, 4) + '-01-01' : r === '1Y' ? addDaysIso(today, -366) : '0000';
          list = list.filter((b) => String(b.t).slice(0, 10) >= from);
          const quote = quoteOf(sym);
          const last = list[list.length - 1];
          if (quote && (!last || String(last.t).slice(0, 10) < today)) {
            list.push({ t: today, o: n(quote.open) ?? n(quote.prev_close) ?? n(quote.price), h: n(quote.high) ?? n(quote.price), l: n(quote.low) ?? n(quote.price), c: n(quote.price) });
          }
        } else {
          const quote = quoteOf(sym);
          if (quote && list.length && Date.parse(quote.trade_time || quote.updated_at) > Date.parse(list[list.length - 1].t)) {
            const p = n(quote.price);
            list.push({ t: quote.trade_time || quote.updated_at, o: p, h: p, l: p, c: p });
          }
        }
        return { list, intraday: !!res.intraday };
      }

      async function draw() {
        try {
          const { list, intraday } = await bars(range);
          current = list;
          const quote = quoteOf(sym);
          const baseline = range === '1D' && quote ? n(quote.prev_close) : null;
          const first = list.length ? (baseline ?? list[0].c) : null;
          const lastV = list.length ? list[list.length - 1].c : null;
          const rc = $('#range-change', el);
          if (rc && first && lastV) {
            const p = (lastV / first - 1) * 100;
            rc.className = `data ${trend(p)}`;
            rc.textContent = `${arrow(p)} ${pctSigned(p)} ${RANGE_WORDS[range]}`;
          }
          chart.setData({
            mode: lastMode,
            points: list.map((b) => ({ t: b.t, v: b.c })),
            candles: list,
            baseline,
            color: 'trend',
            xLabel: (t) => (intraday ? (range === '1D' ? etTime(t).replace(' ET', '') : etDay(t)) : range === '5Y' ? etDayYear(t).replace(/^\w+ \d+, /, '') : etDay(t)),
            yLabel: (v) => (v >= 1000 ? '$' + Math.round(v).toLocaleString('en-US') : '$' + v.toFixed(2)),
            tip: (i) => {
              const b = list[i];
              const when = intraday ? etWhen(b.t) : etDayYear(b.t);
              return lastMode === 'candle'
                ? `<b>${when}</b><br>Open ${fmtPrice(b.o)} · Close ${fmtPrice(b.c)}<br>High ${fmtPrice(b.h)} · Low ${fmtPrice(b.l)}`
                : `<b>${when}</b><br>${fmtPrice(b.c)}`;
            },
            empty: range === '1D' ? 'Today\'s chart starts when trading begins.' : 'No price history yet for this range.'
          });
        } catch (e) {
          chart.setData({ points: [], empty: e.message || 'Chart data is unavailable right now.' });
        }
      }
      chart.setData(null);
      draw();

      el.addEventListener('click', async (e) => {
        const r = e.target.closest('[data-range]');
        if (r) {
          range = lastRange = r.dataset.range;
          $$('[data-range]', el).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.range === range)));
          draw();
          return;
        }
        const m = e.target.closest('[data-mode]');
        if (m) {
          lastMode = m.dataset.mode;
          $$('[data-mode]', el).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mode === lastMode)));
          draw();
          return;
        }
        const t = e.target.closest('[data-trade]');
        if (t) {
          openTrade({ symbol: sym, side: t.dataset.trade, name: info.name }, () => rerender());
          return;
        }
        const w = e.target.closest('[data-watch]');
        if (w) {
          const on = w.getAttribute('aria-pressed') !== 'true';
          try {
            await api.setWatch(playerId(), sym, on);
            store.watchlist = on ? [sym, ...store.watchlist] : store.watchlist.filter((x) => x !== sym);
            w.setAttribute('aria-pressed', String(on));
            w.setAttribute('aria-label', on ? 'Remove from watchlist' : 'Add to watchlist');
            toast(on ? `${sym} added to your watchlist` : `${sym} removed from your watchlist`);
          } catch (err) {
            toast(err.message, 'bad');
          }
        }
      });

      // Key numbers, about, and news load after the page appears.
      api.getProfile(sym).then((p) => {
        if (!p) return;
        const f = p.fundamentals || {};
        const hi = n(p.week52_high) ?? n(f.week52_high);
        const lo = n(p.week52_low) ?? n(f.week52_low);
        const px = n(quoteOf(sym)?.price);
        const pos52 = hi != null && lo != null && px != null && hi > lo ? Math.min(100, Math.max(0, ((px - lo) / (hi - lo)) * 100)) : null;
        const cells = [];
        if (p.avg_volume_30d) cells.push([term('volume', 'Avg. daily volume'), compactNumber(p.avg_volume_30d)]);
        if (f.market_cap) cells.push([term('market-cap', 'Market cap'), compactMoney(f.market_cap)]);
        if (f.pe) cells.push([term('pe-ratio', 'P/E ratio'), number(f.pe, 1)]);
        if (f.eps) cells.push([term('eps', 'EPS (yearly)'), fmtPrice(f.eps)]);
        if (f.dividend_yield != null) cells.push([term('dividend-yield', 'Dividend yield'), Number(f.dividend_yield) > 0 ? Number(f.dividend_yield).toFixed(2) + '%' : 'None']);
        if (f.beta) cells.push([term('beta', 'Beta'), number(f.beta, 2)]);
        const statsHtml = html`
          ${hi != null && lo != null ? html`<div><div class="split"><span class="muted" style="font-size:var(--step--1)">${term('fifty-two-week-range', '52-week range')}</span><span class="data">${fmtPrice(lo)} to ${fmtPrice(hi)}</span></div>
            <div class="range-bar" aria-hidden="true">${pos52 != null ? raw(`<span style="left:${pos52}%"></span>`) : ''}</div></div>` : ''}
          ${cells.length ? html`<dl class="stats">${cells.map(([k, v]) => html`<div class="stat"><dt>${k}</dt><dd>${v}</dd></div>`)}</dl>` : ''}
          ${!p.fundamentals && !isEtf ? html`<p class="faint" style="font-size:var(--step--1)">${isDemo() ? 'Market cap, P/E, and dividend data appear on your live site.' : 'Company fundamentals appear when the Finnhub key is connected.'}</p>` : ''}`;
        $('#stats-more', el).innerHTML = statsHtml.toString();
        const about = [];
        if (f.industry) about.push(`Industry: ${f.industry}`);
        if (f.ipo) about.push(`Public since ${etDayYear(f.ipo)}`);
        $('#about-more', el).innerHTML = html`${about.join(' · ')}${f.website ? html` · <a href="${f.website}" target="_blank" rel="noopener">Company website</a>` : ''}`.toString();
      }).catch(() => {
        $('#stats-more', el).innerHTML = '';
      });

      if (!isDemo()) {
        api.getNews(sym).then((items) => {
          $('#news', el).innerHTML = (items.length
            ? html`<div class="list">${items.slice(0, 6).map((it) => html`<a class="list-row" style="grid-template-columns: minmax(0,1fr)" href="${it.url}" target="_blank" rel="noopener">
                <span class="who"><b style="font-family:var(--font-body); letter-spacing:0; white-space:normal">${it.headline}</b><span>${it.source ? it.source + ' · ' : ''}${ago(it.created_at)}</span></span></a>`)}</div>`
            : html`<p class="muted">No recent headlines.</p>`).toString();
        }).catch(() => {
          $('#news', el).innerHTML = '<p class="muted">News is unavailable right now.</p>';
        });
      }

      return {
        destroy: () => chart.destroy(),
        tick: () => {
          if (range === '1D' || range === '1W') {
            const quote = quoteOf(sym);
            if (quote && current.length) {
              const p = n(quote.price);
              const last = current[current.length - 1];
              const t = quote.trade_time || quote.updated_at;
              if (Date.parse(t) - Date.parse(last.t) > (range === '1D' ? 5 : 30) * 60000) current.push({ t, o: p, h: p, l: p, c: p });
              else Object.assign(last, { c: p, h: Math.max(last.h ?? p, p), l: Math.min(last.l ?? p, p) });
              chart.setData({ ...chart.data, points: current.map((b) => ({ t: b.t, v: b.c })), candles: current }, { keepHover: true });
            }
          }
        }
      };
    }
  };
}
