/* CorrelationPro — correlation analysis of every kind, in the browser.
   Copyright (C) 2026  Luis Ángel Barrera-Guzmán

   This program is free software: you can redistribute it and/or modify it under
   the terms of the GNU General Public License as published by the Free Software
   Foundation, either version 3 of the License, or (at your option) any later
   version. It is distributed in the hope that it will be useful, but WITHOUT ANY
   WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
   A PARTICULAR PURPOSE. See the GNU General Public License, in the file LICENSE
   at the root of this program, or <https://www.gnu.org/licenses/>. */

/* CorrelationPro — global state and shared utilities of the interface.
   No ES modules: everything hangs from window so the app also works when
   index.html is opened with a double click (file://). */

const state = {
  /* --- Block 2: the data --- */
  data: null,        // {name, vars: [{key, label, type, v}], n}
  /* --- results, one slot per block --- */
  explore: null,     // Block 3
  pair: null,        // Block 4
  matrix: null,      // Block 5
  nonlin: null,      // Block 6
  partial: null,     // Block 7
  categorical: null, // Block 8
  agreement: null,   // Block 9
  structure: null,   // Block 10
  network: null,     // Block 11
  inference: null,   // Block 12
  figures: {},       // every figure registered for the report and the package
};
window.state = state;

/* the thirteen blocks of the app, in navigation order */
const STEPS = [
  { n: 1, es: 'Inicio', en: 'Home', ready: true },
  { n: 2, es: 'Datos', en: 'Data', ready: true },
  { n: 3, es: 'Exploración', en: 'Exploration', ready: true },
  { n: 4, es: 'Un par a fondo', en: 'One pair in depth', ready: true },
  { n: 5, es: 'Matriz', en: 'Matrix', ready: true },
  { n: 6, es: 'No lineal', en: 'Nonlinear', ready: true },
  { n: 7, es: 'Parcial y conjuntos', en: 'Partial and sets', ready: true },
  { n: 8, es: 'Categóricas', en: 'Categorical', ready: true },
  { n: 9, es: 'Acuerdo', en: 'Agreement', ready: true },
  { n: 10, es: 'Estructura', en: 'Structure', ready: true },
  { n: 11, es: 'Redes', en: 'Networks', ready: true },
  { n: 12, es: 'Comparar y planear', en: 'Compare and plan', ready: true },
  { n: 13, es: 'Figuras e informe', en: 'Figures and report', ready: true },
];

/* ---------------- DOM ---------------- */
function el(id) { return document.getElementById(id); }
function els(sel, root) { return [...(root || document).querySelectorAll(sel)]; }
function mk(tag, attrs, html) {
  const n = document.createElement(tag);
  if (attrs) for (const k in attrs) {
    if (k === 'class') n.className = attrs[k];
    else if (k === 'style') n.setAttribute('style', attrs[k]);
    else if (k.startsWith('on') && typeof attrs[k] === 'function') n.addEventListener(k.slice(2), attrs[k]);
    else if (attrs[k] != null) n.setAttribute(k, attrs[k]);
  }
  if (html != null) n.innerHTML = html;
  return n;
}
function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
/* in titles written in capitals, lower-case Greek letters keep their case (ρ would become Ρ, which reads as P) */
function keepGreek(h) { return String(h).replace(/[α-ω]+/g, m => `<span class="nc">${m}</span>`); }
/* bilingual inline HTML: both spans are written, CSS shows the active one */
function L2(es, en) { return `<span data-l="es">${es}</span><span data-l="en">${en}</span>`; }
function svgEl(tag, attrs, text) {
  const n = document.createElementNS('http://www.w3.org/2000/svg', tag);
  if (attrs) for (const k in attrs) if (attrs[k] != null) n.setAttribute(k, attrs[k]);
  if (text != null) n.textContent = text;
  return n;
}
function showMessage(container, type, text) {
  if (typeof container === 'string') container = el(container);
  if (!container) return null;
  /* the blocks say «warn» and «ok»; the suite's styles call them «warning» and «success» */
  type = { warn: 'warning', ok: 'success' }[type] || type;
  const div = mk('div', { class: 'msg msg-' + type }, text);
  if (window.LABG) LABG.messageRole(div, type);
  container.appendChild(div);
  return div;
}
function clearMessages(container) {
  if (typeof container === 'string') container = el(container);
  if (container) container.innerHTML = '';
}

/* ---------------- shared result components ----------------
   Every block reports with the same two pieces: a row of tiles for the handful
   of numbers that matter, and a table for the rest. */
