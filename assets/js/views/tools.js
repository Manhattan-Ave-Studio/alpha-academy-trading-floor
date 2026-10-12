// Calculators: compound growth, credit card payoff, and a 50/30/20 budget.
import { html, raw, $, n } from '../lib/dom.js';
import { money } from '../lib/format.js';
import { icon } from '../lib/icons.js';
import { growthBarsSvg } from '../lib/charts.js';
import { pageHead, footer } from './common.js';

export function growth({ start, monthly, rate, years }) {
  const r = rate / 100 / 12;
  let bal = start;
  let contributed = start;
  const rows = [];
  for (let y = 1; y <= years; y++) {
    for (let m = 0; m < 12; m++) {
      bal = bal * (1 + r) + monthly;
      contributed += monthly;
    }
    rows.push({ year: y, total: bal, contributed });
  }
  return { total: bal, contributed, growth: bal - contributed, rows };
}

export function payoff({ balance, apr, payment }) {
  const r = apr / 100 / 12;
  if (payment <= balance * r) return { never: true, minimum: balance * r };
  let b = balance;
  let months = 0;
  let interest = 0;
  while (b > 0.005 && months < 1200) {
    const i = b * r;
    interest += i;
    b = b + i - payment;
    months++;
  }
  return { never: false, months, interest };
}

function field(id, label, value, { prefix = '', suffix = '', hint = '' } = {}) {
  return html`<div class="field"><label for="${id}">${label}</label>
    <div class="input-affix">${prefix ? html`<span class="affix">${prefix}</span>` : ''}<input id="${id}" class="input" inputmode="decimal" value="${value}" ${suffix ? raw(`aria-describedby="${id}-s"`) : ''}></div>
    ${suffix ? html`<span class="hint" id="${id}-s">${suffix}</span>` : ''}${hint ? html`<span class="hint">${hint}</span>` : ''}</div>`;
}

