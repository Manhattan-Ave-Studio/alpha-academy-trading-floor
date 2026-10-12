// Portfolio: totals, allocation, holdings, and performance. Also used read-only for classmates.
import { html, raw, $ } from '../lib/dom.js';
import { money, moneySigned, price as fmtPrice, pctSigned, trend, arrow, etDay, shares as fmtShares } from '../lib/format.js';
import { PriceChart, donutSvg } from '../lib/charts.js';
import { term } from '../lib/ui.js';
import { store, playerId } from '../state.js';
import { pageHead, footer, empty, symBadge, demoBanner } from './common.js';
import { performanceSeries, perfTip } from './home.js';

const COLORS = ['--c1', '--c2', '--c3', '--c4', '--c5', '--c6', '--c7', '--c8'];

function allocation(pf, by) {
  const groups = new Map();
  for (const p of pf.positions) {
    const key = by === 'sector' ? (p.asset_type === 'etf' ? 'Funds (ETFs)' : p.sector || 'Other') : p.symbol;
    groups.set(key, (groups.get(key) || 0) + Number(p.market_value));
  }
  const rows = [...groups.entries()].sort((a, b) => b[1] - a[1]);
  const top = rows.slice(0, 7);
  const rest = rows.slice(7).reduce((s, r) => s + r[1], 0);
  if (rest > 0) top.push(['Other', rest]);
  if (Number(pf.cash) > 0.005) top.push(['Cash', Number(pf.cash)]);
  return top.map(([label, value], i) => ({ label, value, color: label === 'Cash' ? '--surface-3' : COLORS[i % COLORS.length] }));
}

export function holdingsTable(pf, { linkStocks = true } = {}) {
  if (!pf.positions.length) return empty('No holdings yet', 'Buy a stock or fund and it will show up here.');
  return html`<div class="table-wrap"><table class="table">
    <thead><tr>
      <th>Holding</th><th class="r">Shares</th><th class="r">${term('cost-basis', 'Avg cost')}</th><th class="r">Price</th>
      <th class="r">Value</th><th class="r">Today</th><th class="r">${term('unrealized-gain', 'Total return')}</th>
    </tr></thead>
    <tbody>${pf.positions.map((p) => html`<tr>
      <td>${linkStocks ? html`<a class="sym" href="#/stock/${p.symbol}">${p.symbol}</a>` : html`<b class="data">${p.symbol}</b>`}<br><span class="faint" style="font-size:var(--step--2)">${p.name}</span></td>
      <td class="r">${fmtShares(p.qty)}</td>
      <td class="r">${fmtPrice(p.avg_cost)}</td>
      <td class="r">${fmtPrice(p.price)}</td>
      <td class="r"><b>${money(p.market_value)}</b></td>
      <td class="r ${trend(p.day_change)}">${moneySigned(p.day_change)}<br><span style="font-size:var(--step--2)">${pctSigned(p.day_change_pct)}</span></td>
      <td class="r ${trend(p.unrealized_pl)}">${moneySigned(p.unrealized_pl)}<br><span style="font-size:var(--step--2)">${pctSigned(p.unrealized_pct)}</span></td>
    </tr>`)}</tbody>
  </table></div>`;
}

export function allocationPanel(pf) {
  return html`<section class="panel">
    <div class="panel-head"><h3>${term('allocation', 'Allocation')}</h3>
      <div class="seg" role="group" aria-label="Group by">
        <button type="button" data-alloc="symbol" aria-pressed="true">Holdings</button>
        <button type="button" data-alloc="sector" aria-pressed="false">Sectors</button>
      </div></div>
    <div id="alloc"></div>
  </section>`;
}

export function paintAllocation(el, pf, by) {
  const slices = allocation(pf, by);
  const total = Number(pf.total_value) || 1;
  const largest = pf.positions.length ? Math.max(...pf.positions.map((p) => Number(p.market_value))) / total * 100 : 0;
  $('#alloc', el).innerHTML = `<div class="donut-wrap">
    <div>${donutSvg(slices, { centerTop: 'Total', centerBottom: money(pf.total_value, { whole: true }) })}</div>
    <div class="donut-legend">${slices.map((s) => `<div class="item"><span class="sw" style="background: var(${s.color})"></span><span>${s.label}</span><span class="data">${((s.value / total) * 100).toFixed(1)}%</span></div>`).join('')}
      ${largest > 35 && by === 'symbol' ? `<p class="form-note" style="margin-top:6px">One holding is ${largest.toFixed(0)}% of your money. See the diversification lesson for why that matters.</p>` : ''}
    </div></div>`;
}

