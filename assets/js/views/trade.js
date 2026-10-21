// Trade ticket: choose side, order type, amount, and duration; review; submit.
import { html, raw, n, $, $$ } from '../lib/dom.js';
import { money, price as fmtPrice, shares as fmtShares, pctSigned, trend, arrow, etWeekdayTime } from '../lib/format.js';
import { openSheet, toast, term } from '../lib/ui.js';
import { icon } from '../lib/icons.js';
import { store, quoteOf, mergeQuotes, playerId, refreshPlayer, isDemo } from '../state.js';
import { tradingLocked } from '../data/lessons.js';
import { changeOf } from './common.js';

/** Same message as the trading engine and the database, for a ticket that is already open. */
const LESSONS_MESSAGE = 'Finish your required lessons before trading. Open Learn to see what is left.';

const EXPLAIN = {
  market: { buy: 'Buys right away at the current price.', sell: 'Sells right away at the current price.' },
  limit: { buy: 'Buys only at your limit price or lower. It may never fill if the price stays above it.', sell: 'Sells only at your limit price or higher. It may never fill if the price stays below it.' },
  stop: { buy: 'Waits until the price rises to your stop, then buys at the next available price.', sell: 'Waits until the price falls to your stop, then sells at the next available price. Use it to limit a loss or protect a gain.' },
  stop_limit: { buy: 'Once the price rises to your stop, buys only at your limit price or lower.', sell: 'Once the price falls to your stop, sells only at your limit price or higher.' }
};

const roundPx = (v) => (v >= 1 ? Math.round(v * 100) / 100 : Math.round(v * 10000) / 10000);