export async function render() {
  const markup = html`
    ${pageHead('Calculators', 'Run the numbers from the lessons with your own amounts.', html`<a class="btn secondary" href="#/learn">${raw(icon('back'))} Lessons</a>`)}

    <section class="panel" aria-labelledby="cg">
      <div class="panel-head"><h2 id="cg" style="font-size:var(--step-3)">Compound growth</h2><a class="btn ghost small" href="#/learn/compound-growth">Lesson</a></div>
      <div class="calc-grid">
        ${field('cg-start', 'Starting amount', '1000', { prefix: '$' })}
        ${field('cg-monthly', 'Added each month', '100', { prefix: '$' })}
        ${field('cg-rate', 'Yearly return', '7', { suffix: 'Percent per year. Stocks have averaged roughly 10% long term, with big swings.' })}
        ${field('cg-years', 'Years', '40')}
      </div>
      <div class="calc-out" id="cg-out" style="margin-top:18px"></div>
      <div id="cg-chart" style="margin-top:12px"></div>
      <div class="legend" style="margin-top:6px"><span><i style="background: var(--c2)"></i>Money you put in</span><span><i style="background: var(--gold)"></i>Growth</span></div>
    </section>

    <div class="grid-2" style="grid-template-columns: repeat(auto-fit, minmax(min(100%, 380px), 1fr))">
      <section class="panel" aria-labelledby="cc">
        <div class="panel-head"><h2 id="cc" style="font-size:var(--step-3)">Credit card payoff</h2><a class="btn ghost small" href="#/learn/credit-scores">Lesson</a></div>
        <div class="calc-grid">
          ${field('cc-bal', 'Balance', '1000', { prefix: '$' })}
          ${field('cc-apr', 'APR', '24', { suffix: 'Percent per year' })}
          ${field('cc-pay', 'Monthly payment', '30', { prefix: '$' })}
        </div>
        <div class="calc-out" id="cc-out" style="margin-top:18px"></div>
      </section>

      <section class="panel" aria-labelledby="bud">
        <div class="panel-head"><h2 id="bud" style="font-size:var(--step-3)">50/30/20 budget</h2><a class="btn ghost small" href="#/learn/budgeting-paycheck">Lesson</a></div>
        <div class="calc-grid">
          ${field('b-hourly', 'Hourly pay', '17', { prefix: '$', hint: 'NYC minimum wage in 2026 is $17.' })}
          ${field('b-hours', 'Hours per week', '20')}
        </div>
        <div class="calc-out" id="b-out" style="margin-top:18px"></div>
      </section>
    </div>
    ${footer()}`;

  return {
    html: markup,
    mount(el) {
      const val = (id) => Math.max(0, n($(id, el).value.replace(/[^0-9.]/g, '')) ?? 0);
      const kpi = (label, value, cls = '') => `<div class="kpi"><span class="label">${label}</span><span class="value ${cls}">${value}</span></div>`;

      function calcGrowth() {
        const years = Math.min(70, Math.round(val('#cg-years')));
        const g = growth({ start: val('#cg-start'), monthly: val('#cg-monthly'), rate: Math.min(val('#cg-rate'), 50), years });
        $('#cg-out', el).innerHTML = kpi(`After ${years} years`, money(g.total, { whole: true }), 'gold') + kpi('You put in', money(g.contributed, { whole: true })) + kpi('Growth', money(g.growth, { whole: true }), 'up');
        const step = years > 20 ? Math.ceil(years / 20) : 1;
        const rows = g.rows.filter((r) => r.year % step === 0 || r.year === years);
        $('#cg-chart', el).innerHTML = rows.length ? growthBarsSvg(rows, { money: (v) => (v >= 1e6 ? '$' + (v / 1e6).toFixed(1) + 'M' : v >= 1e3 ? '$' + Math.round(v / 1e3) + 'K' : '$' + Math.round(v)) }) : '';
      }

      function calcCard() {
        const res = payoff({ balance: val('#cc-bal'), apr: val('#cc-apr'), payment: val('#cc-pay') });
        if (res.never) {
          $('#cc-out', el).innerHTML = `<p class="form-error" style="grid-column: 1 / -1">This payment does not even cover the monthly interest (${money(res.minimum)}), so the balance never goes down. Pay more than that each month.</p>`;
          return;
        }
        const yrs = Math.floor(res.months / 12);
        const mo = res.months % 12;
        const time = `${yrs ? `${yrs} yr ` : ''}${mo ? `${mo} mo` : ''}`.trim();
        const double = payoff({ balance: val('#cc-bal'), apr: val('#cc-apr'), payment: val('#cc-pay') * 2 });
        $('#cc-out', el).innerHTML = kpi('Time to pay off', time || 'Under a month') + kpi('Interest paid', money(res.interest), 'down')
          + `<p class="muted" style="grid-column: 1 / -1; font-size: var(--step--1)">Doubling the payment to ${money(val('#cc-pay') * 2)} finishes in ${double.months} months and saves ${money(res.interest - double.interest)} in interest.</p>`;
      }

      function calcBudget() {
        const gross = (val('#b-hourly') * val('#b-hours') * 52) / 12;
        const takeHome = gross * (1 - 0.0765);
        $('#b-out', el).innerHTML = kpi('Monthly pay before taxes', money(gross)) + kpi('After FICA (7.65%)', money(takeHome))
          + kpi('Needs (50%)', money(takeHome * 0.5)) + kpi('Wants (30%)', money(takeHome * 0.3)) + kpi('Save and invest (20%)', money(takeHome * 0.2), 'gold')
          + `<p class="faint" style="grid-column: 1 / -1; font-size: var(--step--1)">Income taxes may also be withheld depending on your W-4. Many part-time teen workers owe little or none and can get it back by filing a return.</p>`;
      }

      el.addEventListener('input', (e) => {
        const id = e.target.id || '';
        if (id.startsWith('cg-')) calcGrowth();
        if (id.startsWith('cc-')) calcCard();
        if (id.startsWith('b-')) calcBudget();
      });
      calcGrowth();
      calcCard();
      calcBudget();
    }
  };
}
