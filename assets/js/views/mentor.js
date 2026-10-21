// Mentor panel: sign in, games, join codes with QR, rules, announcements, roster, and data status.
import { html, raw, $, $$, esc, n } from '../lib/dom.js';
import { money, pctSigned, trend, etDayYear, ago, etWhen, activity, activityCounts } from '../lib/format.js';
import { icon, MARK } from '../lib/icons.js';
import { toast, copyText, openSheet, confirmSheet, sheetIsOpen } from '../lib/ui.js';
import { store, isDemo, loadSession } from '../state.js';
import { pageHead, footer, empty, demoBanner } from './common.js';
import { rulesList } from './account.js';

function joinUrl(code) {
  const base = store.config.publicUrl || (location.protocol.startsWith('http') ? location.origin + location.pathname : '');
  return `${base}#/join/${code}`;
}

function qrSvg(text) {
  if (typeof window.qrcode !== 'function') return '';
  const qr = window.qrcode(0, 'M');
  qr.addData(text);
  qr.make();
  return qr.createSvgTag({ cellSize: 4, margin: 2, scalable: true, alt: 'QR code to join the game' });
}

function toLocalInput(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  const pad = (x) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function statusChipFor(g) {
  return g.status === 'active' ? html`<span class="chip up">Active</span>` : g.status === 'paused' ? html`<span class="chip warn">Paused</span>` : html`<span class="chip">Ended</span>`;
}

// ------------------------------------------------------------------ auth

function authView({ rerender }) {
  const signedIn = store.session && !store.session.isAnonymous;
  const markup = html`
    <div class="landing" style="grid-template-columns: minmax(0,1fr)">
      <section class="panel" style="max-width:520px; width:100%; justify-self:center; padding: clamp(18px,3vw,28px)">
        <div class="stack" style="gap:16px">
          <a class="brand lg" href="#/" style="padding:0">${raw(MARK)}<span class="words"><span class="program">${store.config.programName}</span><span class="product">Mentor panel</span></span></a>
          ${isDemo()
            ? html`<p class="muted">In the demo, the mentor panel opens without a login so you can see what mentors manage: join codes, rules, announcements, the roster, and each student's trade notes.</p>
                <button class="btn block" type="button" data-demo-mentor>Explore the mentor panel</button>`
            : signedIn
              ? html`<p>Signed in as <b>${store.session.email}</b>. Enter the mentor code to unlock the panel.</p>
                  <form id="claim-form" class="stack" novalidate>
                    <div class="field"><label for="m-code">Mentor code</label><input id="m-code" class="input" type="password" autocomplete="off" required></div>
                    <div class="field"><label for="m-name">Your name (shown to other mentors)</label><input id="m-name" class="input" maxlength="60" placeholder="Bro. Your Name"></div>
                    <p class="form-error" id="m-error" role="alert"></p>
                    <button class="btn block" type="submit">Unlock mentor panel</button>
                  </form>
                  <button class="btn ghost small" type="button" data-signout style="justify-self:start">Use a different account</button>`
              : html`<div class="seg" role="tablist" aria-label="Sign in or create account">
                    <button type="button" data-auth="in" aria-pressed="true">Sign in</button>
                    <button type="button" data-auth="up" aria-pressed="false">Create mentor login</button>
                  </div>
                  <form id="auth-form" class="stack" data-mode="in" novalidate>
                    <div class="field"><label for="m-email">Email</label><input id="m-email" class="input" type="email" autocomplete="email" required></div>
                    <div class="field"><label for="m-pass">Password</label><input id="m-pass" class="input" type="password" autocomplete="current-password" minlength="8" required></div>
                    <div class="field" data-up hidden><label for="m-code2">Mentor code</label><input id="m-code2" class="input" type="password" autocomplete="off">
                      <span class="hint">Get the code from the chapter's web team.</span></div>
                    <div class="field" data-up hidden><label for="m-name2">Your name</label><input id="m-name2" class="input" maxlength="60" placeholder="Bro. Your Name"></div>
                    <p class="form-error" id="m-error" role="alert"></p>
                    <button class="btn block" type="submit" id="m-submit">Sign in</button>
                  </form>`}
        </div>
      </section>
    </div>
    ${footer()}`;

  return {
    html: markup,
    mount(el) {
      el.addEventListener('click', async (e) => {
        if (e.target.closest('[data-demo-mentor]')) {
          await store.api.setMentorMode(true);
          store.isMentor = true;
          rerender();
          return;
        }
        if (e.target.closest('[data-signout]')) {
          await store.api.signOut();
          await loadSession();
          rerender();
          return;
        }
        const a = e.target.closest('[data-auth]');
        if (a) {
          const up = a.dataset.auth === 'up';
          $$('[data-auth]', el).forEach((b) => b.setAttribute('aria-pressed', String(b === a)));
          $$('[data-up]', el).forEach((x) => {
            x.hidden = !up;
          });
          $('#auth-form', el).dataset.mode = up ? 'up' : 'in';
          $('#m-submit', el).textContent = up ? 'Create login' : 'Sign in';
          $('#m-pass', el).setAttribute('autocomplete', up ? 'new-password' : 'current-password');
        }
      });
      el.addEventListener('submit', async (e) => {
        e.preventDefault();
        const err = $('#m-error', el);
        err.textContent = '';
        const btn = e.target.querySelector('button[type="submit"]');
        btn.disabled = true;
        try {
          if (e.target.id === 'claim-form') {
            await store.api.claimMentor($('#m-code', el).value, $('#m-name', el).value);
          } else {
            const email = $('#m-email', el).value.trim();
            const pass = $('#m-pass', el).value;
            if (e.target.dataset.mode === 'up') {
              if (pass.length < 8) throw new Error('Use a password of at least 8 characters.');
              const code = $('#m-code2', el).value;
              if (!code) throw new Error('Enter the mentor code.');
              const res = await store.api.mentorSignUp(email, pass);
              if (res.needsConfirm) {
                err.textContent = 'Check your email to confirm your address, then sign in and enter the mentor code.';
                btn.disabled = false;
                return;
              }
              await store.api.claimMentor(code, $('#m-name2', el).value);
            } else {
              await store.api.mentorSignIn(email, pass);
            }
          }
          await loadSession();
          toast(store.isMentor ? 'Mentor panel unlocked' : 'Signed in', 'good');
          rerender();
        } catch (ex) {
          err.textContent = ex.message;
          btn.disabled = false;
        }
      });
    }
  };
}

// ------------------------------------------------------------------ dashboard

async function dashboard({ navigate, rerender }) {
  const api = store.api;
  const games = await api.mentorGames();
  const status = await api.systemStatus().catch((e) => ({ error: e.message }));

  const statusPanel = isDemo()
    ? html`<p class="muted">The demo uses simulated prices. On your live site this panel shows whether the price feed is connected, when prices last updated, and how many symbols students can trade.</p>`
    : status.error
      ? html`<p class="form-error">${status.error}</p><p class="muted" style="font-size:var(--step--1)">Check that the market function is deployed and its secrets are set (see the setup guide).</p>`
      : html`<dl class="stats">
          <div class="stat"><dt>Price feed</dt><dd class="${status.alpaca_connected ? 'up' : 'down'}">${status.alpaca_connected ? `Connected (${status.feed})` : 'Not connected'}</dd></div>
          <div class="stat"><dt>Fundamentals</dt><dd class="${status.finnhub_connected ? 'up' : 'muted'}">${status.finnhub_connected ? 'Connected' : 'Optional, off'}</dd></div>
          <div class="stat"><dt>Last price update</dt><dd>${status.last_refresh?.at ? ago(status.last_refresh.at) : 'Never'}</dd></div>
          <div class="stat"><dt>Tradable symbols</dt><dd>${Number(status.tradable_symbols || 0).toLocaleString('en-US')}</dd></div>
          <div class="stat"><dt>Calendar through</dt><dd>${status.calendar_through ? etDayYear(status.calendar_through) : 'n/a'}</dd></div>
          <div class="stat"><dt>Scheduler</dt><dd class="${status.cron_secret_set ? 'up' : 'down'}">${status.cron_secret_set ? 'Secret set' : 'Secret missing'}</dd></div>
        </dl>
        <div class="row-wrap" style="margin-top:14px"><button class="btn secondary small" type="button" data-sync>${raw(icon('refresh'))} Sync symbols and calendar now</button>
          <span class="faint" style="font-size:var(--step--1)">${status.last_sync?.at ? `Last sync ${ago(status.last_sync.at)}` : 'Run once after setup'}</span></div>`;

  const markup = html`
    ${pageHead('Mentor panel', 'Run games, set the rules, and see how each student is thinking.', isDemo() ? '' : html`<a class="btn" href="#/mentor/new">${raw(icon('plus'))} New game</a>`)}
    ${demoBanner()}
    <section class="stack">
      <h2 style="font-size:var(--step-3)">Games</h2>
      ${games.length
        ? html`<div class="grid-cards">${games.map((g) => html`<a class="res-card" href="#/mentor/game/${g.id}">
            <div class="split"><span class="org">Code ${g.join_code}</span>${statusChipFor(g)}</div>
            <b style="font-size:var(--step-1)">${g.name}</b>
            <p>${g.player_count} ${g.player_count === 1 ? 'player' : 'players'} · ${g.active_this_week} active this week · ${g.trades} trades</p>
            <p>Started ${etDayYear(g.starts_at)} with ${money(g.starting_cash, { whole: true })}</p>
          </a>`)}</div>`
        : html`<div class="panel">${empty('No games yet', 'Create the first game, then share its code or QR at your next session.', html`<a class="btn" href="#/mentor/new">Create a game</a>`)}</div>`}
    </section>
    <div class="grid-2" style="grid-template-columns: repeat(auto-fit, minmax(min(100%, 380px), 1fr))">
      <section class="panel"><div class="panel-head"><h3>Market data</h3></div>${statusPanel}</section>
      <section class="panel"><div class="panel-head"><h3>Mentors</h3></div>
        <div class="stack">
          <form id="add-mentor" class="stack" novalidate>
            <div class="field"><label for="am-email">Add a mentor by email</label>
              <input id="am-email" class="input" type="email" placeholder="brother@example.com"><span class="hint">They need to create a mentor login first.</span></div>
            <button class="btn secondary small" type="submit" style="justify-self:start">Add mentor</button>
          </form>
          <hr class="rule">
          <form id="rotate-code" class="stack" novalidate>
            <div class="field"><label for="rc-code">Change the mentor code</label>
              <input id="rc-code" class="input" type="password" autocomplete="off" placeholder="At least 10 characters"></div>
            <button class="btn secondary small" type="submit" style="justify-self:start">Save new code</button>
          </form>
        </div>
      </section>
    </div>
    <section class="panel">
      <div class="panel-head"><h3>Running a session</h3></div>
      <ol class="prose" style="font-size:var(--step-0)">
        <li>Open the game and put the QR code on screen. Students scan it, pick a display name, and make a PIN.</li>
        <li>Assign one lesson and its quick check before anyone trades. "Order types" and "Researching a company" make a strong first week.</li>
        <li>Ask every student to write a "Why this trade?" note. Read the notes in each student's page and talk through two or three of them.</li>
        <li>End with the leaderboard and the S&amp;P 500 line. Ask who is ahead of the index, and why most professionals are not.</li>
      </ol>
    </section>
    ${footer()}`;

  return {
    html: markup,
    mount(el) {
      el.addEventListener('click', async (e) => {
        if (!e.target.closest('[data-sync]')) return;
        const b = e.target.closest('[data-sync]');
        b.disabled = true;
        b.textContent = 'Syncing...';
        try {
          const r = await api.syncMarketData();
          toast(`Synced ${Number(r.symbols || 0).toLocaleString('en-US')} symbols and ${r.calendar} calendar days`, 'good');
          rerender();
        } catch (err) {
          toast(err.message, 'bad');
          b.disabled = false;
        }
      });
      el.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
          if (e.target.id === 'add-mentor') {
            await api.addMentor($('#am-email', el).value.trim());
            toast('Mentor added', 'good');
            $('#am-email', el).value = '';
          } else if (e.target.id === 'rotate-code') {
            await api.setMentorCode($('#rc-code', el).value);
            toast('Mentor code updated', 'good');
            $('#rc-code', el).value = '';
          }
        } catch (err) {
          toast(err.message, 'bad');
        }
      });
    }
  };
}

