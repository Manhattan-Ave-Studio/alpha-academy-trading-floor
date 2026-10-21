// A classmate's holdings (when the mentor shares holdings) or any player for mentors.
import { html, raw, esc } from '../lib/dom.js';
import { money, moneySigned, pctSigned, trend, arrow, etWhen } from '../lib/format.js';
import { icon } from '../lib/icons.js';
import { toast } from '../lib/ui.js';
import { store } from '../state.js';
import { pageHead, footer, empty } from './common.js';
import { holdingsTable, allocationPanel, paintAllocation } from './portfolio.js';
import { orderRow } from './orders.js';
import { LESSONS, EXAM_TRIES, lessonById, isPassed, passedCount, triesUsed, examLocked } from '../data/lessons.js';

// One lesson in the mentor's Lessons panel: the title with Required and Locked chips, the best
// score with tries used, and for admins a Reset exam button while tries are used and no pass yet.
function lessonRow(l, entry, { required, admin }) {
  const passed = isPassed(entry);
  const used = triesUsed(entry);
  const status = !entry ? 'Not yet' : passed ? `Passed ${entry.score}%` : `Best ${entry.score}% · ${used} of ${EXAM_TRIES} tries`;
  return html`<div class="list-row" style="grid-template-columns: minmax(0,1fr) auto" data-lesson-row="${l.id}">
    <div class="stack" style="gap:4px">
      <div class="row-wrap" style="gap:8px"><span>${l.title}</span>
        ${required ? html`<span class="chip gold" data-lesson-required>Required</span>` : ''}
        ${examLocked(entry) ? html`<span class="chip warn" data-lesson-locked>Locked</span>` : ''}</div>
      <span class="${passed ? 'up' : entry ? 'gold' : 'faint'}" style="font-size:var(--step--1)" data-lesson-status ${entry?.completed_at ? raw(`title="${esc(etWhen(entry.completed_at))}"`) : ''}>${status}</span>
    </div>
    ${admin && entry && !passed && used > 0 ? html`<button class="btn ghost small" type="button" data-reset-exam="${l.id}" aria-label="Reset exam: ${l.title}">Reset exam</button>` : ''}
  </div>`;
}

export async function render({ params, mentorView = false }) {
  const api = store.api;
  const pid = params.id;
  let pf;
  try {
    pf = await api.getPortfolio(pid);
  } catch (e) {
    return { html: html`<div class="panel">${empty('This portfolio is private', e.message, html`<a class="btn" href="#/leaderboard">Back to the leaderboard</a>`)}</div>` };
  }
  const [orders, lessons, games] = mentorView
    ? await Promise.all([api.listOrders(pid).catch(() => []), api.lessonProgress(pid).catch(() => ({})), api.mentorGames().catch(() => [])])
    : [[], {}, []];
  const notes = orders.filter((o) => o.note);
  // The student's game says which lessons are required and whether this mentor is one of its admins.
  // A game without the flag (no admins left, or a database without the migration yet) is open to every mentor.
  const game = (Array.isArray(games) ? games : []).find((x) => x.id === pf.game_id) || null;
  const admin = !!game && game.is_admin !== false;
  const required = new Set(Array.isArray(game?.required_lessons) ? game.required_lessons : []);
  const rowOpts = (l) => ({ required: required.has(l.id), admin });
  const canReset = (l) => lessons[l.id] && !isPassed(lessons[l.id]) && triesUsed(lessons[l.id]) > 0;
  const lessonsNote = admin
    ? (LESSONS.some(canReset) ? `Reset exam gives the student ${EXAM_TRIES} new tries and keeps their best score.` : '')
    : (LESSONS.some((l) => examLocked(lessons[l.id])) ? "Only this game's admins can reset an exam." : '');

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
        <section class="panel" data-player-lessons><div class="panel-head"><h3>Lessons</h3><span class="faint" style="font-size:var(--step--1)">${passedCount(lessons)} of ${LESSONS.length} passed</span></div>
          ${lessonsNote ? html`<p class="muted" style="font-size:var(--step--1); margin-bottom:6px" data-lessons-note>${lessonsNote}</p>` : ''}
          <div class="list">${LESSONS.map((l) => lessonRow(l, lessons[l.id], rowOpts(l)))}</div></section>
      </div>
      <section class="panel flush"><div class="panel-head"><h3>All orders</h3></div>
        ${orders.length ? html`<div class="list">${orders.map((o) => orderRow(o))}</div>` : empty('No orders yet')}</section>` : ''}
    ${footer()}`;

  return {
    html: markup,
    mount(el) {
      paintAllocation(el, pf, 'symbol');
      el.addEventListener('click', async (e) => {
        const rx = e.target.closest('[data-reset-exam]');
        if (rx) {
          const id = rx.dataset.resetExam;
          const lesson = lessonById(id);
          if (!lesson) return;
          rx.disabled = true;
          try {
            const row = await api.resetExam(pid, id);
            // The server returns the row with attempts back at zero. A database without the migration
            // errors instead (the toast shows it); an empty answer keeps the entry with zero tries.
            lessons[id] = row || { ...(lessons[id] || {}), attempts: 0 };
            const old = el.querySelector(`[data-lesson-row="${id}"]`);
            if (old) old.outerHTML = lessonRow(lesson, lessons[id], rowOpts(lesson)).toString();
            toast(`Exam reset. ${pf.display_name || 'The student'} has ${EXAM_TRIES} tries again.`, 'good');
          } catch (err) {
            toast(err.message, 'bad');
            rx.disabled = false;
          }
          return;
        }
        const b = e.target.closest('[data-alloc]');
        if (!b) return;
        el.querySelectorAll('[data-alloc]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
        paintAllocation(el, pf, b.dataset.alloc);
      });
    }
  };
}