export async function render() {
  const api = store.api;
  const pid = playerId();
  const [pf, summary] = await Promise.all([api.getPortfolio(pid), api.gameSummary(store.current.game.id)]);
  store.portfolio = pf;
  store.summary = summary;
  const game = summary.game;

  const markup = html`
    ${pageHead('Portfolio', `Everything you own in ${game.name}, valued at the latest prices.`, html`<a class="btn secondary" href="#/orders">Orders and activity</a>`)}
    ${demoBanner()}
    <section class="panel hero-value">
      <div class="stack" style="gap:6px">
        <span class="eyebrow">Total value</span>
        <div class="big" data-pf="total_value">${money(pf.total_value)}</div>
        <div class="change-line"><span data-pf="day_change" class="${trend(pf.day_change)}">${arrow(pf.day_change)} ${moneySigned(pf.day_change)}</span><span data-pf="day_change_pct" class="${trend(pf.day_change_pct)}">${pctSigned(pf.day_change_pct)}</span><span class="muted" style="font-weight:500">today</span></div>
      </div>
      <div class="kpis">
        <div class="kpi"><span class="label">Invested</span><span class="value" data-pf="holdings_value">${money(pf.holdings_value)}</span></div>
        <div class="kpi"><span class="label">${term('cash', 'Cash')}</span><span class="value" data-pf="cash">${money(pf.cash)}</span>
          ${Number(pf.reserved) > 0 ? html`<span class="sub muted">${money(pf.reserved)} set aside for open buy orders</span>` : ''}</div>
        <div class="kpi"><span class="label">${term('total-return', 'Total return')}</span><span class="value"><span data-pf="total_return" class="${trend(pf.total_return)}">${moneySigned(pf.total_return)}</span></span><span class="sub ${trend(pf.total_return_pct)}">${pctSigned(pf.total_return_pct)} since ${etDay(game.starts_at)}</span></div>
        <div class="kpi"><span class="label">${term('realized-gain', 'Realized gains')}</span><span class="value ${trend(pf.realized_pl)}">${moneySigned(pf.realized_pl)}</span><span class="sub muted">Locked in by selling</span></div>
      </div>
    </section>

    <div class="grid-2">
      <section class="panel flush">
        <div class="panel-head"><h3>Holdings</h3><span class="faint" style="font-size:var(--step--1)">${pf.positions.length} ${pf.positions.length === 1 ? 'position' : 'positions'}</span></div>
        ${holdingsTable(pf)}
      </section>
      ${allocationPanel(pf)}
    </div>

    <section class="panel">
      <div class="panel-head"><h3>Performance</h3>
        <div class="legend"><span><i style="background: var(--gold)"></i>You</span><span><i class="dash"></i>S&amp;P 500, same starting cash</span></div></div>
      <div class="chart" id="pf-chart"></div>
    </section>
    ${footer()}`;

  return {
    html: markup,
    async mount(el) {
      paintAllocation(el, pf, 'symbol');
      el.addEventListener('click', (e) => {
        const b = e.target.closest('[data-alloc]');
        if (!b) return;
        el.querySelectorAll('[data-alloc]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
        paintAllocation(el, store.portfolio || pf, b.dataset.alloc);
      });
      const chart = new PriceChart($('#pf-chart', el), { label: 'Portfolio value over time' });
      try {
        const { pts, bench } = await performanceSeries(pid, game, summary, pf.total_value);
        chart.setData({ points: pts, bench, color: '--gold', xLabel: (t) => etDay(t), yLabel: (v) => '$' + Math.round(v).toLocaleString('en-US'), tip: perfTip(pts, bench), empty: 'Your chart fills in after the first market close.' });
      } catch (_) {
        chart.setData({ points: [], empty: 'Performance history is not available yet.' });
      }
      return () => chart.destroy();
    }
  };
}