export function openTrade({ symbol, side = 'buy', name = '' }, onDone) {
  const sym = symbol.toUpperCase();
  const game = store.current.game;
  const s = {
    side,
    type: 'market',
    mode: 'shares',
    qty: '',
    notional: '',
    limit: '',
    stop: '',
    tif: 'day',
    note: '',
    step: 'edit',
    error: '',
    busy: false,
    result: null
  };

  const position = () => store.portfolio?.positions?.find((p) => p.symbol === sym) ?? null;
  const q = () => quoteOf(sym);
  const px = () => n(q()?.price);
  // Required lessons can change while the ticket is open, so the lock is checked at each paint.
  const locked = () => tradingLocked(store.current?.game, store.lessons);

  function lockedNote() {
    return html`<div class="banner gold" role="note" data-trading-locked>${raw(icon('lock'))}
      <div class="grow">Trading opens after you pass your required lessons.</div>
      <a class="btn small" href="#/learn" data-close>${raw(icon('learn'))} Learn</a>
    </div>`;
  }

  function prefill() {
    const p = px();
    if (!p) return;
    const buy = s.side === 'buy';
    if (s.type === 'limit') s.limit = String(roundPx(p * (buy ? 0.98 : 1.02)));
    if (s.type === 'stop') s.stop = String(roundPx(p * (buy ? 1.05 : 0.95)));
    if (s.type === 'stop_limit') {
      s.stop = String(roundPx(p * (buy ? 1.05 : 0.95)));
      s.limit = String(roundPx(p * (buy ? 1.06 : 0.94)));
    }
  }

  function canUseDollars() {
    return s.side === 'buy' && s.type === 'market' && game.allow_fractional;
  }

  function estimate() {
    const p = px();
    const fee = Number(game.commission || 0);
    const estPx = s.type === 'limit' || s.type === 'stop_limit' ? n(s.limit) : s.type === 'stop' ? Math.max(n(s.stop) || 0, p || 0) : p;
    if (s.mode === 'dollars' && canUseDollars()) {
      const amt = n(s.notional);
      return { qty: amt && p ? amt / p : null, total: amt != null ? amt + fee : null, estPx: p };
    }
    const qty = n(s.qty);
    return { qty, total: qty != null && estPx ? qty * estPx + (s.side === 'buy' ? fee : -fee) : null, estPx };
  }

  function localCheck() {
    const e = estimate();
    if (locked()) return LESSONS_MESSAGE;
    if (s.mode === 'dollars' && canUseDollars()) {
      if (!(n(s.notional) > 0)) return 'Enter a dollar amount.';
    } else {
      if (!(n(s.qty) > 0)) return 'Enter how many shares.';
      if (!game.allow_fractional && !Number.isInteger(n(s.qty))) return 'Fractional shares are off in this game. Use a whole number of shares.';
    }
    if ((s.type === 'limit' || s.type === 'stop_limit') && !(n(s.limit) > 0)) return 'Enter a limit price.';
    if ((s.type === 'stop' || s.type === 'stop_limit') && !(n(s.stop) > 0)) return 'Enter a stop price.';
    if (s.side === 'buy' && e.total != null && store.portfolio && e.total > store.portfolio.buying_power + 0.005) {
      return `Not enough buying power. This order needs about ${money(e.total)}, and you have ${money(store.portfolio.buying_power)} available.`;
    }
    if (s.side === 'sell') {
      const held = n(position()?.qty) || 0;
      if (held <= 0) return `You do not own any shares of ${sym}.`;
      if (n(s.qty) > held + 1e-9) return `You own ${fmtShares(held)} shares of ${sym}.`;
    }
    return '';
  }

  function marketNote() {
    const m = store.market;
    if (!m || m.demo || m.is_open) return '';
    return `The market is closed. ${s.type === 'market' ? 'This order will fill at the first price after the opening bell' : 'This order will start watching prices at the opening bell'}, ${etWeekdayTime(m.next_open_at)}.`;
  }

  function priceLine() {
    const quote = q();
    const c = changeOf(quote);
    return html`<div class="split">
      <div class="row-wrap"><b class="data" style="font-size:var(--step-1)">${sym}</b><span class="muted">${name}</span></div>
      <div class="data"><b data-q="${sym}" data-f="price">${quote ? fmtPrice(quote.price) : '...'}</b>
        <span class="${trend(c.pct)}" data-q="${sym}" data-f="chg">${c.pct == null ? '' : `${arrow(c.pct)} ${pctSigned(c.pct)}`}</span></div>
    </div>`;
  }

  function editBody() {
    const pos = position();
    const held = n(pos?.qty) || 0;
    const types = [['market', 'Market'], ['limit', 'Limit'], ['stop', 'Stop'], ['stop_limit', 'Stop limit']];
    const dollars = s.mode === 'dollars' && canUseDollars();
    return html`
      ${priceLine()}
      <div class="seg buy-sell" role="group" aria-label="Buy or sell">
        <button type="button" data-side="buy" data-value="buy" aria-pressed="${s.side === 'buy'}">Buy</button>
        <button type="button" data-side="sell" data-value="sell" aria-pressed="${s.side === 'sell'}">Sell</button>
      </div>
      <div class="field">
        <span class="label">Order type (${term('market-order', 'what are these?')})</span>
        <div class="seg" role="group" aria-label="Order type">
          ${types.map(([v, l]) => html`<button type="button" data-type="${v}" aria-pressed="${s.type === v}">${l}</button>`)}
        </div>
        <p class="explain">${EXPLAIN[s.type][s.side]}</p>
      </div>
      ${canUseDollars() ? html`<div class="seg" role="group" aria-label="Amount in">
          <button type="button" data-mode="shares" aria-pressed="${!dollars}">Shares</button>
          <button type="button" data-mode="dollars" aria-pressed="${dollars}">Dollars</button>
        </div>` : ''}
      <div class="calc-grid">
        ${dollars
          ? html`<div class="field"><label for="t-notional">Amount to invest</label>
              <div class="input-affix"><span class="affix">$</span><input id="t-notional" class="input" inputmode="decimal" autocomplete="off" value="${s.notional}" placeholder="500.00"></div></div>`
          : html`<div class="field"><label for="t-qty">Shares</label>
              <input id="t-qty" class="input" inputmode="decimal" autocomplete="off" value="${s.qty}" placeholder="${game.allow_fractional ? '10 or 2.5' : '10'}">
              ${s.side === 'sell' && held > 0 ? html`<button type="button" class="btn ghost small" data-sellall style="justify-self:start">Sell all ${fmtShares(held)}</button>` : ''}</div>`}
        ${s.type === 'stop' || s.type === 'stop_limit'
          ? html`<div class="field"><label for="t-stop">Stop price</label>
              <div class="input-affix"><span class="affix">$</span><input id="t-stop" class="input" inputmode="decimal" autocomplete="off" value="${s.stop}"></div></div>`
          : ''}
        ${s.type === 'limit' || s.type === 'stop_limit'
          ? html`<div class="field"><label for="t-limit">Limit price</label>
              <div class="input-affix"><span class="affix">$</span><input id="t-limit" class="input" inputmode="decimal" autocomplete="off" value="${s.limit}"></div></div>`
          : ''}
      </div>
      ${s.type !== 'market'
        ? html`<div class="field"><span class="label">How long it lasts (${term('time-in-force', 'time in force')})</span>
            <div class="seg" role="group" aria-label="Time in force">
              <button type="button" data-tif="day" aria-pressed="${s.tif === 'day'}">Day</button>
              <button type="button" data-tif="gtc" aria-pressed="${s.tif === 'gtc'}">Good 'til canceled</button>
            </div></div>`
        : ''}
      <div class="field"><label for="t-note">Why this trade? <span class="faint">(optional, your mentor can read it)</span></label>
        <textarea id="t-note" class="input" maxlength="280" placeholder="One or two sentences: why this company, why now, and what would make you sell.">${s.note}</textarea></div>
      <div class="summary-box" data-summary></div>
      ${marketNote() ? html`<p class="form-note">${marketNote()}</p>` : ''}
      <p class="form-error" data-error role="alert">${s.error}</p>
      ${locked() ? lockedNote() : html`<button type="button" class="btn block ${s.side}" data-review>Review ${s.side === 'buy' ? 'buy' : 'sell'} order</button>`}`;
  }

  function summaryHtml() {
    const e = estimate();
    const pf = store.portfolio;
    const pos = position();
    const rows = [];
    if (s.side === 'buy') {
      rows.push(['Estimated cost', e.total != null ? money(e.total) : 'n/a']);
      if (e.qty != null && s.mode === 'dollars' && canUseDollars()) rows.push(['About', `${fmtShares(e.qty)} shares`]);
      rows.push(['Buying power', pf ? money(pf.buying_power) : 'n/a']);
    } else {
      rows.push(['Estimated credit', e.total != null ? money(e.total) : 'n/a']);
      rows.push(['Shares you own', pos ? fmtShares(pos.qty) : '0']);
    }
    if (Number(game.commission) > 0) rows.push(['Commission', money(game.commission)]);
    return rows.map(([k, v]) => `<div class="split"><span>${k}</span><b>${v}</b></div>`).join('');
  }

  function sentence() {
    const e = estimate();
    const amount = s.mode === 'dollars' && canUseDollars() ? `${money(n(s.notional))} of ${sym}` : `${fmtShares(n(s.qty))} ${n(s.qty) === 1 ? 'share' : 'shares'} of ${sym}`;
    const verb = s.side === 'buy' ? 'Buy' : 'Sell';
    switch (s.type) {
      case 'market':
        return `${verb} ${amount} at the market price (about ${fmtPrice(e.estPx)} now).`;
      case 'limit':
        return `${verb} ${amount} only at ${fmtPrice(n(s.limit))} or ${s.side === 'buy' ? 'lower' : 'higher'}.`;
      case 'stop':
        return `When ${sym} ${s.side === 'buy' ? 'rises' : 'falls'} to ${fmtPrice(n(s.stop))}, ${verb.toLowerCase()} ${amount} at the next price.`;
      default:
        return `When ${sym} ${s.side === 'buy' ? 'rises' : 'falls'} to ${fmtPrice(n(s.stop))}, ${verb.toLowerCase()} ${amount} at ${fmtPrice(n(s.limit))} or ${s.side === 'buy' ? 'lower' : 'higher'}.`;
    }
  }

  function reviewBody() {
    return html`
      ${priceLine()}
      <div class="summary-box">
        <p style="font-size:var(--step-1); color:var(--text)">${sentence()}</p>
        ${raw(summaryHtml())}
        ${s.type !== 'market' ? html`<div class="split"><span>Lasts</span><b>${s.tif === 'day' ? (isDemo() ? 'Until the end of today' : 'Until the market close') : 'Until filled or canceled (90 days max)'}</b></div>` : ''}
        ${s.note ? html`<div><span class="muted">Your note:</span> ${s.note}</div>` : ''}
      </div>
      ${marketNote() ? html`<p class="form-note">${marketNote()}</p>` : ''}
      <p class="form-error" data-error role="alert">${s.error}</p>
      ${locked() ? lockedNote() : ''}
      <div class="row-wrap">
        ${locked() ? '' : html`<button type="button" class="btn ${s.side}" data-submit ${s.busy ? 'disabled' : ''}>${s.busy ? 'Sending...' : `Submit ${s.side} order`}</button>`}
        <button type="button" class="btn secondary" data-edit>Edit</button>
      </div>`;
  }

  function doneBody() {
    const o = s.result;
    let headline;
    let detail = '';
    if (o.status === 'filled') {
      headline = `${o.side === 'buy' ? 'Bought' : 'Sold'} ${fmtShares(o.filled_qty)} ${Number(o.filled_qty) === 1 ? 'share' : 'shares'} of ${sym} at ${fmtPrice(o.filled_price)}.`;
      detail = `Total ${money(Number(o.filled_qty) * Number(o.filled_price))}.`;
    } else if (o.status === 'open') {
      headline = 'Order placed.';
      detail = o.order_type === 'market'
        ? 'It will fill at the first price after the market opens.'
        : o.stop_triggered
          ? 'Your stop was reached. It will fill when the price meets your limit.'
          : `It will fill if ${sym} reaches your price. Track it in Orders.`;
    } else {
      headline = 'This order did not go through.';
      detail = o.reason || '';
    }
    return html`<div class="banner ${o.status === 'rejected' ? '' : 'gold'}"><div class="grow"><b>${headline}</b><br><span class="muted">${detail}</span></div></div>
      <div class="row-wrap">
        <a class="btn" href="#/orders" data-close>View orders</a>
        <button type="button" class="btn secondary" data-close>Done</button>
      </div>`;
  }

  let root;
  function paint() {
    const body = s.step === 'edit' ? editBody() : s.step === 'review' ? reviewBody() : doneBody();
    root.innerHTML = body.toString();
    if (s.step === 'edit') {
      const sum = $('[data-summary]', root);
      if (sum) sum.innerHTML = summaryHtml();
    }
  }

  function updateLive() {
    if (!root || s.step !== 'edit') return;
    const sum = $('[data-summary]', root);
    if (sum) sum.innerHTML = summaryHtml();
  }

  const sheetTitle = s.side === 'buy' ? `Trade ${sym}` : `Trade ${sym}`;
  let interval;
  openSheet({
    title: sheetTitle,
    body: '<div data-ticket class="stack"></div>',
    onMount: (sheet, close) => {
      root = $('[data-ticket]', sheet);
      prefill();
      paint();
      store.api.getQuotes([sym]).then((m) => {
        mergeQuotes(m);
        if (!s.limit && !s.stop) prefill();
        updateLive();
        for (const el of $$('[data-q]', sheet)) {
          const quote = quoteOf(sym);
          if (el.dataset.f === 'price' && quote) el.textContent = fmtPrice(quote.price);
        }
      }).catch(() => {});

      sheet.addEventListener('click', async (e) => {
        const t = e.target.closest('button, a');
        if (!t) return;
        if (t.dataset.side && t.dataset.side !== s.side) {
          s.side = t.dataset.side;
          if (s.side === 'sell') s.mode = 'shares';
          s.error = '';
          prefill();
          paint();
        } else if (t.dataset.type && t.dataset.type !== s.type) {
          s.type = t.dataset.type;
          if (s.type !== 'market') s.mode = 'shares';
          s.error = '';
          prefill();
          paint();
        } else if (t.dataset.mode && t.dataset.mode !== s.mode) {
          s.mode = t.dataset.mode;
          paint();
        } else if (t.dataset.tif) {
          s.tif = t.dataset.tif;
          paint();
        } else if (t.hasAttribute('data-sellall')) {
          s.qty = String(n(position()?.qty) || '');
          paint();
        } else if (t.hasAttribute('data-review')) {
          s.error = localCheck();
          if (s.error) {
            $('[data-error]', root).textContent = s.error;
            return;
          }
          s.step = 'review';
          paint();
        } else if (t.hasAttribute('data-edit')) {
          s.step = 'edit';
          s.error = '';
          paint();
        } else if (t.hasAttribute('data-submit')) {
          s.busy = true;
          paint();
          try {
            const dollars = s.mode === 'dollars' && canUseDollars();
            const order = await store.api.placeOrder(playerId(), {
              symbol: sym,
              side: s.side,
              order_type: s.type,
              qty: dollars ? null : n(s.qty),
              notional: dollars ? n(s.notional) : null,
              limit_price: s.type === 'limit' || s.type === 'stop_limit' ? n(s.limit) : null,
              stop_price: s.type === 'stop' || s.type === 'stop_limit' ? n(s.stop) : null,
              time_in_force: s.tif,
              note: s.note.trim() || null
            });
            s.result = order;
            s.step = 'done';
            s.busy = false;
            paint();
            if (order.status === 'filled') toast(`${order.side === 'buy' ? 'Bought' : 'Sold'} ${sym}`, 'good');
            await refreshPlayer().catch(() => {});
            if (onDone) onDone(order);
          } catch (err) {
            s.busy = false;
            s.error = err.message || 'The order did not go through.';
            paint();
          }
        }
      });

      sheet.addEventListener('input', (e) => {
        const id = e.target.id;
        if (id === 't-qty') s.qty = e.target.value.replace(/[^0-9.]/g, '');
        if (id === 't-notional') s.notional = e.target.value.replace(/[^0-9.]/g, '');
        if (id === 't-limit') s.limit = e.target.value.replace(/[^0-9.]/g, '');
        if (id === 't-stop') s.stop = e.target.value.replace(/[^0-9.]/g, '');
        if (id === 't-note') s.note = e.target.value;
        if (id !== 't-note') {
          s.error = '';
          const err = $('[data-error]', root);
          if (err) err.textContent = '';
        }
        updateLive();
      });

      interval = setInterval(async () => {
        try {
          mergeQuotes(await store.api.getQuotes([sym]));
          for (const el of $$('[data-q]', sheet)) {
            const quote = quoteOf(sym);
            if (!quote) continue;
            if (el.dataset.f === 'price') el.textContent = fmtPrice(quote.price);
            if (el.dataset.f === 'chg') {
              const c = changeOf(quote);
              el.textContent = c.pct == null ? '' : `${arrow(c.pct)} ${pctSigned(c.pct)}`;
              el.className = trend(c.pct);
            }
          }
          updateLive();
        } catch (_) {
          // ignore
        }
      }, isDemo() ? 4000 : 20000);
    },
    onClose: () => clearInterval(interval)
  });
}
