// Shared view fragments and live bindings (prices update in place without re-rendering).
import { html, raw, n, esc, $$ } from '../lib/dom.js';
import { money, moneySigned, price, pctSigned, trend, arrow, etTime, etWeekdayTime, initials, compactMoney } from '../lib/format.js';
import { icon } from '../lib/icons.js';
import { store, quoteOf, isDemo } from '../state.js';

export function symBadge(sym, assetType = 'stock', logo = null, size = '') {
  return html`<span class="mono-badge ${assetType === 'etf' ? 'etf' : ''} ${size}" aria-hidden="true">${logo ? raw(`<img src="${esc(logo)}" alt="" loading="lazy">`) : initials(sym)}</span>`;
}

export function changeOf(q) {
  if (!q) return { abs: null, pct: null };
  const p = n(q.price);
  const pc = n(q.prev_close);
  if (p == null || pc == null || pc === 0) return { abs: null, pct: null };
  return { abs: p - pc, pct: (p / pc - 1) * 100 };
}

/** Live-bound price text for a symbol. */
export function livePrice(sym, cls = '') {
  const q = quoteOf(sym);
  return html`<span class="${cls}" data-q="${sym}" data-f="price">${q ? price(q.price) : '...'}</span>`;
}

/** Live-bound change text: arrow, percent, optional dollars. */
export function liveChange(sym, { dollars = false, cls = '' } = {}) {
  const q = quoteOf(sym);
  const c = changeOf(q);
  const text = c.pct == null ? '' : `${arrow(c.pct)} ${dollars ? moneySigned(c.abs) + ' (' : ''}${pctSigned(c.pct)}${dollars ? ')' : ''}`;
  return html`<span class="${trend(c.pct)} ${cls}" data-q="${sym}" data-f="${dollars ? 'chg-full' : 'chg'}">${text}</span>`;
}

export function quoteRow(item, { href = null, meta = null } = {}) {
  const sym = item.symbol;
  return html`<a class="list-row" href="${href || '#/stock/' + encodeURIComponent(sym)}">
    ${symBadge(sym, item.asset_type || item.type)}
    <span class="who"><b>${sym}</b><span>${meta ?? item.name ?? ''}</span></span>
    <span class="px">${livePrice(sym)}${liveChange(sym)}</span>
  </a>`;
}

export function updateBindings(root = document) {
  for (const el of $$('[data-q]', root)) {
    const sym = el.dataset.q;
    const q = quoteOf(sym);
    if (!q) continue;
    const f = el.dataset.f;
    if (f === 'price') {
      const next = price(q.price);
      if (el.textContent !== next) {
        el.textContent = next;
      }
    } else if (f === 'chg' || f === 'chg-full') {
      const c = changeOf(q);
      if (c.pct == null) continue;
      el.textContent = f === 'chg' ? `${arrow(c.pct)} ${pctSigned(c.pct)}` : `${arrow(c.pct)} ${moneySigned(c.abs)} (${pctSigned(c.pct)})`;
      el.classList.remove('up', 'down', 'flat');
      el.classList.add(trend(c.pct));
    } else if (f === 'time') {
      el.textContent = q.trade_time ? etTime(q.trade_time) : '';
    }
  }
  const pf = store.portfolio;
  if (pf) {
    for (const el of $$('[data-pf]', root)) {
      const k = el.dataset.pf;
      const v = pf[k];
      if (k === 'total_value' || k === 'cash' || k === 'buying_power' || k === 'holdings_value') el.textContent = money(v);
      else if (k === 'day_change' || k === 'total_return' || k === 'realized_pl') {
        el.textContent = `${arrow(v)} ${moneySigned(v)}`.trim();
        el.className = trend(v);
      } else if (k === 'day_change_pct' || k === 'total_return_pct') {
        el.textContent = pctSigned(v);
        el.className = trend(v);
      }
    }
  }
}

export function marketBadge(m) {
  if (!m) return html`<span class="market-badge"><span class="status-dot"></span>Loading market</span>`;
  if (m.demo) {
    return html`<span class="market-badge" title="Simulated prices"><span class="status-dot demo"></span><span class="long">Demo market</span><span class="short">Demo</span><span class="when">open 24/7</span></span>`;
  }
  if (m.is_open) {
    return html`<span class="market-badge"><span class="status-dot open"></span><span class="long">Market open</span><span class="short">Open</span><span class="when">closes ${etTime(m.close_at)}</span></span>`;
  }
  return html`<span class="market-badge"><span class="status-dot"></span><span class="long">Market closed</span><span class="short">Closed</span><span class="when">opens ${etWeekdayTime(m.next_open_at)}</span></span>`;
}

export function demoBanner() {
  if (!isDemo()) return '';
  return html`<div class="banner gold" role="note">${raw(icon('info'))}
    <div class="grow"><b>Demo mode.</b> Prices are simulated and your classmates are sample players, so you can try every feature right now. Your live site uses real market prices once it is connected.</div>
  </div>`;
}

export function pageHead(title, lede = '', actions = '') {
  return html`<div class="page-head"><div><h1>${title}</h1>${lede ? html`<p class="lede">${lede}</p>` : ''}</div>${actions ? html`<div class="row-wrap">${actions}</div>` : ''}</div>`;
}

export function empty(title, body = '', action = '') {
  return html`<div class="empty"><b>${title}</b>${body ? html`<span>${body}</span>` : ''}${action}</div>`;
}

export function footer() {
  const c = store.config;
  const source = isDemo() ? 'Simulated demo prices.' : 'Market data from Alpaca (IEX exchange prices, updated about every minute during market hours) and Finnhub.';
  return html`<footer class="foot">
    <span>${c.programName} is the signature mentoring program of the ${c.chapterName} of ${c.orgName}, Brooklyn, New York.</span>
    <span>${source} Play money for learning. Nothing here is investment advice.</span>
  </footer>`;
}

export function statusChip(status, reason) {
  const map = { filled: 'up', open: 'gold', cancelled: '', expired: '', rejected: 'down' };
  const label = { filled: 'Filled', open: 'Open', cancelled: 'Canceled', expired: 'Expired', rejected: 'Rejected' }[status] || status;
  return html`<span class="chip ${map[status] ?? ''}" ${reason ? raw(`title="${esc(reason)}"`) : ''}>${label}</span>`;
}

export function describeOrder(o) {
  const qty = o.qty != null ? `${Number(o.qty).toLocaleString('en-US', { maximumFractionDigits: 4 })} sh` : money(o.notional);
  const type = { market: 'Market', limit: `Limit ${price(o.limit_price)}`, stop: `Stop ${price(o.stop_price)}`, stop_limit: `Stop ${price(o.stop_price)}, limit ${price(o.limit_price)}` }[o.order_type];
  return `${o.side === 'buy' ? 'Buy' : 'Sell'} ${qty} · ${type}`;
}

export function compact(v) {
  return compactMoney(v);
}
