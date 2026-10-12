// Alpha Academy Trading Floor: app shell, routing, and the live price loop.
import { html, raw, $, $$, on, debounce } from './lib/dom.js';
import { icon, MARK } from './lib/icons.js';
import { route, start, navigate, currentPath, match } from './lib/router.js';
import { toast, openSheet, installTermPopovers, sheetIsOpen } from './lib/ui.js';
import { money, price as fmtPrice } from './lib/format.js';
import { createApi } from './api/index.js';
import { store, isDemo, loadSession, refreshMarket, refreshPlayer, mergeQuotes, playerId, savedTheme, applyTheme } from './state.js';
import { marketBadge, updateBindings, livePrice, liveChange } from './views/common.js';
import * as Home from './views/home.js';
import * as Markets from './views/markets.js';
import * as Stock from './views/stock.js';
import * as Portfolio from './views/portfolio.js';
import * as Orders from './views/orders.js';
import * as Leaderboard from './views/leaderboard.js';
import * as Player from './views/player.js';
import * as Learn from './views/learn.js';
import * as Tools from './views/tools.js';
import * as Resources from './views/resources.js';
import * as Account from './views/account.js';
import * as Join from './views/join.js';
import * as Mentor from './views/mentor.js';

const DEFAULTS = {
  appName: 'Alpha Academy Trading Floor',
  programName: 'Alpha Academy',
  chapterName: 'Gamma Iota Lambda Chapter',
  orgName: 'Alpha Phi Alpha Fraternity, Inc.',
  siteUrl: 'https://gil1906.org/',
  instagram: 'https://www.instagram.com/gil1906/',
  publicUrl: '',
  supabaseUrl: '',
  supabaseKey: '',
  preview: false
};

const NAV_PLAY = [
  ['home', '/', 'Home', 'home'],
  ['markets', '/markets', 'Markets', 'markets'],
  ['portfolio', '/portfolio', 'Portfolio', 'portfolio'],
  ['orders', '/orders', 'Orders', 'orders'],
  ['leaderboard', '/leaderboard', 'Leaderboard', 'ranks']
];
const NAV_LEARN = [
  ['learn', '/learn', 'Lessons', 'learn'],
  ['glossary', '/glossary', 'Glossary', 'book'],
  ['tools', '/tools', 'Calculators', 'tools'],
  ['resources', '/resources', 'Resources', 'resources']
];
const TABS = [
  ['home', '/', 'Home', 'home'],
  ['markets', '/markets', 'Markets', 'markets'],
  ['portfolio', '/portfolio', 'Portfolio', 'portfolio'],
  ['leaderboard', '/leaderboard', 'Ranks', 'ranks'],
  ['learn', '/learn', 'Learn', 'learn']
];

let view = null;
let renderSeq = 0;
let lastPath = null;

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = () => reject(new Error(`Could not load ${src}`));
    document.head.append(s);
  });
}

function needsPlayer(handlerKey) {
  return ['home', 'portfolio', 'orders', 'leaderboard', 'player'].includes(handlerKey);
}

function defineRoutes() {
  const wrap = (key, fn) => async (ctx) => {
    if (needsPlayer(key) && !store.current) {
      if (key === 'player' && store.isMentor) return fn(ctx);
      navigate(store.isMentor ? '/mentor' : '/join', { replace: true });
      return null;
    }
    ctx.navKey = key;
    return fn(ctx);
  };
  route('/', wrap('home', Home.render));
  route('/markets', wrap('markets', Markets.render));
  route('/stock/:sym', wrap('markets', Stock.render));
  route('/portfolio', wrap('portfolio', Portfolio.render));
  route('/orders', wrap('orders', Orders.render));
  route('/leaderboard', wrap('leaderboard', Leaderboard.render));
  route('/player/:id', wrap('player', (ctx) => Player.render(ctx)));
  route('/learn', wrap('learn', Learn.renderIndex));
  route('/learn/:id', wrap('learn', Learn.renderLesson));
  route('/learn/:id/exam', wrap('learn', Learn.renderExam));
  route('/glossary', wrap('glossary', Learn.renderGlossary));
  route('/tools', wrap('tools', Tools.render));
  route('/resources', wrap('resources', Resources.render));
  route('/account', wrap('account', Account.render));
  route('/join', wrap('join', Join.render));
  route('/join/:code', wrap('join', Join.render));
  route('/mentor', wrap('mentor', Mentor.render));
  route('/mentor/new', wrap('mentor', (ctx) => Mentor.render({ ...ctx, sub: 'new' })));
  route('/mentor/game/:id', wrap('mentor', (ctx) => Mentor.render({ ...ctx, sub: 'game' })));
  route('/mentor/player/:id', wrap('mentor', (ctx) => (store.isMentor ? Player.render({ ...ctx, mentorView: true }) : Mentor.render(ctx))));
}

