// Charts drawn for this app: a canvas price/performance chart with a crosshair that works with
// mouse and touch, plus SVG builders for the allocation donut and the savings bar chart.
// Colors come from the CSS tokens, so charts follow the light and dark themes.

import { esc } from './dom.js';

export function token(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

export function withAlpha(color, alpha) {
  const c = color.trim();
  if (c.startsWith('#')) {
    let hex = c.slice(1);
    if (hex.length === 3) hex = hex.split('').map((x) => x + x).join('');
    const v = parseInt(hex.slice(0, 6), 16);
    return `rgba(${(v >> 16) & 255}, ${(v >> 8) & 255}, ${v & 255}, ${alpha})`;
  }
  const m = c.match(/rgba?\(([^)]+)\)/);
  if (m) {
    const [r, g, b] = m[1].split(',').map((x) => parseFloat(x));
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  return c;
}

function niceStep(range, count) {
  const raw = range / Math.max(count, 1);
  const pow = Math.pow(10, Math.floor(Math.log10(raw || 1)));
  const f = raw / pow;
  const nice = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
  return nice * pow;
}

const themeWatchers = new Set();
let themeObserverStarted = false;
function watchTheme(fn) {
  themeWatchers.add(fn);
  if (!themeObserverStarted && typeof window !== 'undefined') {
    themeObserverStarted = true;
    const fire = () => themeWatchers.forEach((f) => f());
    try {
      new MutationObserver(fire).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    } catch (_) {
      // ignore
    }
    try {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', fire);
    } catch (_) {
      // ignore
    }
  }
  return () => themeWatchers.delete(fn);
}

export class PriceChart {
  constructor(container, options = {}) {
    this.el = container;
    this.opts = options;
    this.data = null;
    this.hover = -1;
    this.canvas = document.createElement('canvas');
    this.canvas.setAttribute('role', 'img');
    this.canvas.setAttribute('aria-label', options.label || 'Price chart');
    this.tip = document.createElement('div');
    this.tip.className = 'chart-tip';
    this.tip.hidden = true;
    this.emptyEl = document.createElement('div');
    this.emptyEl.className = 'chart-empty';
    this.emptyEl.hidden = true;
    container.append(this.canvas, this.tip, this.emptyEl);

    this.onMove = (e) => {
      if (!this.layout) return;
      const r = this.canvas.getBoundingClientRect();
      const x = e.clientX - r.left;
      const { left, plotW, n } = this.layout;
      if (n < 1) return;
      const i = Math.round(((x - left) / Math.max(plotW, 1)) * (n - 1));
      this.hover = Math.max(0, Math.min(n - 1, i));
      this.draw();
    };
    this.onLeave = () => {
      this.hover = -1;
      this.draw();
    };
    this.canvas.addEventListener('pointermove', this.onMove);
    this.canvas.addEventListener('pointerdown', this.onMove);
    this.canvas.addEventListener('pointerleave', this.onLeave);
    this.canvas.addEventListener('pointercancel', this.onLeave);

    this.ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => this.draw()) : null;
    if (this.ro) this.ro.observe(container);
    this.unwatch = watchTheme(() => this.draw());
  }

  /**
   * data = {
   *   points: [{t, v}]            main series (line mode)
   *   candles: [{t, o, h, l, c}]  candle mode
   *   bench: [{t, v}]             optional comparison series (dashed), aligned by t
   *   baseline: number            optional dashed reference line (previous close)
   *   mode: 'line' | 'candle'
   *   color: 'trend' | css token name
   *   xLabel(t), yLabel(v), tip(i) -> html
   *   empty: message when there is no data
   * }
   */
  setData(data, { keepHover = false } = {}) {
    this.data = data;
    if (!keepHover) this.hover = -1;
    this.draw();
  }

  destroy() {
    if (this.ro) this.ro.disconnect();
    this.unwatch();
    this.canvas.removeEventListener('pointermove', this.onMove);
    this.canvas.removeEventListener('pointerdown', this.onMove);
    this.canvas.removeEventListener('pointerleave', this.onLeave);
    this.el.innerHTML = '';
  }

  draw() {
    const d = this.data;
    const w = this.el.clientWidth;
    const h = this.el.clientHeight;
    if (!w || !h) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    const ctx = this.canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const isCandle = d && d.mode === 'candle' && d.candles && d.candles.length;
    const pts = isCandle ? d.candles.map((c) => ({ t: c.t, v: c.c })) : (d && d.points) || [];
    if (!d || pts.length < 2) {
      this.layout = null;
      this.tip.hidden = true;
      this.emptyEl.hidden = false;
      this.emptyEl.textContent = (d && d.empty) || (d ? 'Not enough data to draw a chart yet.' : 'Loading chart');
      return;
    }
    this.emptyEl.hidden = true;

    const font = token('--font-data') || 'sans-serif';
    const grid = token('--chart-grid');
    const muted = token('--muted');
    const up = token('--up');
    const down = token('--down');
    const benchColor = token('--chart-bench');
    const baselineColor = token('--chart-baseline');
    const text = token('--text');

    const n = pts.length;
    const benchMap = new Map();
    if (d.bench) d.bench.forEach((b) => benchMap.set(String(b.t), b.v));
    const benchVals = pts.map((p) => (benchMap.has(String(p.t)) ? benchMap.get(String(p.t)) : null));

    let lo = Infinity;
    let hi = -Infinity;
    if (isCandle) {
      d.candles.forEach((c) => {
        lo = Math.min(lo, c.l ?? c.c);
        hi = Math.max(hi, c.h ?? c.c);
      });
    } else {
      pts.forEach((p) => {
        lo = Math.min(lo, p.v);
        hi = Math.max(hi, p.v);
      });
    }
    benchVals.forEach((v) => {
      if (v != null) {
        lo = Math.min(lo, v);
        hi = Math.max(hi, v);
      }
    });
    if (d.baseline != null) {
      lo = Math.min(lo, d.baseline);
      hi = Math.max(hi, d.baseline);
    }
    if (hi - lo < 1e-9) {
      hi += Math.abs(hi) * 0.01 || 1;
      lo -= Math.abs(lo) * 0.01 || 1;
    }
    const pad = (hi - lo) * 0.08;
    lo -= pad;
    hi += pad;

    ctx.font = `500 11px ${font}`;
    const step = niceStep(hi - lo, 4);
    const ticks = [];
    for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) ticks.push(v);
    const yLabel = d.yLabel || ((v) => v.toFixed(2));
    const labelW = Math.max(...ticks.map((v) => ctx.measureText(yLabel(v)).width), 30);

    const left = 4;
    const right = Math.ceil(labelW) + 12;
    const top = 10;
    const bottom = 24;
    const plotW = w - left - right;
    const plotH = h - top - bottom;
    const x = (i) => left + (n === 1 ? plotW / 2 : (i / (n - 1)) * plotW);
    const y = (v) => top + (1 - (v - lo) / (hi - lo)) * plotH;
    this.layout = { left, plotW, n };

    // grid and y labels
    ctx.strokeStyle = grid;
    ctx.lineWidth = 1;
    ctx.fillStyle = muted;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ticks.forEach((v) => {
      const yy = Math.round(y(v)) + 0.5;
      ctx.beginPath();
      ctx.moveTo(left, yy);
      ctx.lineTo(left + plotW, yy);
      ctx.stroke();
      ctx.fillText(yLabel(v), left + plotW + 8, yy);
    });

    // x labels
    const xLabel = d.xLabel || ((t) => String(t));
    const labelCount = Math.max(2, Math.min(5, Math.floor(plotW / 110)));
    ctx.textBaseline = 'alphabetic';
    for (let k = 0; k < labelCount; k++) {
      const i = Math.round((k / (labelCount - 1)) * (n - 1));
      const lx = x(i);
      ctx.textAlign = k === 0 ? 'left' : k === labelCount - 1 ? 'right' : 'center';
      ctx.fillText(xLabel(pts[i].t), lx, h - 6);
    }

    // baseline
    if (d.baseline != null) {
      ctx.save();
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = baselineColor;
      ctx.beginPath();
      const by = Math.round(y(d.baseline)) + 0.5;
      ctx.moveTo(left, by);
      ctx.lineTo(left + plotW, by);
      ctx.stroke();
      ctx.restore();
    }

    // benchmark series
    if (benchVals.some((v) => v != null)) {
      ctx.save();
      ctx.setLineDash([5, 4]);
      ctx.strokeStyle = benchColor;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      let started = false;
      benchVals.forEach((v, i) => {
        if (v == null) return;
        if (!started) {
          ctx.moveTo(x(i), y(v));
          started = true;
        } else ctx.lineTo(x(i), y(v));
      });
      ctx.stroke();
      ctx.restore();
    }

    const ref = d.baseline != null ? d.baseline : pts[0].v;
    const lineColor = !d.color || d.color === 'trend'
      ? (pts[n - 1].v >= ref ? up : down)
      : token(d.color) || text;

    if (isCandle) {
      const bw = Math.max(1, Math.min(10, (plotW / n) * 0.6));
      d.candles.forEach((c, i) => {
        const col = c.c >= c.o ? up : down;
        const cx = Math.round(x(i)) + 0.5;
        ctx.strokeStyle = col;
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.moveTo(cx, y(c.h ?? Math.max(c.o, c.c)));
        ctx.lineTo(cx, y(c.l ?? Math.min(c.o, c.c)));
        ctx.stroke();
        const y1 = y(Math.max(c.o, c.c));
        const y2 = y(Math.min(c.o, c.c));
        ctx.fillRect(cx - bw / 2, y1, bw, Math.max(1, y2 - y1));
      });
    } else {
      const grad = ctx.createLinearGradient(0, top, 0, top + plotH);
      grad.addColorStop(0, withAlpha(lineColor, 0.22));
      grad.addColorStop(1, withAlpha(lineColor, 0));
      ctx.beginPath();
      pts.forEach((p, i) => (i === 0 ? ctx.moveTo(x(i), y(p.v)) : ctx.lineTo(x(i), y(p.v))));
      ctx.lineTo(x(n - 1), top + plotH);
      ctx.lineTo(x(0), top + plotH);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();

      ctx.beginPath();
      pts.forEach((p, i) => (i === 0 ? ctx.moveTo(x(i), y(p.v)) : ctx.lineTo(x(i), y(p.v))));
      ctx.strokeStyle = lineColor;
      ctx.lineWidth = 2;
      ctx.lineJoin = 'round';
      ctx.stroke();

      // endpoint
      ctx.beginPath();
      ctx.arc(x(n - 1), y(pts[n - 1].v), 3.5, 0, Math.PI * 2);
      ctx.fillStyle = lineColor;
      ctx.fill();
    }

    // crosshair
    if (this.hover >= 0 && this.hover < n) {
      const i = this.hover;
      const hx = Math.round(x(i)) + 0.5;
      ctx.save();
      ctx.strokeStyle = baselineColor;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(hx, top);
      ctx.lineTo(hx, top + plotH);
      ctx.stroke();
      ctx.restore();
      ctx.beginPath();
      ctx.arc(hx, y(pts[i].v), 4.5, 0, Math.PI * 2);
      ctx.fillStyle = lineColor;
      ctx.fill();
      ctx.strokeStyle = token('--surface');
      ctx.lineWidth = 2;
      ctx.stroke();

      const tipHtml = d.tip ? d.tip(i, benchVals[i]) : esc(yLabel(pts[i].v));
      this.tip.innerHTML = tipHtml;
      this.tip.hidden = false;
      const tw = this.tip.offsetWidth;
      const tx = Math.max(0, Math.min(w - tw, hx - tw / 2));
      this.tip.style.left = tx + 'px';
    } else {
      this.tip.hidden = true;
    }
  }
}