function statTiles(container, tiles) {
  if (typeof container === 'string') container = el(container);
  if (!container) return;
  container.innerHTML = '';
  container.classList.add('results-summary');
  tiles.filter(Boolean).forEach(t => {
    const [label, value, sub, level] = Array.isArray(t) ? t : [t.label, t.value, t.sub, t.level];
    /* Greek letters keep their case under the uppercase labels (κ would read as K, ρ as P) */
    /* …and so do the lone symbols r, n, p, z, t and names like dCor */
    const lab = String(label).replace(/(<[^>]*>)|([^<]+)/g, (m, tag, txt) => (tag ? tag : txt
      .replace(/[α-ωϑϕϱχ]+/g, g => '<span class="nc">' + g + '</span>')
      .replace(/(^|[\s(·/])([rnpzt])(?=$|[\s)·,=/])/g, '$1<span class="nc">$2</span>')
      .replace(/\b([a-z]+[A-Z][A-Za-z]*)\b/g, '<span class="nc">$1</span>')));
    const d = mk('div', { class: 'stat-tile' + (level ? ' ' + level : '') });
    d.innerHTML = `<div class="stat-label">${lab}</div><div class="stat-value">${value}</div>` + (sub ? `<div class="stat-sub">${sub}</div>` : '');
    container.appendChild(d);
  });
}
/* columns: [{key, label, get?, fmt?, num?, html?}] */
function buildTable(container, columns, rows, opts) {
  opts = opts || {};
  if (typeof container === 'string') container = el(container);
  if (!container) return null;
  container.innerHTML = '';
  const table = mk('table');
  if (opts.className) table.className = opts.className;
  if (opts.caption) table.appendChild(mk('caption', null, opts.caption));
  const thead = mk('thead'), trh = mk('tr');
  columns.forEach(c => { const th = mk('th', { class: c.num ? 'num' : null }); th.innerHTML = c.label != null ? c.label : c.key; trh.appendChild(th); });
  thead.appendChild(trh); table.appendChild(thead);
  const tbody = mk('tbody');
  (opts.limit ? rows.slice(0, opts.limit) : rows).forEach(r => {
    const tr = mk('tr');
    if (r && r._class) tr.className = r._class;
    columns.forEach(c => {
      const td = mk('td', { class: c.num ? 'num' : null });
      let v = c.get ? c.get(r) : r[c.key];
      if (c.html) { td.innerHTML = v == null ? '—' : v; tr.appendChild(td); return; }
      if (c.fmt && v != null && v !== '') v = c.fmt(v);
      td.textContent = (v === null || v === undefined || v === '' || (typeof v === 'number' && !isFinite(v))) ? '—' : v;
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  container.appendChild(table);
  return table;
}

/* ---------------- numbers ----------------
   The interface writes numbers with the report style the user picked
   (Fmt: APA, biomedical or the Mexican standard), so what is read on the
   screen is what goes into the paper. */
function fmtNum(v, d) { return window.Fmt ? Fmt.num(v, d == null ? 3 : d, { lang: I18N.lang }) : String(v); }
function fmtR(v, d) { return window.Fmt ? Fmt.bounded(v, d == null ? 2 : d, { lang: I18N.lang }) : String(v); }
function fmtP(p) { return window.Fmt ? Fmt.p(p, { lang: I18N.lang, html: true }) : String(p); }
function plural(n, one, many) { return `${n} ${n === 1 ? one : many}`; }

/* ---------------- downloads ---------------- */
function download(content, filename, mime) {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mime || 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = mk('a', { href: url, download: filename });
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/* ---------------- step navigation ---------------- */
function goStep(n) {
  n = String(n);
  els('.step-panel').forEach(p => p.classList.toggle('active', p.id === 'panel-' + n));
  els('.step-btn').forEach(b => b.classList.toggle('active', b.dataset.step === n));
  document.body.classList.toggle('on-home', n === '1');
  window.scrollTo({ top: 0, behavior: 'smooth' });
  const btn = stepBtn(n);
  if (window.LABG) {
    LABG.setCurrentStep(n);
    if (btn) LABG.announce(T('Bloque ', 'Block ') + stepName(n));
  } else if (btn && btn.scrollIntoView) btn.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  refreshStepMarks();
  refreshStepFooters();
  document.dispatchEvent(new CustomEvent('stepchange', { detail: { step: Number(n) } }));
}
function enableStep(n, on) {
  const b = stepBtn(n);
  if (b) b.disabled = (on === false);
  refreshStepMarks();
  refreshStepFooters();
}
const stepBtn = n => document.querySelector('.step-btn[data-step="' + n + '"]');
const stepOn = n => { const b = stepBtn(n); return !!b && !b.disabled; };
function stepName(n) {
  const s = STEPS.find(x => String(x.n) === String(n));
  return s ? s.n + ' · ' + T(s.es, s.en) : String(n);
}
/* A block counts as done when the result it hands on is in `state`. */
const STEP_RESULT = {
  2: 'data', 3: 'explore', 4: 'pair', 5: 'matrix', 6: 'nonlin', 7: 'partial', 8: 'categorical',
  9: 'agreement', 10: 'structure', 11: 'network', 12: 'inference',
};
function refreshStepMarks() {
  if (!window.LABG) return;
  STEPS.forEach(s => {
    const key = STEP_RESULT[s.n];
    if (!key) return;
    LABG.markStep(s.n, stepOn(s.n) && state[key] ? 'done' : null);
  });
}
/* Footer of every block: Previous / Next, with the name of the block. */
function refreshStepFooters() {
  if (!window.LABG) return;
  els('.step-panel').forEach(p => {
    const n = Number(p.id.replace('panel-', ''));
    const i = STEPS.findIndex(s => s.n === n);
    if (i < 0) return;
    let f = p.querySelector(':scope > .step-footer');
    if (!f) {
      f = mk('nav', { class: 'step-footer no-print' });
      f.innerHTML = '<button type="button" class="btn btn-secondary prev"></button><button type="button" class="btn btn-primary next"></button>';
      f.addEventListener('click', e => { const b = e.target.closest('button[data-go]'); if (b && !b.disabled) goStep(b.dataset.go); });
      p.appendChild(f);
    }
    f.setAttribute('aria-label', T('Bloques', 'Blocks'));
    const prev = STEPS.slice(0, i).reverse().find(s => stepOn(s.n));
    const next = STEPS.slice(i + 1).find(s => stepBtn(s.n));
    const label = s => L2(s.n + ' · ' + s.es, s.n + ' · ' + s.en);
    const bp = f.querySelector('.prev'), bn = f.querySelector('.next');
    bp.hidden = !prev;
    if (prev) { bp.dataset.go = prev.n; bp.innerHTML = `← <span><small>${L2('Anterior', 'Previous')}</small>${label(prev)}</span>`; }
    bn.hidden = !next;
    if (next) {
      bn.dataset.go = next.n; bn.disabled = !stepOn(next.n);
      bn.innerHTML = `<span><small>${L2('Siguiente', 'Next')}</small>${label(next)}</span> →`;
    }
  });
}
function paintCommonBar() {
  if (!window.LABG) return;
  LABG.theme.key = 'correlationpro:theme';
  LABG.theme.paint();
  const nav = el('stepper');
  if (nav) nav.setAttribute('aria-label', T('Bloques', 'Blocks'));
}

/* Wired after every DOMContentLoaded handler has run: home.js builds the
   block bar in its own. */
document.addEventListener('DOMContentLoaded', () => setTimeout(() => {
  if (!window.LABG) return;
  if (LABG.work) {
    LABG.work.scene = 'fit';
    LABG.work.tips = [
      ['Una correlación alta no es acuerdo: dos métodos pueden correlacionar a 0.99 y diferir siempre por lo mismo.',
        'A high correlation is not agreement: two methods can correlate at 0.99 and always differ by the same amount.'],
      ['Con empates, el valor p «exacto» de Spearman y de Kendall deja de serlo: la app dice cuál usó.',
        'With ties, the “exact” p-value of Spearman and Kendall no longer is: the app says which one it used.'],
      ['r = 0 no quiere decir independencia: una parábola perfecta puede tener r = 0 y una correlación de distancias de 0.5.',
        'r = 0 does not mean independence: a perfect parabola can have r = 0 and a distance correlation of 0.5.'],
    ];
  }
  const hb = el('helpBtn');
  if (hb) hb.addEventListener('click', () => LABG.showShortcuts());
  LABG.shortcuts([]);
  LABG.bindStepKeys(goStep);
  LABG.guardUnload(() => !!state.data);
  LABG.setCurrentStep((document.querySelector('.step-btn.active') || {}).dataset?.step || '1');
  document.addEventListener('themechange', paintCommonBar);
  document.addEventListener('langchange', () => { paintCommonBar(); refreshStepFooters(); if (window.Fmt) Fmt.set({ lang: I18N.lang }); });
  paintCommonBar();
  refreshStepMarks();
  refreshStepFooters();
}, 0));

/* Runs a long synchronous computation once the browser has painted, so the
   waiting window (LABG.work) is on screen before the page is taken over. */
function cpAfterPaint(f, w) {
  return (window.LABG ? LABG.nextPaint() : new Promise(r => setTimeout(r, 30)))
    .then(f)
    .then(() => { if (w && !w.ended) w.close(); },
      e => {
        if (w && !w.ended) w.fail(e && e.message ? e.message : String(e));
        console.error(e);
      });
}

/* Persisted preferences */
const Prefs = {
  get(k, d) { try { const v = localStorage.getItem('correlationpro:' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('correlationpro:' + k, JSON.stringify(v)); } catch (e) { /* private mode */ } },
};
/* the report style and the palette, chosen once for the whole app */
if (window.Fmt) Fmt.set(Object.assign({ lang: (window.I18N && I18N.lang) || 'es' }, Prefs.get('fmt', {})));
const View = {
  palette: Prefs.get('palette', 'anil'),
  invert: Prefs.get('invert', false),
  setPalette(id) { View.palette = id; Prefs.set('palette', id); document.dispatchEvent(new CustomEvent('palettechange', { detail: { id } })); },
  setInvert(v) { View.invert = !!v; Prefs.set('invert', View.invert); document.dispatchEvent(new CustomEvent('palettechange', { detail: { id: View.palette } })); },
};
function cssVar(name, fallback) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback || '#B3182D';
}
function isDark() { return window.Theme ? Theme.current() === 'dark' : false; }

Object.assign(window, {
  STEPS, el, els, mk, esc, L2, svgEl, showMessage, clearMessages, statTiles, buildTable,
  fmtNum, fmtR, fmtP, plural, download,
  goStep, enableStep, stepOn, stepName, cpAfterPaint, Prefs, View, cssVar, isDark,
});
