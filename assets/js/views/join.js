// Landing and join: students enter the game code, a display name, and a PIN.
import { html, raw, $ } from '../lib/dom.js';
import { MARK, icon } from '../lib/icons.js';
import { toast } from '../lib/ui.js';
import { store, isDemo, loadSession, setCurrent, refreshPlayer } from '../state.js';
import { footer } from './common.js';
import { LESSONS } from '../data/lessons.js';

export async function render({ params, navigate }) {
  const c = store.config;
  const code = (params.code || '').toUpperCase();
  let tab = 'join';

  const form = () => tab === 'join'
    ? html`<form class="join-card" id="join-form" autocomplete="off" novalidate>
        <div class="field"><label for="j-code">Game code</label>
          <input id="j-code" class="input big" maxlength="10" autocapitalize="characters" spellcheck="false" placeholder="ABC234" value="${code}" required></div>
        <div class="field"><label for="j-name">Your name in the game</label>
          <input id="j-name" class="input" maxlength="24" placeholder="First name and last initial, like Jalen R." required>
          <span class="hint">Classmates see this on the leaderboard. Skip your full last name.</span></div>
        <div class="calc-grid">
          <div class="field"><label for="j-pin">Make a PIN</label>
            <input id="j-pin" class="input pin-input" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="6" placeholder="4 to 6 digits" required></div>
          <div class="field"><label for="j-pin2">Type it again</label>
            <input id="j-pin2" class="input pin-input" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="6" required></div>
        </div>
        <span class="hint">You need your PIN to play on another phone or computer. No email needed.</span>
        <p class="form-error" id="j-error" role="alert"></p>
        <button class="btn block" type="submit">Join the game</button>
      </form>`
    : html`<form class="join-card" id="rejoin-form" autocomplete="off" novalidate>
        <div class="field"><label for="r-code">Game code</label>
          <input id="r-code" class="input big" maxlength="10" autocapitalize="characters" spellcheck="false" value="${code}" required></div>
        <div class="field"><label for="r-name">Your name in the game</label>
          <input id="r-name" class="input" maxlength="24" required></div>
        <div class="field"><label for="r-pin">Your PIN</label>
          <input id="r-pin" class="input pin-input" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="6" required></div>
        <p class="form-error" id="j-error" role="alert"></p>
        <button class="btn block" type="submit">Continue my game</button>
      </form>`;

  const markup = html`
    <div class="landing">
      <div class="stack" style="gap:18px">
        <a class="brand lg" href="#/" style="padding:0">${raw(MARK)}<span class="words"><span class="program">${c.programName}</span><span class="product">Trading Floor</span></span></a>
        <h1>Practice investing with real market prices.</h1>
        <p class="lede">Every player starts with the same play money. Research companies you know, place real order types, and see how your picks stack up against your classmates and the S&amp;P 500.</p>
        <ul class="stack" style="padding:0; list-style:none; gap:10px">
          <li class="row-wrap">${raw(icon('markets'))}<span>Live prices for U.S. stocks and funds, with charts and news</span></li>
          <li class="row-wrap">${raw(icon('learn'))}<span>${LESSONS.length} lessons with exams on investing, credit, college, and building wealth</span></li>
          <li class="row-wrap">${raw(icon('ranks'))}<span>A leaderboard with the S&amp;P 500 as the benchmark to beat</span></li>
        </ul>
        <p class="faint" style="font-size:var(--step--1)">Mentor? <a href="#/mentor">Sign in to the mentor panel</a>. Just curious? <a href="#/learn">Browse the lessons</a>.</p>
      </div>
      <section class="panel" style="padding: clamp(18px, 3vw, 28px)">
        <div class="seg" role="tablist" aria-label="Join or rejoin" style="margin-bottom:16px">
          <button type="button" role="tab" data-tab="join" aria-pressed="true" aria-selected="true">New player</button>
          <button type="button" role="tab" data-tab="rejoin" aria-pressed="false" aria-selected="false">I already joined</button>
        </div>
        <div id="form-host">${form()}</div>
        ${isDemo() ? html`<p class="faint" style="font-size:var(--step--1); margin-top:12px">Demo mode: any code works, and you will continue as the sample student.</p>` : ''}
      </section>
    </div>
    ${footer()}`;

  return {
    html: markup,
    mount(el) {
      const host = $('#form-host', el);
      el.addEventListener('click', (e) => {
        const t = e.target.closest('[data-tab]');
        if (!t) return;
        tab = t.dataset.tab;
        el.querySelectorAll('[data-tab]').forEach((b) => {
          b.setAttribute('aria-pressed', String(b === t));
          b.setAttribute('aria-selected', String(b === t));
        });
        host.innerHTML = form().toString();
      });
      el.addEventListener('submit', async (e) => {
        e.preventDefault();
        const err = $('#j-error', el);
        const btn = e.target.querySelector('button[type="submit"]');
        err.textContent = '';
        try {
          btn.disabled = true;
          if (e.target.id === 'join-form') {
            const codeV = $('#j-code', el).value.trim();
            const name = $('#j-name', el).value.trim();
            const pin = $('#j-pin', el).value.trim();
            if (!codeV) throw new Error('Enter the game code from your mentor.');
            if (name.length < 2) throw new Error('Enter a name with at least 2 characters.');
            if (!/^\d{4,6}$/.test(pin)) throw new Error('Your PIN must be 4 to 6 digits.');
            if (pin !== $('#j-pin2', el).value.trim()) throw new Error('The two PINs do not match.');
            const player = await store.api.joinGame(codeV, name, pin);
            await loadSession();
            setCurrent(player.id);
            toast(`Welcome, ${player.display_name}`, 'good');
          } else {
            const res = await store.api.rejoinGame($('#r-code', el).value.trim(), $('#r-name', el).value.trim(), $('#r-pin', el).value.trim());
            if (!res.ok) throw new Error(res.message);
            await loadSession();
            setCurrent(res.player.id);
            toast(`Welcome back, ${res.player.display_name}`, 'good');
          }
          await refreshPlayer().catch(() => {});
          navigate('/');
        } catch (ex) {
          err.textContent = ex.message || 'Something went wrong. Try again.';
          btn.disabled = false;
        }
      });
    }
  };
}