/** Allocation donut as SVG markup. slices: [{label, value, color}] where color is a CSS token name. */
export function donutSvg(slices, { size = 180, thickness = 26, centerTop = '', centerBottom = '' } = {}) {
  const total = slices.reduce((s, x) => s + Math.max(0, x.value), 0) || 1;
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  let offset = 0;
  const arcs = slices
    .filter((s) => s.value > 0)
    .map((s) => {
      const len = (s.value / total) * c;
      const gap = slices.length > 1 ? Math.min(2, len * 0.2) : 0;
      const seg = `<circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" style="stroke: var(${s.color})" stroke-width="${thickness}" stroke-dasharray="${Math.max(0, len - gap)} ${c}" stroke-dashoffset="${-offset}" transform="rotate(-90 ${size / 2} ${size / 2})"><title>${esc(s.label)}</title></circle>`;
      offset += len;
      return seg;
    })
    .join('');
  return `<svg viewBox="0 0 ${size} ${size}" width="100%" style="max-width:${size}px" role="img" aria-label="Allocation chart">
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" style="stroke: var(--surface-3)" stroke-width="${thickness}"></circle>
    ${arcs}
    <text x="50%" y="47%" text-anchor="middle" style="fill: var(--muted); font: 600 11px var(--font-data); letter-spacing: .02em">${esc(centerTop)}</text>
    <text x="50%" y="60%" text-anchor="middle" style="fill: var(--text); font: 600 17px var(--font-data)">${esc(centerBottom)}</text>
  </svg>`;
}