// ------------------------------------------------------------------ new game

function newGame({ navigate }) {
  const today = toLocalInput(Date.now());
  const markup = html`
    <div class="split"><a class="btn ghost small" href="#/mentor">${raw(icon('back'))} Mentor panel</a></div>
    ${pageHead('New game', 'Set the rules once. You can change most of them later.')}
    <form class="panel stack" id="new-game" novalidate style="gap:18px">
      <div class="calc-grid">
        <div class="field" style="grid-column: 1 / -1"><label for="g-name">Game name</label><input id="g-name" class="input" maxlength="80" placeholder="Fall 2026 Market Challenge" required></div>
        <div class="field"><label for="g-cash">Starting cash</label>
          <select id="g-cash" class="input"><option value="10000">$10,000</option><option value="25000">$25,000</option><option value="100000" selected>$100,000</option></select></div>
        <div class="field"><label for="g-start">Start date</label><input id="g-start" class="input" type="date" value="${today}"></div>
        <div class="field"><label for="g-end">End date (optional)</label><input id="g-end" class="input" type="date"></div>
        <div class="field"><label for="g-max">Single-stock limit</label>
          <select id="g-max" class="input"><option value="">No limit</option><option value="10">10% of portfolio</option><option value="20">20% of portfolio</option><option value="25" selected>25% of portfolio</option><option value="35">35% of portfolio</option></select>
          <span class="hint">Funds like SPY are exempt. A limit nudges students to diversify.</span></div>
        <div class="field"><label for="g-min">Lowest share price</label>
          <div class="input-affix"><span class="affix">$</span><input id="g-min" class="input" inputmode="decimal" value="1.00"></div></div>
        <div class="field"><label for="g-fee">Commission per trade</label>
          <div class="input-affix"><span class="affix">$</span><input id="g-fee" class="input" inputmode="decimal" value="0"></div></div>
      </div>
      <label class="check"><input id="g-frac" type="checkbox" checked><span>Allow fractional shares and buying by dollar amount</span></label>
      <label class="check"><input id="g-share" type="checkbox"><span>Let classmates see each other's holdings (order notes always stay private)</span></label>
      <div class="field"><label for="g-ann">Announcement (optional)</label><textarea id="g-ann" class="input" maxlength="500" placeholder="Shown on every student's home screen."></textarea></div>
      <p class="form-error" id="g-error" role="alert"></p>
      <button class="btn" type="submit" style="justify-self:start">Create game</button>
    </form>
    ${footer()}`;
  return {
    html: markup,
    mount(el) {
      el.addEventListener('submit', async (e) => {
        e.preventDefault();
        const err = $('#g-error', el);
        err.textContent = '';
        const name = $('#g-name', el).value.trim();
        if (name.length < 2) {
          err.textContent = 'Give the game a name.';
          return;
        }
        const start = $('#g-start', el).value;
        const end = $('#g-end', el).value;
        try {
          const g = await store.api.createGame({
            name,
            starting_cash: Number($('#g-cash', el).value),
            starts_at: start ? new Date(start + 'T00:00:00').toISOString() : null,
            ends_at: end ? new Date(end + 'T23:59:00').toISOString() : null,
            max_position_pct: $('#g-max', el).value ? Number($('#g-max', el).value) : null,
            min_share_price: n($('#g-min', el).value) ?? 1,
            commission: n($('#g-fee', el).value) ?? 0,
            allow_fractional: $('#g-frac', el).checked,
            show_holdings: $('#g-share', el).checked,
            announcement: $('#g-ann', el).value.trim()
          });
          toast(`Game created. Code ${g.join_code}`, 'good');
          navigate(`/mentor/game/${g.id}`);
        } catch (ex) {
          err.textContent = ex.message;
        }
      });
    }
  };
}