// ------------------------------------------------------------------ shell

function navLinks(items) {
  return items.map(([key, path, label, ic]) => html`<a href="#${path}" data-nav="${key}">${raw(icon(ic))}<span>${label}</span></a>`);
}

function shell() {
  const c = store.config;
  return html`
    <div class="app">
      <aside class="rail" aria-label="Main navigation">
        <a class="brand" href="#/">${raw(MARK)}<span class="words"><span class="program">${c.programName}</span><span class="product">Trading Floor</span></span></a>
        <div><div class="nav-label eyebrow">Play</div><nav>${navLinks(NAV_PLAY)}</nav></div>
        <div><div class="nav-label eyebrow">Learn</div><nav>${navLinks(NAV_LEARN)}</nav></div>
        <div class="rail-foot">
          <div id="rail-game"></div>
          <nav>
            <a href="#/account" data-nav="account">${raw(icon('account'))}<span>Account</span></a>
            <a href="#/mentor" data-nav="mentor">${raw(icon('mentor'))}<span>Mentor panel</span></a>
          </nav>
          <button class="btn secondary small" type="button" data-theme-cycle>${raw(icon('moon'))}<span data-theme-label>Theme</span></button>
        </div>
      </aside>
      <header class="topbar">
        <a class="brand-compact" href="#/" aria-label="${c.programName} Trading Floor">${raw(MARK)}<span class="words"><span class="program">${c.programName}</span><span class="product">Trading Floor</span></span></a>
        <div class="search-wrap">
          <div class="search">${raw(icon('search'))}
            <label class="sr-only" for="top-search">Search stocks and funds</label>
            <input id="top-search" class="input" type="search" autocomplete="off" placeholder="Search stocks and funds">
            <div class="search-results" id="top-results" hidden></div>
          </div>
        </div>
        <span class="spacer"></span>
        <span id="market-badge">${marketBadge(store.market)}</span>
        <button class="icon-btn search-toggle" type="button" data-search-open aria-label="Search">${raw(icon('search'))}</button>
        <div class="rel">
          <button class="icon-btn" type="button" data-menu aria-haspopup="true" aria-expanded="false" aria-label="Account menu">${raw(icon('account'))}</button>
          <div class="menu" id="acct-menu" hidden>
            <a href="#/account">${raw(icon('account'))}Account</a>
            <a href="#/orders">${raw(icon('orders'))}Orders</a>
            <a href="#/glossary">${raw(icon('book'))}Glossary</a>
            <a href="#/resources">${raw(icon('resources'))}Resources</a>
            <a href="#/mentor">${raw(icon('mentor'))}Mentor panel</a>
            <button type="button" data-theme-cycle>${raw(icon('moon'))}<span data-theme-label>Theme</span></button>
          </div>
        </div>
      </header>
      <div class="tape" id="tape" aria-label="Featured prices"></div>
      <main class="main" id="main" tabindex="-1"></main>
      <nav class="tabbar" aria-label="Main navigation">
        ${TABS.map(([key, path, label, ic]) => html`<a href="#${path}" data-nav="${key}">${raw(icon(ic))}<span>${label}</span></a>`)}
      </nav>
    </div>`;
}

function paintTape() {
  const tape = $('#tape');
  if (!tape) return;
  const pick = store.featured.filter((f) => f.quote).slice(0, 40);
  if (!pick.length) {
    tape.innerHTML = '';
    return;
  }
  const items = pick.map((f) => html`<a href="#/stock/${f.symbol}"><b>${f.symbol}</b>${livePrice(f.symbol)}${liveChange(f.symbol)}</a>`);
  tape.innerHTML = html`<div class="tape-track">${items}${items}</div>`.toString();
}

function paintRailGame() {
  const host = $('#rail-game');
  if (!host) return;
  const cur = store.current;
  host.innerHTML = cur
    ? html`<div class="game-card"><span class="eyebrow">Playing in</span><b>${cur.game.name}</b>
        <span class="faint" style="font-size:var(--step--1)">${cur.player.display_name} · code ${cur.game.join_code}</span></div>`.toString()
    : html`<a class="btn small block" href="#/join">Join a game</a>`.toString();
}