/** Stacked bars (contributions vs growth) for the compound growth calculator. */
export function growthBarsSvg(rows, { width = 640, height = 240, money }) {
  const left = 8;
  const right = 64;
  const top = 10;
  const bottom = 26;
  const plotW = width - left - right;
  const plotH = height - top - bottom;
  const max = Math.max(...rows.map((r) => r.total), 1);
  const step = niceStep(max, 4);
  const top2 = Math.ceil(max / step) * step;
  const y = (v) => top + (1 - v / top2) * plotH;
  const bw = (plotW / rows.length) * 0.66;
  let out = `<svg class="bars-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="Growth by year">`;
  for (let v = 0; v <= top2 + 1e-9; v += step) {
    out += `<line x1="${left}" x2="${left + plotW}" y1="${y(v)}" y2="${y(v)}" style="stroke: var(--chart-grid)"></line>`;
    out += `<text x="${left + plotW + 6}" y="${y(v) + 4}">${esc(money(v))}</text>`;
  }
  rows.forEach((r, i) => {
    const cx = left + (i + 0.5) * (plotW / rows.length);
    const yc = y(r.contributed);
    const yt = y(r.total);
    out += `<rect x="${cx - bw / 2}" y="${yc}" width="${bw}" height="${Math.max(0, top + plotH - yc)}" rx="2" style="fill: var(--c2)"><title>Year ${r.year}: you put in ${esc(money(r.contributed))}</title></rect>`;
    out += `<rect x="${cx - bw / 2}" y="${yt}" width="${bw}" height="${Math.max(0, yc - yt)}" rx="2" style="fill: var(--gold)"><title>Year ${r.year}: growth ${esc(money(r.total - r.contributed))}</title></rect>`;
    if (rows.length <= 12 || i % Math.ceil(rows.length / 10) === 0 || i === rows.length - 1) {
      out += `<text x="${cx}" y="${height - 8}" text-anchor="middle">${r.year}</text>`;
    }
  });
  out += '</svg>';
  return out;
}
