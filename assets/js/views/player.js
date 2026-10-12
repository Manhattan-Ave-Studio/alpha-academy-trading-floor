// A classmate's holdings (when the mentor shares holdings) or any player for mentors.
import { html, raw } from '../lib/dom.js';
import { money, moneySigned, pctSigned, trend, arrow, etWhen } from '../lib/format.js';
import { icon } from '../lib/icons.js';
import { store } from '../state.js';
import { pageHead, footer, empty } from './common.js';
import { holdingsTable, allocationPanel, paintAllocation } from './portfolio.js';
import { orderRow } from './orders.js';
import { LESSONS, isPassed, passedCount } from '../data/lessons.js';

export async function render({ params, mentorView = false }) {
  const api = store.api;
  const pid = params.id;
  let pf;
  try {
    pf = await api.getPortfolio(pid);
  } catch (e) {
    return { html: html`<div class="panel">${empty('This portfolio is private', e.message, html`<a class="btn" href="#/leaderboard">Back to the leaderboard</a>`)}</div>` };
  }
  const [orders, lessons] = mentorView
    ? await Promise.all([api.listOrders(pid).catch(() => []), api.lessonProgress(pid).catch(() => ({}))])
    : [[], {}];
  const notes = orders.filter((o) => o.note);

  const markup = html`
    <div class="split"><a class="btn ghost small" href="${mentorView ? '#/mentor' : '#/leaderboard'}">${raw(icon('back'))} ${mentorView ? 'Mentor panel' : 'Leaderboard'}</a></div>
    ${pageHead(pf.display_name || 'Player', mentorView ? 'Mentor view: holdings, trade notes, and lesson progress.' : 'Holdings only. Order notes stay private.')}
    <section class="panel hero-value">
      <div class="stack" style="gap:6px">
        <span class="eyebrow">Total value</span>
        <div class="big">${money(pf.total_value)}</div>
        <div class="change-line"><span class="${trend(pf.total_return)}">${arrow(pf.total_return)} ${moneySigned(pf.total_return)}</span><span class="${trend(pf.total_return_pct)}">${pctSigned(pf.total_return_pct)}</span><span class="muted" style="font-weight:500">since the start</span></div>
      </div>
      <div class="kpis">
        <div class="kpi"><span class="label">Cash</span><span class="value">${money(pf.cash)}</span></div>
        <div class="kpi"><span class="label">Invested</span><span class="value">${money(pf.holdings_value)}</span></div>
        <div class="kpi"><span class="label">Today</span><span class="value ${trend(pf.day_change)}">${moneySigned(pf.day_change)}</span></div>
      </div>
    </section>
    <div class="grid-2">
      <section class="panel flush"><div class="panel-head"><h3>Holdings</h3></div>${holdingsTable(pf)}</section>
      ${allocationPanel(pf)}
    </div>
    ${mentorView ? html`
      <div class="grid-2">
        <section class="panel flush"><div class="panel-head"><h3>Trade notes</h3><span class="faint" style="font-size:var(--step--1)">${notes.length} with a reason written</span></div>
          ${notes.length ? html`<div class="list">${notes.slice(0, 30).map((o) => orderRow(o))}</div>` : empty('No notes yet', 'Encourage a one-sentence reason with every trade.')}</section>
        <section class="panel"><div class="panel-head"><h3>Lessons</h3><span class="faint" style="font-size:var(--step--1)">${passedCount(lessons)} of ${LESSONS.length} passed</span></div>
          <div class="list">${LESSONS.map((l) => html`<div class="list-row" style="grid-template-columns: minmax(0,1fr) auto"><span>${l.title}</span>
            <span class="${isPassed(lessons[l.id]) ? 'up' : lessons[l.id] ? 'gold' : 'faint'}">${lessons[l.id] ? `${isPassed(lessons[l.id]) ? 'Passed' : 'Best'} ${lessons[l.id].score}% · ${etWhen(lessons[l.id].completed_at)}` : 'Not yet'}</span></div>`)}</div></section>
      </div>
      <section class="panel flush"><div class="panel-head"><h3>All orders</h3></div>
        ${orders.length ? html`<div class="list">${orders.map((o) => orderRow(o))}</div>` : empty('No orders yet')}</section>` : ''}
    ${footer()}`;

  return {
    html: markup,
    mount(el) {
      paintAllocation(el, pf, 'symbol');
      el.addEventListener('click', (e) => {
        const b = e.target.closest('[data-alloc]');
        if (!b) return;
        el.querySelectorAll('[data-alloc]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
        paintAllocation(el, pf, b.dataset.alloc);
      });
    }
  };
}