// ------------------------------------------------------------------ game detail

function gameLede(g, roster) {
  return `${roster.length} ${roster.length === 1 ? 'player' : 'players'} · started ${etDayYear(g.starts_at)}${g.ends_at ? ` · ends ${etDayYear(g.ends_at)}` : ''}`;
}

function activityCell(r) {
  const a = activity(r.last_active_at);
  return html`<span class="act act-${a.key}" data-act-for="${r.player_id}"><span class="act-dot" aria-hidden="true"></span><span class="act-label">${a.label}</span></span>`;
}

function activitySummary(roster) {
  const c = activityCounts(roster);
  return html`<p class="act-summary" data-activity>
        <span class="act act-now"><span class="act-dot" aria-hidden="true"></span><span><b>${c.now}</b> of ${c.total} active now</span></span>
        <span class="act act-hour"><span class="act-dot" aria-hidden="true"></span><span><b>${c.hour - c.now}</b> more in the last hour</span></span>
      </p>`;
}

// Activity changes with the clock as well as the data, so the poll updates it in place on every
// pass. The rest of the roster redraws only when its data changes.
function refreshActivity(panel, roster) {
  const byId = new Map(roster.map((r) => [r.player_id, r]));
  for (const cell of panel.querySelectorAll('[data-act-for]')) {
    const r = byId.get(cell.dataset.actFor);
    if (!r) continue;
    const a = activity(r.last_active_at);
    cell.className = `act act-${a.key}`;
    const label = cell.querySelector('.act-label');
    if (label.textContent !== a.label) label.textContent = a.label;
  }
  const summary = panel.querySelector('[data-activity]');
  if (summary && roster.length) summary.outerHTML = activitySummary(roster).toString();
}

