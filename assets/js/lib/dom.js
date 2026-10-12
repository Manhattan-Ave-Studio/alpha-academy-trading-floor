// Tiny DOM helpers: an escaping `html` template tag, query helpers, and event delegation.

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ESC[c]);
}

export class Raw {
  constructor(s) {
    this.s = String(s);
  }
  toString() {
    return this.s;
  }
}

/** Mark a trusted string (already-escaped markup) so `html` does not escape it again. */
export const raw = (s) => new Raw(s);

function renderValue(v) {
  if (v == null) return '';
  if (v === true || v === false) return String(v);
  if (v instanceof Raw) return v.s;
  if (Array.isArray(v)) return v.map(renderValue).join('');
  return esc(v);
}

/** Template tag: interpolated values are escaped unless they come from `html` or `raw`. */
export function html(strings, ...values) {
  let out = '';
  for (let i = 0; i < strings.length; i++) {
    out += strings[i];
    if (i < values.length) out += renderValue(values[i]);
  }
  return new Raw(out);
}

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

/** Delegated listener. Returns a function that removes it. */
export function on(root, type, selector, handler, options) {
  const fn = (e) => {
    const el = e.target instanceof Element ? e.target.closest(selector) : null;
    if (el && root.contains(el)) handler(e, el);
  };
  root.addEventListener(type, fn, options);
  return () => root.removeEventListener(type, fn, options);
}

export function setHTML(el, markup) {
  if (el) el.innerHTML = String(markup);
}

export function debounce(fn, ms) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

/** Number from a value that may be a numeric string (Data API) or null. */
export function n(v) {
  if (v == null || v === '') return null;
  const x = Number(v);
  return Number.isFinite(x) ? x : null;
}
