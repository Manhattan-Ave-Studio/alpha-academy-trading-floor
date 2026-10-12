// Account: who you are in this game, how to rejoin on another device, rules, theme, and sign out.
import { html, raw } from '../lib/dom.js';
import { money, etDayYear } from '../lib/format.js';
import { icon } from '../lib/icons.js';
import { copyText, confirmSheet, toast } from '../lib/ui.js';
import { store, isDemo, savedTheme, applyTheme, setCurrent } from '../state.js';
import { pageHead, footer } from './common.js';

export function rulesList(game) {
  const rules = [
    ['Starting cash', money(game.starting_cash, { whole: true })],
    ['Fractional shares', game.allow_fractional ? 'Allowed (buy by dollar amount)' : 'Whole shares only'],
    ['Single-stock limit', game.max_position_pct ? `No more than ${Number(game.max_position_pct)}% of your portfolio in one stock (funds are exempt)` : 'No limit'],
    ['Lowest share price', `${money(game.min_share_price)} (keeps penny stocks out)`],
    ['Commission per trade', Number(game.commission) > 0 ? money(game.commission) : 'Free'],
    ['Classmates can see holdings', game.show_holdings ? 'Yes' : 'No'],
    ['Game ends', game.ends_at ? etDayYear(game.ends_at) : 'When your mentors close it'],
    ['Not allowed', 'Short selling, margin, and options']
  ];
  return html`<dl class="stats" style="grid-template-columns: repeat(auto-fill, minmax(min(100%, 230px), 1fr))">${rules.map(([k, v]) => html`<div class="stat"><dt>${k}</dt><dd style="font-size:var(--step-0); font-family:var(--font-body); font-weight:600">${v}</dd></div>`)}</dl>`;
}

export async function render({ navigate, restart }) {
  const cur = store.current;
  const theme = savedTheme();
  const c = store.config;

  const markup = html`
    ${pageHead('Account', cur ? `Playing as ${cur.player.display_name} in ${cur.game.name}.` : 'You are not in a game yet.')}
    ${cur ? html`
      <div class="grid-2">
        <section class="panel">
          <div class="panel-head"><h3>Play on another device</h3></div>
          <div class="stack">
            <p class="muted">On a new phone or computer, choose "I already joined" and enter these three things:</p>
            <div class="split"><span class="muted">Game code</span>
              <span class="row-wrap"><b class="join-code" style="font-size:var(--step-3)">${cur.game.join_code}</b>
              <button class="icon-btn" type="button" data-copy="${cur.game.join_code}" aria-label="Copy game code">${raw(icon('copy'))}</button></span></div>
            <div class="split"><span class="muted">Your name</span><b>${cur.player.display_name}</b></div>
            <div class="split"><span class="muted">Your PIN</span><b>The 4 to 6 digits you chose</b></div>
            <p class="faint" style="font-size:var(--step--1)">Forgot your PIN? Ask a mentor to reset it. Your portfolio is saved on the server, so nothing is lost.</p>
          </div>
        </section>
        <section class="panel">
          <div class="panel-head"><h3>Game rules</h3></div>
          ${rulesList(cur.game)}
        </section>
      </div>
      ${store.players.length > 1 ? html`<section class="panel"><div class="panel-head"><h3>Your games</h3></div>
        <div class="list">${store.players.map((p) => html`<div class="list-row" style="grid-template-columns: minmax(0,1fr) auto">
          <span class="who"><b style="font-family:var(--font-body)">${p.game.name}</b><span>Playing as ${p.player.display_name}</span></span>
          ${p.player.id === cur.player.id ? html`<span class="chip gold">Current</span>` : html`<button class="btn secondary small" type="button" data-switch="${p.player.id}">Switch</button>`}
        </div>`)}</div></section>` : ''}
    ` : html`<section class="panel"><a class="btn" href="#/join">Join a game</a></section>`}

    <section class="panel">
      <div class="panel-head"><h3>Appearance</h3></div>
      <div class="seg" role="group" aria-label="Theme">
        <button type="button" data-theme-choice="auto" aria-pressed="${theme === 'auto'}">Match device</button>
        <button type="button" data-theme-choice="dark" aria-pressed="${theme === 'dark'}">${raw(icon('moon'))} Dark</button>
        <button type="button" data-theme-choice="light" aria-pressed="${theme === 'light'}">${raw(icon('sun'))} Light</button>
      </div>
    </section>

    <section class="panel">
      <div class="panel-head"><h3>About ${c.programName}</h3></div>
      <div class="stack" style="max-width:68ch">
        <p>${c.programName} is the ${c.chapterName}'s mentoring program for high school men in Brooklyn, built around leadership, college readiness, and skill building. This trading floor is where members practice investing with play money and learn the money skills that last a lifetime.</p>
        <p class="muted">${c.chapterName} (the Brooklyn Alphas) was chartered in 1945. ${c.orgName} was founded in 1906.</p>
        <div class="row-wrap">
          ${c.siteUrl ? html`<a class="btn secondary small" href="${c.siteUrl}" target="_blank" rel="noopener">Chapter website ${raw(icon('external'))}</a>` : ''}
          ${c.instagram ? html`<a class="btn secondary small" href="${c.instagram}" target="_blank" rel="noopener">Instagram ${raw(icon('external'))}</a>` : ''}
        </div>
      </div>
    </section>

    <section class="panel">
      <div class="panel-head"><h3>${isDemo() ? 'Demo' : 'Sign out'}</h3></div>
      ${isDemo()
        ? html`<div class="stack"><p class="muted">The demo saves your trades in this browser. Start over to reset cash, holdings, and lessons.</p>
            <button class="btn danger" type="button" data-reset-demo style="justify-self:start">Start the demo over</button></div>`
        : html`<div class="stack"><p class="muted">Signing out removes this device from your player. Make sure you know your game code, name, and PIN first.</p>
            <button class="btn danger" type="button" data-signout style="justify-self:start">${raw(icon('logout'))} Sign out</button></div>`}
    </section>
    ${footer()}`;

  return {
    html: markup,
    mount(el) {
      el.addEventListener('click', async (e) => {
        const cp = e.target.closest('[data-copy]');
        if (cp) return copyText(cp.dataset.copy);
        const th = e.target.closest('[data-theme-choice]');
        if (th) {
          applyTheme(th.dataset.themeChoice);
          el.querySelectorAll('[data-theme-choice]').forEach((b) => b.setAttribute('aria-pressed', String(b === th)));
          return;
        }
        const sw = e.target.closest('[data-switch]');
        if (sw) {
          setCurrent(sw.dataset.switch);
          toast('Switched games');
          navigate('/');
          return;
        }
        if (e.target.closest('[data-reset-demo]')) {
          const ok = await confirmSheet({ title: 'Start the demo over?', message: 'Your demo trades, watchlist, and lesson progress in this browser will be replaced with the starting sample.', confirmLabel: 'Start over', danger: true });
          if (!ok) return;
          await store.api.resetDemo();
          toast('Demo restarted', 'good');
          await restart('/');
          return;
        }
        if (e.target.closest('[data-signout]')) {
          const ok = await confirmSheet({ title: 'Sign out?', message: 'You can rejoin later with your game code, name, and PIN.', confirmLabel: 'Sign out', danger: true });
          if (!ok) return;
          await store.api.signOut();
          await restart('/join');
        }
      });
    }
  };
}
