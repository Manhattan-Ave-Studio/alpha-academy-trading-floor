// Leaderboard: every player in the game, with the S&P 500 as a ghost competitor.
import { html, raw } from '../lib/dom.js';
import { money, pctSigned, trend, etDay } from '../lib/format.js';
import { term } from '../lib/ui.js';
import { store, gameId } from '../state.js';
import { pageHead, footer, empty, demoBanner } from './common.js';

export async function render() {
  const api = store.api;
  const gid = gameId();
  const [rows, summary] = await Promise.all([api.getLeaderboard(gid), api.gameSummary(gid)]);
  store.summary = summary;
  const game = summary.game;
  const bench = summary.benchmark;
  const me = rows.find((r) => r.is_me);
  const benchValue = bench?.value != null ? Number(bench.value) : null;
  const beatCount = benchValue != null ? rows.filter((r) => Number(r.total_value) > benchValue).length : null;
  const canView = game.show_holdings || store.isMentor;

  const body = [];
  let benchPlaced = benchValue == null;
  for (const r of rows) {
    if (!benchPlaced && Number(r.total_value) < benchValue) {
      body.push(benchRow());
      benchPlaced = true;
    }
    body.push(html`<tr class="${r.is_me ? 'me' : ''}">
      <td class="data"><b>${r.rank}</b></td>
      <td>${canView && !r.is_me ? html`<a class="sym" href="#/player/${r.player_id}">${r.display_name}</a>` : html`<b>${r.display_name}</b>`}${r.is_me ? html` <span class="chip gold" style="margin-left:6px">You</span>` : ''}</td>
      <td class="r"><b>${money(r.total_value)}</b></td>
      <td class="r ${trend(r.return_pct)}">${pctSigned(r.return_pct)}</td>
      <td class="r ${trend(r.day_change_pct)}">${pctSigned(r.day_change_pct)}</td>
      <td class="r">${r.holdings}</td>
      <td class="r">${r.trades}</td>
    </tr>`);
  }
  if (!benchPlaced) body.push(benchRow());

  function benchRow() {
    return html`<tr class="bench"><td>·</td><td>S&amp;P 500 benchmark (${bench.symbol})</td><td class="r">${money(benchValue)}</td><td class="r">${pctSigned(bench.return_pct)}</td><td class="r"></td><td class="r">1</td><td class="r">0</td></tr>`;
  }

  const markup = html`
    ${pageHead('Leaderboard', `${game.name} · ${rows.length} ${rows.length === 1 ? 'player' : 'players'} · started ${etDay(game.starts_at)} with ${money(game.starting_cash, { whole: true })} each`)}
    ${demoBanner()}
    <div class="grid-cards" style="grid-template-columns: repeat(auto-fit, minmax(min(100%, 220px), 1fr))">
      <div class="panel kpi"><span class="label">Your rank</span><span class="value">${me ? `${me.rank} of ${rows.length}` : 'Not playing'}</span>
        <span class="sub muted">${me ? `${pctSigned(me.return_pct)} total return` : 'Mentors can join a game too'}</span></div>
      <div class="panel kpi"><span class="label">${term('benchmark', 'S&P 500 benchmark')}</span><span class="value ${trend(bench?.return_pct)}">${bench?.return_pct != null ? pctSigned(bench.return_pct) : 'n/a'}</span>
        <span class="sub muted">Buy SPY on day one and never trade</span></div>
      <div class="panel kpi"><span class="label">Beating the index</span><span class="value">${beatCount != null ? `${beatCount} of ${rows.length}` : 'n/a'}</span>
        <span class="sub muted">Most professional funds trail it over time</span></div>
    </div>
    <section class="panel flush">
      ${rows.length
        ? html`<div class="table-wrap"><table class="table">
            <thead><tr><th>Rank</th><th>Player</th><th class="r">Value</th><th class="r">Return</th><th class="r">Today</th><th class="r">Holdings</th><th class="r">Trades</th></tr></thead>
            <tbody>${body}</tbody></table></div>`
        : empty('No players yet', 'Share the game code so students can join.')}
    </section>
    ${canView ? html`<p class="faint" style="font-size:var(--step--1)">Tap a name to see that player's holdings. Order notes stay private to each player and the mentors.</p>` : ''}
    ${footer()}`;

  return { html: markup };
}
