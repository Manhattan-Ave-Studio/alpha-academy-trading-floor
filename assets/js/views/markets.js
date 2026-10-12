// Markets: search any symbol, the major index funds, curated collections, and today's movers.
import { html, raw, debounce, $ } from '../lib/dom.js';
import { icon } from '../lib/icons.js';
import { store, mergeQuotes, isDemo } from '../state.js';
import { COLLECTIONS } from '../data/universe.js';
import { quoteRow, symBadge, livePrice, liveChange, pageHead, footer, changeOf, empty, demoBanner } from './common.js';

const INDEX = [
  ['SPY', 'S&P 500'],
  ['QQQ', 'Nasdaq-100'],
  ['DIA', 'Dow 30'],
  ['IWM', 'Small caps']
];

let lastCollection = 'brands';

// On touch screens the Browse row scrolls sideways. Bring a chip fully into view without moving the page.
function reveal(row, chip) {
  const r = row.getBoundingClientRect();
  const c = chip.getBoundingClientRect();
  if (c.left < r.left) row.scrollLeft -= r.left - c.left + 16;
  else if (c.right > r.right) row.scrollLeft += c.right - r.right + 16;
}

export function searchResultsHtml(rows, query) {
  if (!query) return '';
  if (!rows.length) {
    return html`<div class="empty"><b>No matches for "${query}"</b><span>${isDemo() ? 'The demo includes about 100 featured companies and funds. The live site searches every U.S.-listed stock and ETF.' : 'Try the ticker symbol, like NKE for Nike.'}</span></div>`.toString();
  }
  return html`<div class="list">${rows.map((r) => html`<a class="list-row" href="#/stock/${r.symbol}" data-result>
      ${symBadge(r.symbol, r.asset_type)}
      <span class="who"><b>${r.symbol}</b><span>${r.name}</span></span>
      <span class="px"><span class="chip">${r.asset_type === 'etf' ? 'ETF' : r.exchange || 'Stock'}</span></span>
    </a>`)}</div>`.toString();
}

export async function render() {
  const featured = store.featured;
  const bySym = new Map(featured.map((f) => [f.symbol, f]));
  const collection = COLLECTIONS.find((c) => c.id === lastCollection) ? lastCollection : 'brands';
  const inCollection = (id) => featured.filter((f) => (f.collections || []).includes(id));
  const movers = featured
    .filter((f) => f.quote && f.asset_type !== 'etf')
    .map((f) => ({ ...f, c: changeOf(f.quote).pct }))
    .filter((f) => f.c != null)
    .sort((a, b) => b.c - a.c);

  const listFor = (id) => {
    const rows = inCollection(id);
    return rows.length ? html`<div class="list">${rows.map((f) => quoteRow(f))}</div>` : empty('No companies in this group yet.');
  };

  const markup = html`
    ${pageHead('Markets', 'Search any company, or browse groups of companies you already know. Tap one to see its chart, key numbers, and news.')}
    ${demoBanner()}
    <div class="search" style="max-width:640px">
      ${raw(icon('search'))}
      <label class="sr-only" for="m-search">Search stocks and funds</label>
      <input id="m-search" class="input" type="search" autocomplete="off" placeholder="Search by name or ticker, like Nike or NKE">
      <div class="search-results" id="m-results" hidden></div>
    </div>

    <section class="panel">
      <div class="panel-head"><h3>The market today</h3><span class="faint" style="font-size:var(--step--1)">Index funds that track the big benchmarks</span></div>
      <div class="grid-cards" style="grid-template-columns: repeat(auto-fit, minmax(min(100%, 200px), 1fr))">
        ${INDEX.map(([s, label]) => html`<a class="list-row" href="#/stock/${s}" style="border:1px solid var(--line); border-radius: var(--radius-sm); padding: 12px">
          ${symBadge(s, 'etf')}
          <span class="who"><b>${label}</b><span>${s}</span></span>
          <span class="px">${livePrice(s)}${liveChange(s)}</span></a>`)}
      </div>
    </section>

    <div class="grid-2">
      <section class="panel flush">
        <div class="panel-head" style="flex-direction:column; align-items:stretch">
          <h3>Browse</h3>
          <div class="chips scroll" role="tablist" aria-label="Collections">
            ${COLLECTIONS.map((c) => html`<button class="chip" type="button" role="tab" data-col="${c.id}" aria-pressed="${c.id === collection}" aria-selected="${c.id === collection}">${c.title}</button>`)}
          </div>
        </div>
        <div id="col-list" style="margin-top:6px">${listFor(collection)}</div>
      </section>

      <div class="stack" style="gap:20px">
        <section class="panel flush">
          <div class="panel-head"><h3>Biggest gainers</h3><span class="faint" style="font-size:var(--step--1)">Today</span></div>
          <div class="list">${movers.slice(0, 5).map((f) => quoteRow(f))}</div>
        </section>
        <section class="panel flush">
          <div class="panel-head"><h3>Biggest decliners</h3><span class="faint" style="font-size:var(--step--1)">Today</span></div>
          <div class="list">${movers.slice(-5).reverse().map((f) => quoteRow(f))}</div>
        </section>
      </div>
    </div>
    ${footer()}`;

  return {
    html: markup,
    mount(el) {
      const input = $('#m-search', el);
      const out = $('#m-results', el);
      const chipRow = $('.chips.scroll', el);
      const chosenChip = chipRow.querySelector('[aria-pressed="true"]');
      if (chosenChip) reveal(chipRow, chosenChip);
      let seq = 0;
      const run = debounce(async () => {
        const q = input.value.trim();
        const my = ++seq;
        if (!q) {
          out.hidden = true;
          out.innerHTML = '';
          return;
        }
        try {
          const rows = await store.api.searchSymbols(q);
          if (my !== seq) return;
          out.innerHTML = searchResultsHtml(rows, q);
          out.hidden = false;
        } catch (e) {
          out.innerHTML = `<div class="empty">${e.message}</div>`;
          out.hidden = false;
        }
      }, 220);
      input.addEventListener('input', run);
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          input.value = '';
          out.hidden = true;
        }
        if (e.key === 'Enter') {
          const first = out.querySelector('[data-result]');
          if (first) first.click();
        }
      });
      el.addEventListener('click', (e) => {
        const b = e.target.closest('[data-col]');
        if (!b) {
          if (!e.target.closest('.search')) out.hidden = true;
          return;
        }
        lastCollection = b.dataset.col;
        reveal(chipRow, b);
        el.querySelectorAll('[data-col]').forEach((x) => {
          const on = x.dataset.col === lastCollection;
          x.setAttribute('aria-pressed', String(on));
          x.setAttribute('aria-selected', String(on));
        });
        const rows = featured.filter((f) => (f.collections || []).includes(lastCollection));
        $('#col-list', el).innerHTML = (rows.length ? html`<div class="list">${rows.map((f) => quoteRow(f))}</div>` : empty('No companies in this group yet.')).toString();
      });
      // Make sure index fund quotes are present even if they are not featured.
      const missing = INDEX.map(([s]) => s).filter((s) => !bySym.has(s));
      if (missing.length) store.api.getQuotes(missing).then(mergeQuotes).catch(() => {});
    }
  };
}