const rosterData = (roster) => JSON.stringify(roster.map(({ last_active_at, ...r }) => r));

// Redraw the roster, keeping the table's sideways scroll and the focused control.
function redrawRoster(panel, roster, canExport) {
  const focused = document.activeElement;
  let refocus = null;
  if (focused && panel.contains(focused)) {
    const key = ['pin', 'rename', 'remove'].find((k) => k in focused.dataset);
    if (key) refocus = `[data-${key}="${CSS.escape(focused.dataset[key])}"]`;
    else if ('export' in focused.dataset) refocus = '[data-export]';
    else if (focused.matches('a[href]')) refocus = `a[href="${CSS.escape(focused.getAttribute('href'))}"]`;
  }
  const scroll = panel.querySelector('.table-wrap')?.scrollLeft || 0;
  panel.innerHTML = rosterPanel(roster, canExport).toString();
  const wrap = panel.querySelector('.table-wrap');
  if (wrap) wrap.scrollLeft = scroll;
  if (refocus) panel.querySelector(refocus)?.focus({ preventScroll: true });
}

function rosterPanel(roster, canExport) {
  return html`
      <div class="panel-head"><h3>Roster</h3>${canExport && roster.length ? html`<button class="btn ghost small" type="button" data-export>Download CSV</button>` : ''}</div>
      ${roster.length ? activitySummary(roster) : ''}
      ${roster.length
        ? html`<div class="table-wrap"><table class="table">
            <thead><tr><th>Player</th><th>Last active</th><th class="r">Value</th><th class="r">Return</th><th class="r">Trades</th><th class="r">Open</th><th class="r">Lessons</th><th></th></tr></thead>
            <tbody>${roster.map((r) => html`<tr>
              <td><a class="sym" href="#/mentor/player/${r.player_id}">${r.display_name}</a>${r.locked ? html` <span class="chip warn">Locked</span>` : ''}</td>
              <td>${activityCell(r)}</td>
              <td class="r">${money(r.total_value)}</td>
              <td class="r ${trend(r.return_pct)}">${pctSigned(r.return_pct)}</td>
              <td class="r">${r.trades}</td>
              <td class="r">${r.open_orders}</td>
              <td class="r">${r.lessons_completed}</td>
              <td class="r"><div class="row-wrap" style="justify-content:flex-end; flex-wrap:nowrap">
                <button class="btn ghost small" type="button" data-pin="${r.player_id}" data-name="${r.display_name}">Reset PIN</button>
                <button class="btn ghost small" type="button" data-rename="${r.player_id}" data-name="${r.display_name}">Rename</button>
                <button class="btn ghost small" type="button" data-remove="${r.player_id}" data-name="${r.display_name}" style="color:var(--down)">Remove</button>
              </div></td>
            </tr>`)}</tbody></table></div>`
        : empty('No players yet', 'Share the code or QR. Players appear here as they join.')}`;
}