function paintThemeLabels() {
  const t = savedTheme();
  const label = t === 'dark' ? 'Dark theme' : t === 'light' ? 'Light theme' : 'Theme: device';
  $$('[data-theme-label]').forEach((el) => {
    el.textContent = label;
  });
}

function setActiveNav(key) {
  $$('[data-nav]').forEach((a) => {
    if (a.dataset.nav === key) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
}

// ------------------------------------------------------------------ routing

async function renderRoute(path) {
  const main = $('#main');
  const seq = ++renderSeq;
  const m = match(path) || match('/');
  const isRerender = path === lastPath;
  if (view?.destroy) {
    try {
      view.destroy();
    } catch (_) {
      // ignore
    }
  }
  view = null;
  if (!isRerender) main.innerHTML = '<div class="view"><div class="skeleton" style="height:140px"></div><div class="skeleton" style="height:260px"></div></div>';
  const ctx = {
    params: m.params,
    navigate,
    rerender: () => renderRoute(currentPath()),
    restart
  };
  try {
    const out = await m.handler(ctx);
    if (seq !== renderSeq || !out) return;
    const scrollY = window.scrollY;
    main.innerHTML = `<div class="view">${out.html}</div>`;
    const el = main.firstElementChild;
    const mounted = out.mount ? await out.mount(el) : null;
    if (seq !== renderSeq) {
      if (typeof mounted === 'function') mounted();
      else mounted?.destroy?.();
      return;
    }
    view = typeof mounted === 'function' ? { destroy: mounted } : mounted || {};
    setActiveNav(ctx.navKey);
    updateBindings(main);
    if (isRerender) window.scrollTo(0, scrollY);
    else {
      window.scrollTo(0, 0);
      main.focus({ preventScroll: true });
    }
    lastPath = path;
  } catch (e) {
    if (seq !== renderSeq) return;
    console.error(e);
    main.innerHTML = html`<div class="view"><div class="panel"><div class="empty"><b>This page did not load.</b><span>${e.message || 'Check your connection and try again.'}</span>
      <button class="btn" type="button" data-retry>Try again</button></div></div></div>`.toString();
    lastPath = path;
  }
}

async function restart(path = '/') {
  await loadSession();
  await refreshPlayer().catch(() => {});
  paintRailGame();
  lastPath = null;
  navigate(path, { replace: true });
}

// ------------------------------------------------------------------ live loop

async function tickOnce() {
  if (document.hidden) return;
  try {
    if (isDemo()) {
      const fills = store.api.tick();
      for (const o of fills) toast(`${o.side === 'buy' ? 'Bought' : 'Sold'} ${Number(o.filled_qty).toLocaleString('en-US', { maximumFractionDigits: 4 })} ${o.symbol} at ${fmtPrice(o.filled_price)}`, 'good');
      if (fills.length && view && !sheetIsOpen()) renderRoute(currentPath());
    }
    const onScreen = [...new Set($$('#main [data-q], .sheet [data-q]').map((el) => el.dataset.q))];
    const featured = store.featured.map((f) => f.symbol);
    const want = [...new Set([...onScreen, ...(isDemo() ? featured : [])])];
    if (want.length) {
      const chunks = [];
      for (let i = 0; i < want.length; i += 50) chunks.push(want.slice(i, i + 50));
      for (const c of chunks) mergeQuotes(await store.api.getQuotes(c));
    }
    if (playerId() && store.portfolio) {
      store.portfolio = await store.api.getPortfolio(playerId());
    }
    updateBindings(document);
    if (view?.tick) view.tick();
  } catch (e) {
    // transient network issues should not interrupt the student
    console.warn('tick', e);
  }
}

let slowTicks = 0;
async function slowTick() {
  if (document.hidden) return;
  slowTicks++;
  try {
    await refreshMarket();
    $('#market-badge').innerHTML = marketBadge(store.market).toString();
    paintTape();
    updateBindings(document);
    if (playerId() && !isDemo() && slowTicks % 10 === 0) store.api.heartbeat(playerId());
  } catch (_) {
    // ignore
  }
}

// ------------------------------------------------------------------ global events

function installGlobalHandlers() {
  // Internal links go through the router (works in previews and embedded frames too).
  document.addEventListener('click', (e) => {
    const a = e.target instanceof Element ? e.target.closest('a[href^="#/"]') : null;
    if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || a.target === '_blank') return;
    e.preventDefault();
    $('#acct-menu')?.setAttribute('hidden', '');
    const results = $('#top-results');
    if (results) results.hidden = true;
    navigate(a.getAttribute('href').slice(1));
  });

  on(document, 'click', '[data-retry]', () => renderRoute(currentPath()));

  on(document, 'click', '[data-theme-cycle]', () => {
    const order = ['auto', 'dark', 'light'];
    const next = order[(order.indexOf(savedTheme()) + 1) % order.length];
    applyTheme(next);
    paintThemeLabels();
    toast(next === 'auto' ? 'Theme follows your device' : `${next[0].toUpperCase() + next.slice(1)} theme`);
  });

  const menuBtn = $('[data-menu]');
  const menu = $('#acct-menu');
  menuBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const open = menu.hidden;
    menu.hidden = !open;
    menuBtn.setAttribute('aria-expanded', String(open));
  });
  document.addEventListener('click', (e) => {
    if (!menu.hidden && !e.target.closest('#acct-menu') && !e.target.closest('[data-menu]')) {
      menu.hidden = true;
      menuBtn.setAttribute('aria-expanded', 'false');
    }
    const results = $('#top-results');
    if (results && !results.hidden && !e.target.closest('.search-wrap')) results.hidden = true;
  });

  // Desktop search
  const input = $('#top-search');
  const out = $('#top-results');
  let seq = 0;
  input.addEventListener('input', debounce(async () => {
    const q = input.value.trim();
    const my = ++seq;
    if (!q) {
      out.hidden = true;
      return;
    }
    const rows = await store.api.searchSymbols(q).catch(() => []);
    if (my !== seq) return;
    out.innerHTML = Markets.searchResultsHtml(rows, q);
    out.hidden = false;
  }, 200));
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const first = out.querySelector('[data-result]');
      if (first) {
        first.click();
        input.value = '';
      }
    }
    if (e.key === 'Escape') {
      input.value = '';
      out.hidden = true;
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === '/' && !e.target.closest('input, textarea, select') && input.offsetParent) {
      e.preventDefault();
      input.focus();
    }
  });

  // Mobile search sheet
  on(document, 'click', '[data-search-open]', () => {
    openSheet({
      title: 'Search',
      body: `<div class="search">${icon('search')}<label class="sr-only" for="sheet-search">Search stocks and funds</label>
        <input id="sheet-search" class="input" type="search" autocomplete="off" placeholder="Name or ticker, like Nike or NKE"></div>
        <div id="sheet-results"></div>`,
      onMount: (sheet, close) => {
        const i = $('#sheet-search', sheet);
        const r = $('#sheet-results', sheet);
        let s2 = 0;
        i.addEventListener('input', debounce(async () => {
          const q = i.value.trim();
          const my = ++s2;
          const rows = q ? await store.api.searchSymbols(q).catch(() => []) : [];
          if (my !== s2) return;
          r.innerHTML = Markets.searchResultsHtml(rows, q);
        }, 200));
        sheet.addEventListener('click', (e) => {
          if (e.target.closest('a[href^="#/"]')) close();
        });
      }
    });
  });

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      tickOnce();
      slowTick();
    }
  });
}

