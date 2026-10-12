// Shared UI pieces: toasts, bottom sheets / dialogs, copy-to-clipboard, glossary popovers.
import { esc, html, raw } from './dom.js';
import { icon } from './icons.js';
import { GLOSSARY } from '../data/glossary.js';

let toastHost;

export function toast(message, kind = '') {
  if (!toastHost) {
    toastHost = document.createElement('div');
    toastHost.className = 'toasts';
    toastHost.setAttribute('role', 'status');
    toastHost.setAttribute('aria-live', 'polite');
    document.body.append(toastHost);
  }
  const t = document.createElement('div');
  t.className = `toast ${kind}`;
  t.textContent = message;
  toastHost.append(t);
  setTimeout(() => t.remove(), kind === 'bad' ? 6000 : 3800);
}

let openCount = 0;

/** Opens a sheet (bottom sheet on phones, centered dialog on wider screens). Returns close(). */
export function openSheet({ title, body, onMount, onClose, wide = false }) {
  const scrim = document.createElement('div');
  scrim.className = 'scrim';
  const id = 'sheet-title-' + Math.random().toString(36).slice(2, 8);
  scrim.innerHTML = `<div class="sheet" role="dialog" aria-modal="true" aria-labelledby="${id}" ${wide ? 'style="width:min(100%,680px)"' : ''}>
      <div class="sheet-head"><h2 id="${id}">${esc(title)}</h2>
        <button class="icon-btn" type="button" data-close aria-label="Close">${icon('close')}</button></div>
      <div class="sheet-body stack">${body}</div>
    </div>`;
  const prevFocus = document.activeElement;
  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    scrim.remove();
    document.removeEventListener('keydown', onKey);
    openCount = Math.max(0, openCount - 1);
    if (onClose) onClose();
    if (prevFocus && prevFocus.focus) prevFocus.focus();
  };
  const onKey = (e) => {
    if (e.key === 'Escape') close();
  };
  scrim.addEventListener('click', (e) => {
    if (e.target === scrim || e.target.closest('[data-close]')) close();
  });
  document.addEventListener('keydown', onKey);
  document.body.append(scrim);
  openCount++;
  const sheet = scrim.querySelector('.sheet');
  if (onMount) onMount(sheet, close);
  const first = sheet.querySelector('input, select, textarea, button:not([data-close])');
  if (first) first.focus({ preventScroll: true });
  return close;
}

export function sheetIsOpen() {
  return openCount > 0;
}

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    toast('Copied to clipboard', 'good');
    return true;
  } catch (_) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.append(ta);
    ta.select();
    let ok = false;
    try {
      ok = document.execCommand('copy');
    } catch (_) {
      ok = false;
    }
    ta.remove();
    toast(ok ? 'Copied to clipboard' : `Copy this: ${text}`, ok ? 'good' : '');
    return ok;
  }
}

/** A glossary term as an inline button; tap shows the definition. */
export function term(id, label) {
  const g = GLOSSARY[id];
  if (!g) return html`${label}`;
  return html`<button type="button" class="term" data-term="${id}">${label || g.term}</button>`;
}

export function installTermPopovers(root = document) {
  root.addEventListener('click', (e) => {
    const b = e.target instanceof Element ? e.target.closest('[data-term]') : null;
    if (!b) return;
    const g = GLOSSARY[b.dataset.term];
    if (!g) return;
    e.preventDefault();
    openSheet({
      title: g.term,
      body: html`<p style="font-size: var(--step-1)">${g.def}</p>
        <a class="btn secondary small" href="#/glossary" data-close>Open the glossary</a>`.toString()
    });
  });
}

export function confirmSheet({ title, message, confirmLabel = 'Confirm', danger = false }) {
  return new Promise((resolve) => {
    let answered = false;
    const close = openSheet({
      title,
      body: html`<p>${message}</p>
        <div class="row-wrap">
          <button class="btn ${danger ? 'danger' : ''}" type="button" data-yes>${confirmLabel}</button>
          <button class="btn secondary" type="button" data-close>Cancel</button>
        </div>`.toString(),
      onMount: (sheet, done) => {
        sheet.querySelector('[data-yes]').addEventListener('click', () => {
          answered = true;
          done();
          resolve(true);
        });
      },
      onClose: () => {
        if (!answered) resolve(false);
      }
    });
    return close;
  });
}

export { raw };
