// Orders: open orders (cancel), order history with reasons, and the cash ledger.
import { html, raw, $ } from '../lib/dom.js';
import { money, moneySigned, price as fmtPrice, etWhen, shares as fmtShares, trend, TIF_LABEL } from '../lib/format.js';
import { toast, confirmSheet } from '../lib/ui.js';
import { store, playerId, refreshPlayer } from '../state.js';
import { pageHead, footer, empty, statusChip, describeOrder } from './common.js';

let lastTab = 'open';

export function orderRow(o, { cancel = false } = {}) {
  return html`<div class="list-row" style="grid-template-columns: minmax(0, 1fr) auto; align-items:start">
    <div class="who" style="gap:4px">
      <span><a class="sym data" href="#/stock/${o.symbol}" style="font-weight:700; color:var(--text); text-decoration:none">${o.symbol}</a>
        <span class="muted" style="font-size:var(--step--1)"> · ${describeOrder(o)}${o.order_type !== 'market' ? ` · ${TIF_LABEL[o.time_in_force]}` : ''}</span></span>
      <span class="faint" style="font-size:var(--step--1); white-space:normal">
        ${o.status === 'filled' ? `Filled ${fmtShares(o.filled_qty)} at ${fmtPrice(o.filled_price)} · ${etWhen(o.filled_at)}` : `Placed ${etWhen(o.created_at)}`}
        ${o.stop_triggered && o.status === 'open' ? ' · Stop reached, waiting for the limit' : ''}
        ${o.reason && o.status !== 'filled' ? ` · ${o.reason}` : ''}
      </span>
      ${o.note ? html`<span style="font-size:var(--step--1); white-space:normal; color:var(--muted)">"${o.note}"</span>` : ''}
    </div>
    <div class="row-wrap" style="justify-content:flex-end">
      ${statusChip(o.status, o.reason)}
      ${cancel && o.status === 'open' ? html`<button type="button" class="btn danger small" data-cancel="${o.id}">Cancel</button>` : ''}
    </div>
  </div>`;
}

export async function render({ rerender }) {
  const api = store.api;
  const pid = playerId();
  const [orders, txns] = await Promise.all([api.listOrders(pid), api.listTransactions(pid)]);
  const open = orders.filter((o) => o.status === 'open');
  const closed = orders.filter((o) => o.status !== 'open');
  const tab = ['open', 'history', 'activity'].includes(lastTab) ? lastTab : 'open';

  const panels = {
    open: open.length
      ? html`<div class="list">${open.map((o) => orderRow(o, { cancel: true }))}</div>`
      : empty('No open orders', 'Limit and stop orders wait here until they fill, expire, or you cancel them.'),
    history: closed.length
      ? html`<div class="list">${closed.map((o) => orderRow(o))}</div>`
      : empty('No order history yet'),
    activity: txns.length
      ? html`<div class="table-wrap"><table class="table">
          <thead><tr><th>When</th><th>Activity</th><th class="r">Amount</th><th class="r">Cash after</th></tr></thead>
          <tbody>${txns.map((t) => html`<tr>
            <td>${etWhen(t.created_at)}</td>
            <td>${t.kind === 'buy' ? `Bought ${fmtShares(t.qty)} ${t.symbol} at ${fmtPrice(t.price)}`
              : t.kind === 'sell' ? html`Sold ${fmtShares(t.qty)} ${t.symbol} at ${fmtPrice(t.price)}${t.realized_pl != null ? html` <span class="${trend(t.realized_pl)}">(${moneySigned(t.realized_pl)} realized)</span>` : ''}`
              : t.note || (t.kind === 'reset' ? 'Game reset' : 'Adjustment')}</td>
            <td class="r ${trend(t.amount)}">${moneySigned(t.amount)}</td>
            <td class="r">${money(t.cash_after)}</td>
          </tr>`)}</tbody></table></div>`
      : empty('No activity yet')
  };

  const markup = html`
    ${pageHead('Orders', 'Every order you have placed and every dollar that moved.')}
    <section class="panel flush">
      <div class="panel-head">
        <div class="seg" role="tablist" aria-label="Order views">
          <button type="button" role="tab" data-tab="open" aria-pressed="${tab === 'open'}" aria-selected="${tab === 'open'}">Open (${open.length})</button>
          <button type="button" role="tab" data-tab="history" aria-pressed="${tab === 'history'}" aria-selected="${tab === 'history'}">History</button>
          <button type="button" role="tab" data-tab="activity" aria-pressed="${tab === 'activity'}" aria-selected="${tab === 'activity'}">Activity</button>
        </div>
      </div>
      <div id="orders-body" style="margin-top:4px">${panels[tab]}</div>
    </section>
    ${footer()}`;

  return {
    html: markup,
    mount(el) {
      el.addEventListener('click', async (e) => {
        const tb = e.target.closest('[data-tab]');
        if (tb) {
          lastTab = tb.dataset.tab;
          el.querySelectorAll('[data-tab]').forEach((b) => {
            b.setAttribute('aria-pressed', String(b === tb));
            b.setAttribute('aria-selected', String(b === tb));
          });
          $('#orders-body', el).innerHTML = panels[lastTab].toString();
          return;
        }
        const c = e.target.closest('[data-cancel]');
        if (c) {
          const ok = await confirmSheet({ title: 'Cancel this order?', message: 'It will stop waiting for a fill. You can place a new order any time.', confirmLabel: 'Cancel order', danger: true });
          if (!ok) return;
          try {
            await api.cancelOrder(c.dataset.cancel);
            toast('Order canceled');
            await refreshPlayer().catch(() => {});
            rerender();
          } catch (err) {
            toast(err.message, 'bad');
          }
        }
      });
    }
  };
}