// ------------------------------------------------------------------ boot

async function boot() {
  store.config = { ...DEFAULTS, ...(window.APP_CONFIG || {}) };
  if (savedTheme() !== 'auto') applyTheme(savedTheme());
  const root = document.getElementById('app');

  if (store.config.supabaseUrl && store.config.supabaseKey && !window.supabase) {
    try {
      await loadScript(store.config.supabaseScript || 'vendor/supabase.js');
    } catch (e) {
      console.error(e);
    }
  }
  if (!window.qrcode && store.config.qrcodeScript !== false) {
    loadScript(store.config.qrcodeScript || 'vendor/qrcode.js').catch(() => {});
  }

  store.api = createApi(store.config);
  try {
    await store.api.init();
    await loadSession();
  } catch (e) {
    root.innerHTML = html`<div class="main"><div class="panel"><div class="empty"><b>The trading floor could not connect.</b><span>${e.message}</span></div></div></div>`.toString();
    return;
  }

  root.innerHTML = shell().toString();
  paintThemeLabels();
  paintRailGame();
  installTermPopovers(document);
  installGlobalHandlers();
  defineRoutes();

  await Promise.all([refreshMarket().catch(() => {}), refreshPlayer().catch(() => {})]);
  $('#market-badge').innerHTML = marketBadge(store.market).toString();
  paintTape();

  if (store.api.onAuthChange) {
    store.api.onAuthChange(() => {});
  }

  start(renderRoute);
  setInterval(tickOnce, isDemo() ? 4000 : 30000);
  setInterval(slowTick, isDemo() ? 30000 : 60000);
  if (playerId() && !isDemo()) store.api.heartbeat(playerId());
}

boot();
