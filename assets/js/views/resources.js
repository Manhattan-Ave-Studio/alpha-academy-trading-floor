// Resources: vetted, free places to keep learning, plus books.
import { html, raw } from '../lib/dom.js';
import { icon } from '../lib/icons.js';
import { RESOURCE_GROUPS, BOOKS, HISTORY_BOOKS } from '../data/resources.js';
import { pageHead, footer } from './common.js';

export async function render() {
  const markup = html`
    ${pageHead('Resources', 'Free, trustworthy places to keep learning about money, investing, college, careers, and the history of Black Americans in finance. Links open in a new tab.')}
    ${RESOURCE_GROUPS.map((g) => html`<section class="stack ${g.id === 'black-finance-history' ? 'res-feature' : ''}" id="${g.id}" aria-labelledby="rg-${g.id}">
      <h2 id="rg-${g.id}" style="font-size:var(--step-3)">${g.title}</h2>
      ${g.intro ? html`<p class="muted" style="max-width:68ch">${g.intro}</p>` : ''}
      <div class="grid-cards">${g.items.map((it) => html`<a class="res-card" href="${it.url}" target="_blank" rel="noopener">
        <span class="org">${it.org}</span>
        <b>${it.title} ${raw(icon('external', 'inline-ext'))}</b>
        <p>${it.desc}</p>
      </a>`)}</div>
      ${g.id === 'black-finance-history' ? html`<h3 style="margin-top:8px">Books on this history</h3>
        <div class="grid-cards">${HISTORY_BOOKS.map((b) => html`<div class="res-card"><span class="org">${b.author}</span><b>${b.title}</b><p>${b.why}</p></div>`)}</div>` : ''}
    </section>`)}
    <section class="stack" aria-labelledby="books">
      <h2 id="books" style="font-size:var(--step-3)">Books worth reading</h2>
      <div class="grid-cards">${BOOKS.map((b) => html`<div class="res-card"><span class="org">${b.author}</span><b>${b.title}</b><p>${b.why}</p></div>`)}</div>
      <p class="faint" style="font-size:var(--step--1)">Check the Brooklyn Public Library catalog to borrow them free, in print or as e-books.</p>
    </section>
    ${footer()}`;
  return { html: markup };
}