async function gameDetail({ params, rerender }) {
  const api = store.api;
  const games = await api.mentorGames();
  const g = games.find((x) => x.id === params.id);
  if (!g) return { html: html`<div class="panel">${empty('Game not found', '', html`<a class="btn" href="#/mentor">Mentor panel</a>`)}</div>` };
  let roster = await api.roster(g.id);
  const url = joinUrl(g.join_code);
  const qr = qrSvg(url);
  const canExport = !store.config.preview;

  const markup = html`
    <div class="split"><a class="btn ghost small" href="#/mentor">${raw(icon('back'))} Mentor panel</a>${statusChipFor(g)}</div>
    ${pageHead(g.name, gameLede(g, roster), html`<a class="btn secondary" href="#/leaderboard">Leaderboard</a>`)}
    ${demoBanner()}
    <div class="grid-2" style="grid-template-columns: repeat(auto-fit, minmax(min(100%, 380px), 1fr))">
      <section class="panel">
        <div class="panel-head"><h3>Students join here</h3></div>
        <div class="row-wrap" style="gap:20px; align-items:flex-start">
          ${qr ? html`<div class="qr">${raw(qr)}</div>` : ''}
          <div class="stack" style="min-width:0">
            <span class="eyebrow">Game code</span>
            <div class="row-wrap"><span class="join-code">${g.join_code}</span>
              <button class="icon-btn" type="button" data-copy="${g.join_code}" aria-label="Copy game code">${raw(icon('copy'))}</button></div>
            <span class="muted" style="font-size:var(--step--1); overflow-wrap:anywhere">${url}</span>
            ${store.config.preview ? html`<span class="faint" style="font-size:var(--step--1)">Example address. Set publicUrl in config.js to your live site.</span>` : ''}
            <button class="btn secondary small" type="button" data-copy="${url}" style="justify-self:start">Copy join link</button>
          </div>
        </div>
      </section>
      <section class="panel">
        <div class="panel-head"><h3>Game status</h3></div>
        <div class="stack">
          <div class="seg" role="group" aria-label="Game status">
            <button type="button" data-status="active" aria-pressed="${g.status === 'active'}">Active</button>
            <button type="button" data-status="paused" aria-pressed="${g.status === 'paused'}">Paused</button>
            <button type="button" data-status="ended" aria-pressed="${g.status === 'ended'}">Ended</button>
          </div>
          <p class="muted" style="font-size:var(--step--1)">Paused stops new trades and fills until you switch back. Ended closes trading and cancels open orders.</p>
          <form id="ann-form" class="stack" novalidate>
            <div class="field"><label for="ann">Announcement on every student's home screen</label>
              <textarea id="ann" class="input" maxlength="500">${g.announcement || ''}</textarea></div>
            <button class="btn secondary small" type="submit" style="justify-self:start">Save announcement</button>
          </form>
        </div>
      </section>
    </div>

    <section class="panel flush" id="roster-panel">${rosterPanel(roster, canExport)}</section>

    <section class="panel">
      <div class="panel-head"><h3>Rules</h3><span class="faint" style="font-size:var(--step--1)">Changes apply to new orders right away</span></div>
      <form id="rules-form" class="stack" novalidate style="gap:16px">
        <div class="calc-grid">
          <div class="field"><label for="r-name">Game name</label><input id="r-name" class="input" maxlength="80" value="${g.name}"></div>
          <div class="field"><label for="r-end">End date</label><input id="r-end" class="input" type="date" value="${toLocalInput(g.ends_at)}"></div>
          <div class="field"><label for="r-max">Single-stock limit</label>
            <select id="r-max" class="input">${[['', 'No limit'], ['10', '10%'], ['20', '20%'], ['25', '25%'], ['35', '35%'], ['50', '50%']].map(([v, l]) => html`<option value="${v}" ${String(g.max_position_pct == null ? '' : Number(g.max_position_pct)) === v ? 'selected' : ''}>${l}</option>`)}</select></div>
          <div class="field"><label for="r-min">Lowest share price</label><div class="input-affix"><span class="affix">$</span><input id="r-min" class="input" inputmode="decimal" value="${Number(g.min_share_price).toFixed(2)}"></div></div>
          <div class="field"><label for="r-fee">Commission per trade</label><div class="input-affix"><span class="affix">$</span><input id="r-fee" class="input" inputmode="decimal" value="${Number(g.commission).toFixed(2)}"></div></div>
        </div>
        <label class="check"><input id="r-frac" type="checkbox" ${g.allow_fractional ? 'checked' : ''}><span>Allow fractional shares and dollar orders</span></label>
        <label class="check"><input id="r-share" type="checkbox" ${g.show_holdings ? 'checked' : ''}><span>Let classmates see each other's holdings</span></label>
        <button class="btn secondary" type="submit" style="justify-self:start">Save rules</button>
      </form>
    </section>

    <section class="panel" style="border-color: color-mix(in srgb, var(--down) 40%, var(--line))">
      <div class="panel-head"><h3>Reset the game</h3></div>
      <form id="reset-form" class="row-wrap" novalidate>
        <div class="field"><label for="rs-cash">Restart everyone with</label>
          <select id="rs-cash" class="input"><option value="">Same cash (${money(g.starting_cash, { whole: true })})</option><option value="10000">$10,000</option><option value="25000">$25,000</option><option value="100000">$100,000</option></select></div>
        <button class="btn danger" type="submit" style="align-self:flex-end">Reset game</button>
      </form>
      <p class="faint" style="font-size:var(--step--1); margin-top:8px">Clears every holding, order, and chart history. Players and lesson progress stay. Useful after a practice round.</p>
    </section>
    ${footer()}`;

  return {
    html: markup,
    mount(el) {
      const save = async (patch, msg) => {
        try {
          await api.updateGame(g.id, patch);
          toast(msg, 'good');
          rerender();
        } catch (err) {
          toast(err.message, 'bad');
        }
      };
      el.addEventListener('click', async (e) => {
        const cp = e.target.closest('[data-copy]');
        if (cp) return copyText(cp.dataset.copy);
        const st = e.target.closest('[data-status]');
        if (st && st.dataset.status !== g.status) {
          if (st.dataset.status === 'ended') {
            const ok = await confirmSheet({ title: 'End this game?', message: 'Trading stops and open orders are canceled. Final values stay on the leaderboard.', confirmLabel: 'End game', danger: true });
            if (!ok) return;
          }
          return save({ status: st.dataset.status }, `Game ${st.dataset.status === 'active' ? 'is active' : st.dataset.status}`);
        }
        if (e.target.closest('[data-export]')) {
          const rows = [['Player', 'Value', 'Return %', 'Cash', 'Holdings', 'Trades', 'Open orders', 'Lessons', 'Last active', 'Joined']]
            .concat(roster.map((r) => [r.display_name, r.total_value, r.return_pct, r.cash, r.holdings, r.trades, r.open_orders, r.lessons_completed, r.last_active_at || '', r.joined_at || '']));
          const csv = rows.map((r) => r.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
          const a = document.createElement('a');
          a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
          a.download = `${g.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-roster.csv`;
          a.click();
          setTimeout(() => URL.revokeObjectURL(a.href), 2000);
          return;
        }
        const pin = e.target.closest('[data-pin]');
        if (pin) {
          openSheet({
            title: `Reset PIN for ${pin.dataset.name}`,
            body: html`<form class="stack" id="pin-form" novalidate><div class="field"><label for="np">New PIN (4 to 6 digits)</label>
              <input id="np" class="input pin-input" inputmode="numeric" pattern="[0-9]*" maxlength="6"></div>
              <p class="muted" style="font-size:var(--step--1)">Tell the student their new PIN. This also unlocks a locked player.</p>
              <p class="form-error" id="np-err" role="alert"></p><button class="btn" type="submit">Save PIN</button></form>`.toString(),
            onMount: (sheet, close) => {
              sheet.querySelector('#pin-form').addEventListener('submit', async (ev) => {
                ev.preventDefault();
                const v = sheet.querySelector('#np').value.trim();
                if (!/^\d{4,6}$/.test(v)) {
                  sheet.querySelector('#np-err').textContent = 'Use 4 to 6 digits.';
                  return;
                }
                try {
                  await api.resetPin(pin.dataset.pin, v);
                  close();
                  toast('PIN updated', 'good');
                  rerender();
                } catch (err) {
                  sheet.querySelector('#np-err').textContent = err.message;
                }
              });
            }
          });
          return;
        }
        const rn = e.target.closest('[data-rename]');
        if (rn) {
          openSheet({
            title: `Rename ${rn.dataset.name}`,
            body: html`<form class="stack" id="rn-form" novalidate><div class="field"><label for="rn">New display name</label>
              <input id="rn" class="input" maxlength="24" value="${rn.dataset.name}"></div>
              <p class="form-error" id="rn-err" role="alert"></p><button class="btn" type="submit">Save name</button></form>`.toString(),
            onMount: (sheet, close) => {
              sheet.querySelector('#rn-form').addEventListener('submit', async (ev) => {
                ev.preventDefault();
                try {
                  await api.renamePlayer(rn.dataset.rename, sheet.querySelector('#rn').value.trim());
                  close();
                  toast('Name updated', 'good');
                  rerender();
                } catch (err) {
                  sheet.querySelector('#rn-err').textContent = err.message;
                }
              });
            }
          });
          return;
        }
        const rm = e.target.closest('[data-remove]');
        if (rm) {
          const ok = await confirmSheet({ title: `Remove ${rm.dataset.name}?`, message: 'Their portfolio, orders, and lesson progress are deleted. This cannot be undone.', confirmLabel: 'Remove player', danger: true });
          if (!ok) return;
          try {
            await api.removePlayer(rm.dataset.remove);
            toast('Player removed');
            rerender();
          } catch (err) {
            toast(err.message, 'bad');
          }
        }
      });
      el.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (e.target.id === 'ann-form') return save({ announcement: $('#ann', el).value.trim() }, 'Announcement saved');
        if (e.target.id === 'rules-form') {
          const end = $('#r-end', el).value;
          return save({
            name: $('#r-name', el).value.trim(),
            ends_at: end ? new Date(end + 'T23:59:00').toISOString() : null,
            max_position_pct: $('#r-max', el).value ? Number($('#r-max', el).value) : null,
            min_share_price: n($('#r-min', el).value) ?? 0,
            commission: n($('#r-fee', el).value) ?? 0,
            allow_fractional: $('#r-frac', el).checked,
            show_holdings: $('#r-share', el).checked
          }, 'Rules saved');
        }
        if (e.target.id === 'reset-form') {
          const ok = await confirmSheet({ title: 'Reset this game?', message: 'Every player goes back to starting cash, and all holdings, orders, and chart history are cleared.', confirmLabel: 'Reset game', danger: true });
          if (!ok) return;
          try {
            const cash = $('#rs-cash', el).value;
            await api.resetGame(g.id, cash ? Number(cash) : null);
            toast('Game reset', 'good');
            rerender();
          } catch (err) {
            toast(err.message, 'bad');
          }
        }
      });

      // Students show up on the roster while the join code is on screen.
      // Activity dots, labels, and counts update in place on every pass.
      let last = rosterData(roster);
      let busy = false;
      const timer = setInterval(async () => {
        if (document.hidden || busy) return;
        busy = true;
        try {
          const next = await api.roster(g.id);
          const panel = $('#roster-panel', el);
          if (!el.isConnected || !panel) return;
          roster = next;
          const sig = rosterData(next);
          // While a Reset PIN, Rename, or Remove sheet is open, its button must stay in place.
          if (sig !== last && !sheetIsOpen()) {
            redrawRoster(panel, roster, canExport);
            last = sig;
          } else {
            refreshActivity(panel, roster);
          }
          const lede = $('.page-head .lede', el);
          if (lede) lede.textContent = gameLede(g, roster);
        } catch (_) {
          // try again on the next pass
        } finally {
          busy = false;
        }
      }, isDemo() ? 4000 : 10000);
      return () => clearInterval(timer);
    }
  };
}

// ------------------------------------------------------------------ router entry

export async function render(ctx) {
  if (!store.isMentor) return authView(ctx);
  if (ctx.sub === 'new') return newGame(ctx);
  if (ctx.sub === 'game') return gameDetail(ctx);
  return dashboard(ctx);
}
