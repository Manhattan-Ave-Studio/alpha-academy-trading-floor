// Line icons (24px grid, 1.75 stroke, currentColor).
const wrap = (body, extra = '') =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${body}</svg>`;

export const ICONS = {
  home: wrap('<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20h5v-6h4v6h5V9.5"/>'),
  markets: wrap('<path d="M3 17l5-5 4 3 7-8"/><path d="M15 7h4v4"/><path d="M3 21h18"/>'),
  portfolio: wrap('<path d="M12 3a9 9 0 1 0 9 9h-9z"/><path d="M15 3.5A9 9 0 0 1 20.5 9H15z"/>'),
  ranks: wrap('<path d="M8 21h8"/><path d="M12 17v4"/><path d="M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M17 5h3v2a3 3 0 0 1-3 3"/><path d="M7 5H4v2a3 3 0 0 0 3 3"/>'),
  learn: wrap('<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5"/><path d="M8 7h8"/>'),
  orders: wrap('<path d="M9 6h11"/><path d="M9 12h11"/><path d="M9 18h11"/><path d="M4 6h.01"/><path d="M4 12h.01"/><path d="M4 18h.01"/>'),
  resources: wrap('<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>'),
  account: wrap('<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>'),
  mentor: wrap('<path d="M12 3 4 6v6c0 4.5 3.4 8.3 8 9 4.6-.7 8-4.5 8-9V6z"/><path d="m9 12 2 2 4-4"/>'),
  search: wrap('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>'),
  star: wrap('<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3 6.4 20.2l1.1-6.2L3 9.6l6.2-.9z"/>'),
  close: wrap('<path d="M6 6l12 12"/><path d="M18 6 6 18"/>'),
  info: wrap('<circle cx="12" cy="12" r="9"/><path d="M12 11v6"/><path d="M12 7.5h.01"/>'),
  sun: wrap('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'),
  moon: wrap('<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>'),
  logout: wrap('<path d="M15 4h4v16h-4"/><path d="M10 8l-4 4 4 4"/><path d="M6 12h10"/>'),
  copy: wrap('<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>'),
  plus: wrap('<path d="M12 5v14M5 12h14"/>'),
  back: wrap('<path d="M15 5l-7 7 7 7"/>'),
  refresh: wrap('<path d="M20 11a8 8 0 0 0-14.3-4.9L4 8"/><path d="M4 4v4h4"/><path d="M4 13a8 8 0 0 0 14.3 4.9L20 16"/><path d="M20 20v-4h-4"/>'),
  external: wrap('<path d="M14 4h6v6"/><path d="M20 4 11 13"/><path d="M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5"/>'),
  menu: wrap('<path d="M4 7h16M4 12h16M4 17h16"/>'),
  tools: wrap('<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 7h8"/><path d="M8 11h.01M12 11h.01M16 11h.01M8 15h.01M12 15h.01M16 15h.01"/>'),
  book: wrap('<path d="M12 6.5C10.5 5 8 4.5 4 4.5v14c4 0 6.5.5 8 2 1.5-1.5 4-2 8-2v-14c-4 0-6.5.5-8 2z"/><path d="M12 6.5v14"/>'),
  check: wrap('<path d="m5 12 4.5 4.5L19 7"/>'),
  lock: wrap('<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>'),
  candles: wrap('<path d="M7 3v4M7 17v4M17 3v2M17 15v6"/><rect x="5" y="7" width="4" height="10" rx="1"/><rect x="15" y="5" width="4" height="10" rx="1"/>'),
  line: wrap('<path d="M3 17l5-5 4 3 9-9"/>'),
  play: wrap('<circle cx="12" cy="12" r="9"/><path d="M10 8.6v6.8l5.6-3.4z"/>'),
  clock: wrap('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.2 2"/>'),
  exam: wrap('<path d="M9 4h6v3H9z"/><path d="M8 5.5H6a1 1 0 0 0-1 1V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V6.5a1 1 0 0 0-1-1h-2"/><path d="m9 13.5 2 2 4-4"/>'),
  qr: wrap('<rect x="4" y="4" width="6" height="6"/><rect x="14" y="4" width="6" height="6"/><rect x="4" y="14" width="6" height="6"/><path d="M14 14h2v2h-2zM18 18h2v2h-2zM14 18h2M18 14h2"/>')
};

export function icon(name, extraClass = '') {
  const svg = ICONS[name] || '';
  return extraClass ? svg.replace('<svg ', `<svg class="${extraClass}" `) : svg;
}

/** The Alpha Academy Mentorship Program logo. scripts/build-preview.mjs inlines this file for the one-file preview. */
export const LOGO_SRC = 'assets/img/alpha-academy-logo.webp';
// Decorative: the program name beside it, or the link's aria-label, names the link.
export const MARK = `<img class="mark" src="${LOGO_SRC}" alt="" width="40" height="40" decoding="async">`;
