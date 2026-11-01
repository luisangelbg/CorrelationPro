/* CorrelationPro — correlation analysis of every kind, in the browser.
   Copyright (C) 2026  Luis Ángel Barrera-Guzmán

   This program is free software: you can redistribute it and/or modify it under
   the terms of the GNU General Public License as published by the Free Software
   Foundation, either version 3 of the License, or (at your option) any later
   version. It is distributed in the hope that it will be useful, but WITHOUT ANY
   WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
   A PARTICULAR PURPOSE. See the GNU General Public License, in the file LICENSE
   at the root of this program, or <https://www.gnu.org/licenses/>. */

/* CorrelationPro — Block 13, figures, palettes and report: the gallery of the
   figures drawn so far (exported through the figure studio), the designer of
   a diverging palette checked for colour-blind and grey reading, the
   correlation table ready for a journal, the methods written from the state of
   every block with their references, the report and the project package. */
(function () {
'use strict';
const S = { sec: 'figs', include: new Set(), tKeys: null, methods: null };
const VERSION = '1.0.0';
const label = c => (window.B2 ? B2.label(c) : c.name);
const short = (s, n) => (String(s).length > n ? String(s).slice(0, n - 1) + '…' : String(s));
const L = (es, en) => (I18N.lang === 'en' ? en : es);
const FONTS = { sans: 'system-ui, sans-serif', serif: 'ui-serif, Georgia, serif', mono: 'ui-monospace, monospace' };

/* ---------------- the user's palette, registered before any figure is drawn ---------------- */
function paletteFrom(o) {
  const L1 = o.L1, frac = o.C == null ? 0.95 : o.C;
  const C1 = frac * Math.min(Pal.maxChroma(L1, o.hPos), Pal.maxChroma(L1, o.hNeg));
  return Pal.custom({ hPos: o.hPos, hNeg: o.hNeg, L1, C1, name: o.name });
}
(function () {
  const saved = Prefs.get('customPal', null);
  if (saved && isFinite(saved.hPos)) Pal.register(paletteFrom(saved));
  const f = Prefs.get('figFont', 'sans');
  if (FONTS[f] && f !== 'sans') document.documentElement.style.setProperty('--fig-font', FONTS[f]);
})();

/* ---------------- sections ---------------- */
function showSec(sec) {
  S.sec = sec;
  el('panel-13').querySelectorAll('.b12-bar [data-sec]').forEach(b => b.classList.toggle('on', b.dataset.sec === sec));
  el('panel-13').querySelectorAll('.b12-sec').forEach(d => { d.hidden = d.id !== 'b13Sec-' + sec; });
  paint();
}
function paint() {
  if (!el('panel-13').classList.contains('active')) return;
  ({ figs: paintGallery, pal: paintPal, table: paintTable, methods: paintMethods, project: paintProject })[S.sec]();
}

/* ================= the gallery ================= */
function figureList() {
  const out = [];
  document.querySelectorAll('.step-panel svg.pl').forEach(svg => {
    const panel = svg.closest('.step-panel'), n = panel ? +panel.id.replace('panel-', '') : 0;
    if (!n || n === 1 || n === 13) return;
    if (svg.parentElement.closest('svg') || svg.closest('[hidden], button, .b6-mini, details:not([open])')) return;
    const vb = (svg.getAttribute('viewBox') || '').split(/\s+/).map(Number);
    if (!(vb[2] >= 180 && vb[3] >= 100)) return;
    const pane = svg.closest('.pg-pane'), tt = pane && pane.querySelector(':scope > .pg-title');
    /* only the text of the language in use */
    let tx = '';
    if (tt) { const cp = tt.cloneNode(true); cp.querySelectorAll('[data-l]').forEach(s => { if (s.dataset.l !== I18N.lang) s.remove(); }); tx = cp.textContent.replace(/\s+/g, ' ').trim(); }
    const title = tx || svg.getAttribute('aria-label') || svg.dataset.name || '';
    out.push({ svg, n, name: svg.dataset.name || 'figure', title, id: n + ':' + (svg.dataset.name || out.length) });
  });
  return out;
}
const prefixIds = (s, p) => s.replace(/\bid="([^"]+)"/g, `id="${p}$1"`).replace(/url\(#([^)]+)\)/g, `url(#${p}$1)`).replace(/href="#([^"]+)"/g, `href="#${p}$1"`);
function paintGallery() {
  el('b13Font').value = Prefs.get('figFont', 'sans');
  const list = figureList();
  clearMessages('b13FMsgs');
  if (!list.length) { el('b13Gallery').innerHTML = ''; showMessage('b13FMsgs', 'info', L2('Todavía no hay figuras: abre unos datos y recorre los bloques; cada figura que dibujen aparecerá aquí.', 'There are no figures yet: open some data and go through the blocks; every figure they draw will appear here.')); return; }
  el('b13Gallery').innerHTML = list.map((f, i) => {
    const on = S.include.has(f.id);
    return `<div class="b13-card${on ? ' on' : ''}" data-id="${esc(f.id)}">` +
      `<button type="button" class="b13-thumb" data-act="go" data-fe-skip="1" data-lnav-skip="1" aria-label="${esc(L('Ir a la figura', 'Go to the figure'))}">${prefixIds(f.svg.outerHTML, 'g13-' + i + '-')}</button>` +
      `<div class="b13-cap"><b>${esc(short(f.title, 60))}</b><span>${esc(L('Bloque', 'Block'))} ${f.n} · ${esc(stepName(f.n).replace(/^\d+ · /, ''))}</span></div>` +
      `<div class="b13-acts"><label class="b13-inc"><input type="checkbox" data-act="inc"${on ? ' checked' : ''}> ${esc(L('En el informe', 'In the report'))}</label>` +
      `<button type="button" class="btn btn-ghost btn-sm" data-act="exp">${esc(L('Exportar', 'Export'))}</button></div></div>`;
  }).join('');
  S.figs = list;
}
function onGallery(e) {
  const card = e.target.closest('.b13-card');
  if (!card) return;
  const f = (S.figs || []).find(x => x.id === card.dataset.id), act = e.target.closest('[data-act]');
  if (!f || !act) return;
  if (act.dataset.act === 'inc') { if (act.checked) S.include.add(f.id); else S.include.delete(f.id); card.classList.toggle('on', act.checked); return; }
  /* the figure studio needs the figure on screen: go to its block first */
  const svg = f.svg.isConnected ? f.svg : null;
  if (!svg) { paintGallery(); return; }
  goStep(f.n);
  requestAnimationFrame(() => requestAnimationFrame(() => {
    svg.scrollIntoView({ behavior: 'smooth', block: 'center' });
    if (act.dataset.act === 'exp' && window.LABGFigureStudio) setTimeout(() => LABGFigureStudio.open(svg), 350);
  }));
}

/* ================= the palette designer ================= */
function palState() {
  return { hPos: +el('b13HPos').value, hNeg: +el('b13HNeg').value, L1: +el('b13L1').value, C: +el('b13C1').value, name: el('b13PName').value.trim() || L('Mi paleta', 'My palette') };
}
function setPalInputs(o) { el('b13HPos').value = Math.round(o.hPos); el('b13HNeg').value = Math.round(o.hNeg); el('b13L1').value = o.L1; el('b13C1').value = o.C; if (o.name) el('b13PName').value = o.name; }
function paintPal() {
  const from = el('b13PFrom');
  if (!from.options.length) {
    from.innerHTML = `<option value="">${esc(L('— elige —', '— choose —'))}</option>` + Pal.DIV.filter(p => !p.dark).map(p => `<option value="${p.id}">${esc(p.es)}</option>`).join('');
    const saved = Prefs.get('customPal', null);
    if (saved) setPalInputs(saved);
    else { const cur = Pal.get(View.palette); if (cur.kind === 'div' && !cur.dark) setPalInputs({ hPos: cur.hPos, hNeg: cur.hNeg, L1: cur.L1, C: 0.95 }); }
  }
  const o = palState(), p = paletteFrom(o);
  el('b13HPosV').textContent = o.hPos + '°'; el('b13HNegV').textContent = o.hNeg + '°'; el('b13L1V').textContent = Fmt.num(o.L1, 2); el('b13C1V').textContent = Math.round(100 * o.C) + ' %';
  const visions = [['none', 'Visión típica', 'Typical vision'], ['protan', 'Protanopía', 'Protanopia'], ['deutan', 'Deuteranopía', 'Deuteranopia'], ['tritan', 'Tritanopía', 'Tritanopia'], ['grey', 'En gris', 'In grey']];
  const stops = Pal.stops(p, 17, { invert: View.invert });
  el('b13Ramps').innerHTML = visions.map(([k, es, en]) => `<div class="b13-ramp"><span>${esc(L(es, en))}</span><div class="pal-ramp">${stops.map(c => `<i style="background:${k === 'grey' ? Pal.grey(c) : Pal.simulate(k, c)}"></i>`).join('')}</div></div>`).join('') +
    `<div class="b13-ramp b13-ends"><span></span><div><b>r = −1</b><b>0</b><b>r = +1</b></div></div>`;
  const c = Pal.check(p), mk2 = (ok, es, en, val) => `<li class="${ok ? 'ok' : 'no'}"><span>${ok ? '✓' : '✗'}</span> ${esc(L(es, en))}${val ? ` <small>${val}</small>` : ''}</li>`;
  const minSign = Math.min(...Object.values(c.sign).map(s => s.at25));
  el('b13Checks').innerHTML = `<ul>` +
    mk2(c.ok.gamut, 'Cabe en la pantalla (sRGB)', 'Fits the screen (sRGB)') +
    mk2(c.ok.uniform, 'Pasos uniformes', 'Uniform steps', `ΔE ${Fmt.num(Math.min(...c.steps), 3)}–${Fmt.num(Math.max(...c.steps), 3)}`) +
    mk2(c.ok.sign, 'El signo se distingue con daltonismo', 'The sign reads with colour blindness', `${L('ΔE mínima en |r| = .25', 'smallest ΔE at |r| = .25')}: ${Fmt.num(minSign, 3)}`) +
    mk2(c.ok.greySymmetric, 'Simétrica en gris', 'Symmetric in grey', `ΔL ${Fmt.num(c.grey.diff, 3)}`) +
    mk2(c.ok.contrast, 'Contraste con el fondo ≥ 3:1', 'Contrast with the background ≥ 3:1', `${Fmt.num(c.contrast.neg, 1)} · ${Fmt.num(c.contrast.pos, 1)}`) + '</ul>' +
    `<p class="b13-verdict ${c.pass ? 'ok' : 'no'}">${esc(c.pass ? L('Pasa todas las pruebas.', 'It passes every check.') : L('No pasa todas las pruebas: mueve los tonos o baja la luminosidad de los extremos.', 'It does not pass every check: move the hues or lower the lightness of the ends.'))}</p>`;
  const D = Datasets.iris, vars = D.vars.slice(0, 4), R = vars.map(a => vars.map(b => Coef.pearson(a.v, b.v).est));
  el('b13PSample').innerHTML = Plot.matrix({ R, labels: vars.map(v => L(v.es, v.en)), glyph: { lower: 'number', upper: 'ellipse' }, palette: p, invert: View.invert, size: 54, labelWidth: 120, plot: 'b13-pal-sample', label: L('Matriz de los lirios con la paleta', 'Iris matrix with the palette') });
  S.draft = { o, p, check: c };
}
function usePal() {
  const o = palState(), p = Pal.register(paletteFrom(o));
  Prefs.set('customPal', o);
  View.setPalette(p.id);
  showMessage('b13PMsgs', 'ok', L2(`«${esc(o.name)}» es ahora la paleta de toda la app; también aparece en la galería del Inicio y se guarda en el paquete del proyecto.`, `«${esc(o.name)}» is now the palette of the whole app; it also appears in the gallery on Home and is saved in the project package.`));
}
/* the hue for negative r that, with the chosen positive hue, keeps the sign most distinct for every vision */
function autoNeg() {
  const o = palState();
  let best = null;
  for (let h = 0; h < 360; h += 3) {
    if (Math.abs(((h - o.hPos + 540) % 360) - 180) > 150) continue;
    const p = paletteFrom(Object.assign({}, o, { hNeg: h })), c = Pal.check(p);
    const score = Math.min(...Object.values(c.sign).map(s => s.at25)) - (c.ok.greySymmetric ? 0 : 0.05) - (c.ok.contrast ? 0 : 0.05);
    if (!best || score > best.score) best = { h, score };
  }
  el('b13HNeg').value = best.h;
  paintPal();
  showMessage('b13PMsgs', 'info', L2(`Con el tono ${o.hPos}° para r positiva, el que mejor separa el signo con las tres formas de daltonismo es ${best.h}°.`, `With hue ${o.hPos}° for positive r, the one that best separates the sign with the three forms of colour blindness is ${best.h}°.`));
}

/* ================= the publication table ================= */
const conts = ds => ds.cols.filter(c => c.role !== 'exclude' && ['continuous', 'ordinal', 'binary'].includes(c.type));
function tableData() {
  const ds = state.data;
  if (!ds) return null;
  const us = conts(ds);
  S.tKeys = (S.tKeys || []).filter(k => us.some(c => c.key === k));
  if (S.tKeys.length < 2) S.tKeys = (state.matrix && state.matrix.keys.length <= 12 ? state.matrix.keys.slice() : us.filter(c => c.role === 'var' && c.type === 'continuous').slice(0, 8).map(c => c.key));
  const keys = S.tKeys, method = el('b13TCoef').value, adj = el('b13TAdj').value;
  if (keys.length < 2) return { keys, few: true };
  let cols = keys.map(k => Array.from(Data.col(ds, k).num));
  if (ds.missingMode === 'listwise') { const ok = new Set(Data.completeRows(ds, keys)); cols = cols.map(c => c.map((v, r) => (ok.has(r) ? v : NaN))); }
  const C = Mat.compute(cols, { method, missing: 'pairwise' }), Q = Mat.adjustMatrix(C.P, adj);
  /* intervals on Fisher's z, with Fieller, Hartley and Pearson's variances for the rank coefficients */
  const vz = n => (method === 'pearson' ? 1 / (n - 3) : method === 'spearman' ? 1.06 / (n - 3) : 0.437 / (n - 4));
  const z = Num.qnorm(0.975), CI = C.R.map((row, i) => row.map((r, j) => { const n = C.N[i][j]; if (i === j || !(n > 4) || !isFinite(r)) return null; const zz = Math.atanh(Math.max(-0.999999, Math.min(0.999999, r))), h = z * Math.sqrt(vz(n)); return [Math.tanh(zz - h), Math.tanh(zz + h)]; }));
  const desc = cols.map(c => { const v = c.filter(isFinite); return { m: Num.mean(v), sd: Num.sd(v), md: Num.median(v), q1: Num.quantile(v, 0.25), q3: Num.quantile(v, 0.75), n: v.length }; });
  return { keys, names: keys.map(k => label(Data.col(ds, k))), method, adj, R: C.R, P: C.P, Q, N: C.N, CI, desc, sig: el('b13TSig').value, dig: +el('b13TDig').value, dsc: el('b13TDesc').value };
}
const METHOD_NAME = { pearson: ['r de Pearson', 'Pearson’s r'], spearman: ['ρ de Spearman', 'Spearman’s ρ'], kendall: ['τ-b de Kendall', 'Kendall’s τ-b'] };
const ADJ_NAME = { none: ['sin corrección por pruebas múltiples', 'no multiple-testing correction'], holm: ['corregidos por Holm', 'corrected by Holm'], BH: ['corregidos por Benjamini–Hochberg', 'corrected by Benjamini–Hochberg'], bonferroni: ['corregidos por Bonferroni', 'corrected by Bonferroni'] };
/* the table as HTML with inline styles (it pastes as a table into a word processor), and as rows for the CSV */
function buildTable(T0, forReport) {
  const p = T0.keys.length, d = T0.dig, st = q => (!isFinite(q) ? '' : q < 0.001 ? '***' : q < 0.01 ? '**' : q < 0.05 ? '*' : '');
  const B = 'border-bottom:1px solid #000', Bt = 'border-top:1.5px solid #000', cell = 'padding:3px 8px;text-align:center;white-space:nowrap';
  const hasD = T0.dsc !== 'none', dh = T0.dsc === 'msd' ? [L('M', 'M'), L('DE', 'SD')] : [L('Mdn', 'Mdn'), L('RIC', 'IQR')];
  let h = `<table style="border-collapse:collapse;font-family:ui-serif,Georgia,serif;font-size:11pt;color:#000;background:#fff">`;
  h += `<caption style="caption-side:top;text-align:left;padding:0 0 6px;font-size:11pt"><b>${esc(L('Tabla 1', 'Table 1'))}</b><br><i>${esc(L(`${hasD ? (T0.dsc === 'msd' ? 'Medias, desviaciones estándar' : 'Medianas, rangos intercuartílicos') + ' y correlaciones' : 'Correlaciones'} (${METHOD_NAME[T0.method][0]})`, `${hasD ? (T0.dsc === 'msd' ? 'Means, standard deviations' : 'Medians, interquartile ranges') + ' and correlations' : 'Correlations'} (${METHOD_NAME[T0.method][1]})`))}</i></caption>`;
  h += `<thead><tr><th style="${cell};text-align:left;${Bt};${B}">${esc(L('Variable', 'Variable'))}</th>` + (hasD ? dh.map(x => `<th style="${cell};${Bt};${B}"><i>${x}</i></th>`).join('') : '') + Array.from({ length: p - 1 }, (_, j) => `<th style="${cell};${Bt};${B}">${j + 1}</th>`).join('') + '</tr></thead><tbody>';
  const rows = [[L('Variable', 'Variable')].concat(hasD ? dh : [], Array.from({ length: p - 1 }, (_, j) => String(j + 1)))];
  for (let i = 0; i < p; i++) {
    const last = i === p - 1, bb = last && T0.sig !== 'ci' && T0.sig !== 'p' ? ';' + B : '';
    const ds = T0.desc[i];
    const dv = hasD ? (T0.dsc === 'msd' ? [Fmt.num(ds.m, 2), Fmt.num(ds.sd, 2)] : [Fmt.num(ds.md, 2), Fmt.num(ds.q3 - ds.q1, 2)]) : [];
    const rv = Array.from({ length: p - 1 }, (_, j) => (j < i ? Fmt.bounded(T0.R[i][j], d) + (T0.sig === 'stars' ? st(T0.Q[i][j]) : '') : ''));
    h += `<tr><td style="${cell};text-align:left${bb}">${i + 1}. ${esc(T0.names[i])}</td>` + dv.map(v => `<td style="${cell}${bb}">${v}</td>`).join('') + rv.map(v => `<td style="${cell}${bb}">${v}</td>`).join('') + '</tr>';
    rows.push([`${i + 1}. ${T0.names[i]}`].concat(dv, rv));
    if ((T0.sig === 'ci' || T0.sig === 'p') && i > 0) {
      const sub = Array.from({ length: p - 1 }, (_, j) => (j < i ? (T0.sig === 'ci' ? (T0.CI[i][j] ? `[${Fmt.bounded(T0.CI[i][j][0], 2)}, ${Fmt.bounded(T0.CI[i][j][1], 2)}]` : '') : (isFinite(T0.Q[i][j]) ? Fmt.pValue(T0.Q[i][j]) : '')) : ''));
      const b2 = last ? ';' + B : '';
      h += `<tr><td style="${cell}${b2}"></td>` + (hasD ? `<td style="${cell}${b2}"></td><td style="${cell}${b2}"></td>` : '') + sub.map(v => `<td style="${cell};font-size:9pt${b2}">${v}</td>`).join('') + '</tr>';
      rows.push([''].concat(hasD ? ['', ''] : [], sub));
    } else if ((T0.sig === 'ci' || T0.sig === 'p') && last) h = h.replace(/<\/tr>$/, '</tr>');
  }
  const nAll = T0.N.flat().filter(v => v > 0), nMin = Math.min(...nAll), nMax = Math.max(...nAll);
  const nTxt = nMin === nMax ? String(nMin) : `${nMin}–${nMax}`, adj = ADJ_NAME[T0.adj];
  const sigTxt = T0.sig === 'stars' ? L(`Valores p ${adj[0]}: * p < .05, ** p < .01, *** p < .001.`, `p-values ${adj[1]}: * p < .05, ** p < .01, *** p < .001.`)
    : T0.sig === 'ci' ? L(`Entre corchetes, el intervalo de confianza del 95 % (z de Fisher${T0.method !== 'pearson' ? ', con la varianza de Fieller, Hartley y Pearson, 1957' : ''}).`, `In brackets, the 95% confidence interval (Fisher’s z${T0.method !== 'pearson' ? ', with Fieller, Hartley and Pearson’s variance, 1957' : ''}).`)
      : T0.sig === 'p' ? L(`Debajo de cada coeficiente, su valor p (${adj[0]}).`, `Under each coefficient, its p-value (${adj[1]}).`) : '';
  const note = L(`<i>Nota.</i> <i>n</i> = ${nTxt}${state.data.missingMode === 'listwise' ? ' (casos completos)' : nMin !== nMax ? ' (por pares)' : ''}. ${sigTxt}`, `<i>Note.</i> <i>n</i> = ${nTxt}${state.data.missingMode === 'listwise' ? ' (complete cases)' : nMin !== nMax ? ' (pairwise)' : ''}. ${sigTxt}`);
  h += `</tbody></table><p style="font-family:ui-serif,Georgia,serif;font-size:10pt;margin:6px 0 0;color:#000">${note}</p>`;
  rows.push([note.replace(/<[^>]+>/g, '')]);
  return { html: h, rows };
}
function paintTable() {
  const ds = state.data;
  el('b13TEmpty').hidden = !!ds; el('b13TMain').hidden = !ds;
  if (!ds) return;
  el('b13TStyle').value = Fmt.opts.style === 'nom' && Fmt.opts.decimal === ',' ? 'nomc' : Fmt.opts.style;
  const T0 = tableData();
  const us = conts(ds);
  el('b13TVars').innerHTML = us.map(c => `<button type="button" class="chip${S.tKeys.includes(c.key) ? ' on' : ''}" data-k="${c.key}">${esc(label(c))}</button>`).join('');
  clearMessages('b13TMsgs');
  if (!T0 || T0.few) { el('b13Table').innerHTML = ''; showMessage('b13TMsgs', 'warn', L2('Elige al menos dos variables.', 'Pick at least two variables.')); return; }
  if (T0.keys.length > 15) showMessage('b13TMsgs', 'info', L2('Con más de 15 variables la tabla ya no cabe en una página: considera la figura de la matriz.', 'With more than 15 variables the table no longer fits a page: consider the matrix figure.'));
  const B = buildTable(T0);
  el('b13Table').innerHTML = B.html;
  S.table = { T0, B };
}
async function copyHTML(html, text, msgId) {
  try {
    if (navigator.clipboard && window.ClipboardItem) {
      await navigator.clipboard.write([new ClipboardItem({ 'text/html': new Blob([html], { type: 'text/html' }), 'text/plain': new Blob([text], { type: 'text/plain' }) })]);
    } else throw new Error('no clipboard');
  } catch (e) {
    /* the old way: select a copy of it and copy */
    const box = mk('div', { contenteditable: 'true', style: 'position:fixed;left:-9999px;top:0' });
    box.innerHTML = html; document.body.appendChild(box);
    const r = document.createRange(); r.selectNodeContents(box); const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r);
    try { document.execCommand('copy'); } catch (e2) { /* nothing more to try */ }
    sel.removeAllRanges(); box.remove();
  }
  showMessage(msgId, 'ok', L2('Copiado: pégalo en tu documento.', 'Copied: paste it into your document.'));
}
const csvCell = v => (/[",;\n]/.test(v) ? '"' + String(v).replace(/"/g, '""') + '"' : String(v));

/* ================= methods, results and references ================= */
/* the name of a coefficient in the middle of a sentence */
const IN_TEXT = { pearson: ['la r de Pearson', 'Pearson’s r'], spearman: ['la ρ de Spearman', 'Spearman’s ρ'], kendall: ['la τ-b de Kendall', 'Kendall’s τ-b'], kendallB: ['la τ-b de Kendall', 'Kendall’s τ-b'], blomqvist: ['la β de Blomqvist', 'Blomqvist’s β'], xi: ['la ξ de Chatterjee', 'Chatterjee’s ξ'], hoeffding: ['la D de Hoeffding', 'Hoeffding’s D'], taustar: ['la τ* de Bergsma y Dassios', 'the Bergsma–Dassios τ*'], gaussian: ['la correlación de rangos gaussianos', 'the Gaussian rank correlation'], biweight: ['la correlación de peso doble', 'the biweight midcorrelation'], pbend: ['la correlación de flexión porcentual', 'the percentage bend correlation'], winsorized: ['la correlación winsorizada', 'the winsorized correlation'], dcor: ['la correlación de distancias', 'distance correlation'] };
const inText = (id, es, en) => (IN_TEXT[id] ? L(IN_TEXT[id][0], IN_TEXT[id][1]) : L(es, en));
/* each block that left a result writes what it did; refs collects the keys cited */
function writeAll() {
  const ds = state.data, P = [], RES = [], refs = new Set();
  const cite = (...k) => k.forEach(x => { if (x && Theory.REFS[x]) refs.add(x); });
  const cat = id => { const c = window.Catalog && Catalog.byId(id); if (c) cite(...c.refs); return c; };
  const nm = k => { const c = ds && Data.col(ds, k); return c ? label(c) : k; };
  const list = a => (a.length <= 1 ? a.join('') : a.slice(0, -1).join(', ') + L(' y ', ' and ') + a[a.length - 1]);
  if (!ds) return { P, RES, refs };
  const vars = ds.cols.filter(c => c.role === 'var');
  P.push({ h: L('Datos', 'Data'), t: L(`Se analizaron ${ds.n} casos y ${vars.length} variables del conjunto «${esc(ds.title ? L(ds.title.es, ds.title.en) : ds.name)}». Los valores faltantes se trataron ${ds.missingMode === 'listwise' ? 'por listas (sólo casos completos en todas las variables)' : 'por pares (cada correlación con los casos completos en ese par)'}.`, `${ds.n} cases and ${vars.length} variables of the dataset «${esc(ds.title ? L(ds.title.es, ds.title.en) : ds.name)}» were analysed. Missing values were handled ${ds.missingMode === 'listwise' ? 'listwise (only cases complete in every variable)' : 'pairwise (each correlation with the cases complete in that pair)'}.`) });
  const X = state.explore;
  if (X) {
    cite('royston1995', 'anderson1952', 'mardia1970', 'henze1990', 'cleveland1979', 'koenker1981', 'maronna2002');
    P.push({ h: L('Supuestos', 'Assumptions'), t: L(`La normalidad de cada variable se evaluó con las pruebas de Shapiro–Wilk (algoritmo de Royston, 1995) y de Anderson–Darling (1952); la normalidad multivariada, con la asimetría y la curtosis de Mardia (1970) y la prueba de Henze y Zirkler (1990). La forma de cada par se examinó con un suavizado LOWESS (Cleveland, 1979) y la heterocedasticidad con la prueba de Breusch–Pagan en la versión de Koenker (1981); los atípicos bivariados se buscaron con distancias de Mahalanobis robustas (estimador OGK de Maronna y Zamar, 2002). Con eso se recomendó el coeficiente de cada par.`,
      `Normality of each variable was assessed with the Shapiro–Wilk test (Royston’s 1995 algorithm) and the Anderson–Darling test (1952); multivariate normality, with Mardia’s (1970) skewness and kurtosis and the Henze–Zirkler (1990) test. The shape of each pair was examined with a LOWESS smoother (Cleveland, 1979) and heteroscedasticity with the Breusch–Pagan test in Koenker’s (1981) version; bivariate outliers were sought with robust Mahalanobis distances (Maronna and Zamar’s 2002 OGK estimator). On that basis the coefficient for each pair was recommended.`) });
    if (X.mv && X.mv.hz) RES.push(L(`Normalidad multivariada (${X.mv.p} variables, n = ${X.mv.n}): Henze–Zirkler ${Fmt.p(X.mv.hz.p_value)}.`, `Multivariate normality (${X.mv.p} variables, n = ${X.mv.n}): Henze–Zirkler ${Fmt.p(X.mv.hz.p_value)}.`));
  }
  const Pr = state.pair;
  if (Pr && Pr.main) {
    const d = Pr.main.def, c = cat(d.id === 'kendall' ? 'kendallB' : d.id), o = Pr.o || {}, B = Pr.reducedB || o.B;
    cite('efron1987', 'davison1997', 'pitman1937', 'ly2016');
    const ci0 = Pr.main.res.ci && isFinite(Pr.main.res.ci.lo) ? Pr.main.res.ci : Pr.main.boot;
    const ci = ci0 ? Object.assign({}, ci0, { method: { fisher: L('de la z de Fisher', 'Fisher’s z'), fieller: L('de Fieller', 'Fieller’s'), bonett: L('de Bonett y Wright', 'Bonett and Wright’s') }[ci0.method] || ci0.method }) : null;
    if (ci0 && ci0.method === 'fieller') cite('fieller1957');
    if (ci0 && ci0.method === 'bonett') cite('bonett2000');
    P.push({ h: L('Un par a fondo', 'One pair in depth'), t: L(`La relación entre ${esc(nm(Pr.kx))} y ${esc(nm(Pr.ky))} (n = ${Pr.n}) se midió con ${esc(inText(d.id, d.es, d.en))}${c ? ` (${esc(apaBy(c.by))})` : ''}${Pr.auto ? ', el coeficiente recomendado por la revisión de supuestos' : ''}. Su intervalo de confianza del ${Math.round(100 * (o.level || 0.95))} % se obtuvo ${ci && ci.method ? `por el método ${esc(ci.method)}` : 'analíticamente'}; además se hicieron ${B} remuestreos bootstrap (intervalo BCa; Efron, 1987) y ${B} permutaciones (Pitman, 1937), y el factor de Bayes de Pearson con una previa beta extendida de ancho κ = ${Fmt.num(o.kappa || 1 / 3, 2)} (Ly, Verhagen y Wagenmakers, 2016).`,
      `The relation between ${esc(nm(Pr.kx))} and ${esc(nm(Pr.ky))} (n = ${Pr.n}) was measured with ${esc(inText(d.id, d.es, d.en))}${c ? ` (${esc(apaBy(c.by).replace(/ y /g, ' and '))})` : ''}${Pr.auto ? ', the coefficient recommended by the assumption check' : ''}. Its ${Math.round(100 * (o.level || 0.95))}% confidence interval was obtained ${ci && ci.method ? `by the ${esc(ci.method)} method` : 'analytically'}; ${B} bootstrap resamples (BCa interval; Efron, 1987) and ${B} permutations (Pitman, 1937) were also run, and Pearson’s Bayes factor with a stretched beta prior of width κ = ${Fmt.num(o.kappa || 1 / 3, 2)} (Ly, Verhagen and Wagenmakers, 2016).`) });
    if (isFinite(Pr.main.res.est)) RES.push(L(`${esc(d.es)} entre ${esc(nm(Pr.kx))} y ${esc(nm(Pr.ky))}: ${Fmt.bounded(Pr.main.res.est, 2)}${ci && isFinite(ci.lo) ? `, ${Fmt.ci(ci.lo, ci.hi)}` : ''}, ${Fmt.p(Pr.main.res.p)}.`, `${esc(d.en)} between ${esc(nm(Pr.kx))} and ${esc(nm(Pr.ky))}: ${Fmt.bounded(Pr.main.res.est, 2)}${ci && isFinite(ci.lo) ? `, ${Fmt.ci(ci.lo, ci.hi)}` : ''}, ${Fmt.p(Pr.main.res.p)}.`));
  }
  const M = state.matrix;
  if (M) {
    const c = cat(M.method === 'kendall' ? 'kendallB' : M.method), b5 = window.B5 ? B5.state : {};
    const adj = { holm: ['Holm (1979)', 'holm1979', 'Holm’s (1979)'], BH: ['Benjamini y Hochberg (1995)', 'benjamini1995', 'Benjamini and Hochberg’s (1995)'], BY: ['Benjamini y Yekutieli (2001)', 'benjamini2001', 'Benjamini and Yekutieli’s (2001)'], hochberg: ['Hochberg (1988)', 'hochberg1988', 'Hochberg’s (1988)'], hommel: ['Hommel (1988)', 'hommel1988', 'Hommel’s (1988)'], bonferroni: ['Bonferroni', null, 'Bonferroni’s'], none: [null, null, null] }[b5.adjust || 'holm'];
    cite(adj[1], 'kaiser1974', 'bartlett1950');
    if (M.diag && !M.diag.pd) cite('higham2002');
    P.push({ h: L('Matriz de correlación', 'Correlation matrix'), t: L(`Se calculó la matriz de ${M.p} variables con ${c ? esc(inText(M.method, c.es, c.en)) : M.method}${adj[0] ? `; los valores p se corrigieron por pruebas múltiples con el método de ${adj[0]}` : ', sin corrección por pruebas múltiples'}. La adecuación de la matriz se describió con el KMO (Kaiser y Rice, 1974) y la esfericidad de Bartlett (1950)${M.diag && !M.diag.pd ? '; como la matriz no era definida positiva, se usó la definida positiva más cercana (Higham, 2002)' : ''}.`,
      `The matrix of ${M.p} variables was computed with ${c ? esc(inText(M.method, c.es, c.en)) : M.method}${adj[0] ? `; p-values were corrected for multiple testing with ${adj[2]} method` : ', with no multiple-testing correction'}. Its adequacy was described with the KMO (Kaiser and Rice, 1974) and Bartlett’s (1950) sphericity test${M.diag && !M.diag.pd ? '; as the matrix was not positive definite, the nearest positive-definite one was used (Higham, 2002)' : ''}.`) });
    if (M.kmo) RES.push(L(`KMO de la matriz: ${Fmt.bounded(M.kmo.overall, 2)}; Bartlett χ²(${M.bartlett.df}) = ${Fmt.num(M.bartlett.chi2, 1)}, ${Fmt.p(M.bartlett.p)}.`, `KMO of the matrix: ${Fmt.bounded(M.kmo.overall, 2)}; Bartlett χ²(${M.bartlett.df}) = ${Fmt.num(M.bartlett.chi2, 1)}, ${Fmt.p(M.bartlett.p)}.`));
  }
  const NLr = state.nonlin;
  if (NLr && !NLr.few) {
    cite('szekely2007', 'chatterjee2021', 'hoeffding1948', 'gretton2008', 'reshef2011', 'kraskov2004', 'breiman1985', 'genest1995');
    P.push({ h: L('Dependencia no lineal', 'Nonlinear dependence'), t: L(`Para ${esc(nm(NLr.kx))} y ${esc(nm(NLr.ky))} se midió la dependencia de cualquier forma con la correlación de distancias (Székely, Rizzo y Bakirov, 2007), el ξ de Chatterjee (2021), la D de Hoeffding (1948), el HSIC (Gretton et al., 2008), el MIC (Reshef et al., 2011), la información mutua por vecinos cercanos (Kraskov, Stögbauer y Grassberger, 2004) y la correlación máxima (Breiman y Friedman, 1985); la estructura de dependencia se describió con cópulas ajustadas por pseudoverosimilitud (Genest, Ghoudi y Rivest, 1995).`,
      `For ${esc(nm(NLr.kx))} and ${esc(nm(NLr.ky))}, dependence of any shape was measured with distance correlation (Székely, Rizzo and Bakirov, 2007), Chatterjee’s ξ (2021), Hoeffding’s D (1948), the HSIC (Gretton et al., 2008), the MIC (Reshef et al., 2011), nearest-neighbour mutual information (Kraskov, Stögbauer and Grassberger, 2004) and maximal correlation (Breiman and Friedman, 1985); the dependence structure was described with copulas fitted by pseudo-likelihood (Genest, Ghoudi and Rivest, 1995).`) });
    if (NLr.dcor) RES.push(L(`dCor entre ${esc(nm(NLr.kx))} y ${esc(nm(NLr.ky))}: ${Fmt.bounded(NLr.dcor.est, 2)}, ${Fmt.p(NLr.dcor.p)}.`, `dCor between ${esc(nm(NLr.kx))} and ${esc(nm(NLr.ky))}: ${Fmt.bounded(NLr.dcor.est, 2)}, ${Fmt.p(NLr.dcor.p)}.`));
  }
  const Pa = state.partial;
  if (Pa) {
    const bits = [];
    if (Pa.pair) { cat('partial'); bits.push(L('correlaciones parciales y semiparciales', 'partial and semipartial correlations')); }
    if (Pa.multiple) { cat('multipleR'); bits.push(L('la correlación múltiple', 'the multiple correlation')); }
    if (Pa.canonical) { cite('hotelling1936', 'bartlett1941'); bits.push(L('la correlación canónica con las pruebas de Wilks, Hotelling, Pillai y Roy (Hotelling, 1936)', 'canonical correlation with Wilks’, Hotelling’s, Pillai’s and Roy’s tests (Hotelling, 1936)')); }
    if (Pa.rv) { cite('robert1976', 'escoufier1973'); bits.push(L('el coeficiente RV (Robert y Escoufier, 1976)', 'the RV coefficient (Robert and Escoufier, 1976)')); }
    if (Pa.procrustes) { cite('gower1975', 'peresneto2001'); bits.push(L('el análisis de Procrustes con su prueba por permutación (Peres-Neto y Jackson, 2001)', 'Procrustes analysis with its permutation test (Peres-Neto and Jackson, 2001)')); }
    if (Pa.mantel) { cite('mantel1967', 'legendre2015'); bits.push(L('la prueba de Mantel (1967)', 'the Mantel test (1967)')); }
    if (Pa.coinertia) { cite('doledec1994'); bits.push(L('el análisis de coinercia (Dolédec y Chessel, 1994)', 'co-inertia analysis (Dolédec and Chessel, 1994)')); }
    if (bits.length) P.push({ h: L('Parcial y entre conjuntos', 'Partial and between sets'), t: L(`Se calcularon ${list(bits)}.`, `${list(bits).replace(/^./, s => s.toUpperCase())} were computed.`) });
    if (Pa.pair && isFinite(Pa.pair.partial && Pa.pair.partial.est)) RES.push(L(`Correlación parcial: ${Fmt.bounded(Pa.pair.partial.est, 2)}, ${Fmt.p(Pa.pair.partial.p)}.`, `Partial correlation: ${Fmt.bounded(Pa.pair.partial.est, 2)}, ${Fmt.p(Pa.pair.partial.p)}.`));
  }
  const Ca = state.categorical;
  if (Ca) {
    cite('cramer1946', 'bergsma2013', 'goodman1954', 'theil1970', 'olsson1979', 'olsson1982');
    P.push({ h: L('Variables categóricas y ordinales', 'Categorical and ordinal variables'), t: L('La asociación entre variables categóricas se probó con χ² de Pearson y se midió con la V de Cramér (con la corrección de sesgo de Bergsma, 2013), la λ y la τ de Goodman y Kruskal (1954) y la U de Theil (1970); entre ordinales, con las correlaciones tetracórica y policórica estimadas en dos pasos (Olsson, 1979), y entre una continua y una ordinal, con la poliserial (Olsson, Drasgow y Dorans, 1982).',
      'Association between categorical variables was tested with Pearson’s χ² and measured with Cramér’s V (with Bergsma’s 2013 bias correction), Goodman and Kruskal’s (1954) λ and τ and Theil’s (1970) U; between ordinal ones, with the tetrachoric and polychoric correlations estimated in two steps (Olsson, 1979), and between a continuous and an ordinal one, with the polyserial (Olsson, Drasgow and Dorans, 1982).') });
  }
  const Ag = state.agreement;
  if (Ag) {
    if (Ag.kind === 'cont') {
      cite('lin1989', 'bland1986', 'bland1999', 'mcgraw1996', 'koo2016', 'kendall1939', 'hayes2007');
      P.push({ h: L('Acuerdo y fiabilidad', 'Agreement and reliability'), t: L(`El acuerdo entre ${list(Ag.keys.map(k => esc(nm(k))))} se midió con el coeficiente de concordancia de Lin (1989), el análisis de Bland y Altman (1986, 1999), los coeficientes intraclase en las seis formas de McGraw y Wong (1996), interpretados según Koo y Li (2016), la W de Kendall y el α de Krippendorff (Hayes y Krippendorff, 2007).`,
        `Agreement between ${list(Ag.keys.map(k => esc(nm(k))))} was measured with Lin’s (1989) concordance coefficient, Bland and Altman’s analysis (1986, 1999), the intraclass correlations in McGraw and Wong’s (1996) six forms, read according to Koo and Li (2016), Kendall’s W and Krippendorff’s α (Hayes and Krippendorff, 2007).`) });
      if (Ag.ccc) RES.push(L(`CCC de Lin: ${Fmt.bounded(Ag.ccc.est, 2)}, ${Fmt.ci(Ag.ccc.lo, Ag.ccc.hi)}; sesgo medio ${Fmt.num(Ag.ba.bias, 2)}, límites de acuerdo ${Fmt.num(Ag.ba.lo, 2)} a ${Fmt.num(Ag.ba.hi, 2)}.`, `Lin’s CCC: ${Fmt.bounded(Ag.ccc.est, 2)}, ${Fmt.ci(Ag.ccc.lo, Ag.ccc.hi)}; mean bias ${Fmt.num(Ag.ba.bias, 2)}, limits of agreement ${Fmt.num(Ag.ba.lo, 2)} to ${Fmt.num(Ag.ba.hi, 2)}.`));
    } else {
      cite('cohen1960', 'cohen1968', 'fleiss1971', 'conger1980', 'gwet2008', 'hayes2007', 'landis1977');
      P.push({ h: L('Acuerdo entre evaluadores', 'Agreement between raters'), t: L('El acuerdo en categorías se midió con la κ de Cohen (1960) y su versión ponderada (Cohen, 1968), la κ de Fleiss (1971) y la de Conger (1980) para varios evaluadores, el AC1 de Gwet (2008) y el α de Krippendorff (Hayes y Krippendorff, 2007), y se leyó con la escala de Landis y Koch (1977).',
        'Agreement on categories was measured with Cohen’s (1960) κ and its weighted version (Cohen, 1968), Fleiss’ (1971) and Conger’s (1980) κ for several raters, Gwet’s (2008) AC1 and Krippendorff’s α (Hayes and Krippendorff, 2007), and read on Landis and Koch’s (1977) scale.') });
    }
  }
  const St = state.structure;
  if (St) {
    const bits = [];
    if (St.groups) { cite('simpson1951', 'robinson1950'); bits.push(L('las correlaciones dentro y entre grupos (para la paradoja de Simpson, 1951, y la falacia ecológica de Robinson, 1950)', 'the correlations within and between groups (for Simpson’s 1951 paradox and Robinson’s 1950 ecological fallacy)')); }
    if (St.rm) { cite('bakdash2017'); bits.push(L('la correlación de medidas repetidas (Bakdash y Marusich, 2017)', 'the repeated-measures correlation (Bakdash and Marusich, 2017)')); }
    if (St.ts) { cite('box1976', 'yule1926'); bits.push(L('la correlación cruzada de series preblanqueadas con un modelo autorregresivo (Box y Jenkins, 1976)', 'the cross-correlation of series prewhitened with an autoregressive model (Box and Jenkins, 1976)')); }
    if (St.space) { cite('clifford1989', 'dutilleul1993'); bits.push(L('la prueba t modificada de Dutilleul (1993) para datos espaciales', 'Dutilleul’s (1993) modified t test for spatial data')); }
    if (St.phylo) { cite('felsenstein1985', 'garland1992'); bits.push(L('los contrastes filogenéticamente independientes (Felsenstein, 1985)', 'phylogenetically independent contrasts (Felsenstein, 1985)')); }
    if (St.circ) { cite('jammalamadaka1988', 'mardia1976'); bits.push(L('la correlación circular (Jammalamadaka y SenGupta, 1988; Mardia, 1976)', 'circular correlation (Jammalamadaka and SenGupta, 1988; Mardia, 1976)')); }
    if (St.comp) { cite('aitchison1986', 'lovell2015', 'erb2016'); bits.push(L('la proporcionalidad ρp de datos composicionales tras la razón logarítmica centrada (Aitchison, 1986; Lovell et al., 2015)', 'the proportionality ρp of compositional data after the centred log-ratio (Aitchison, 1986; Lovell et al., 2015)')); }
    if (bits.length) P.push({ h: L('Datos con estructura', 'Structured data'), t: L(`Para respetar la estructura de los datos se usaron ${list(bits)}.`, `To respect the structure of the data, ${list(bits)} were used.`) });
  }
  const Nw = state.network;
  if (Nw) {
    cite('opsahl2010', 'brandes2001', 'newman2006', 'blondel2008', 'fruchterman1991');
    if (Nw.kind === 'lasso') cite('friedman2008', 'foygel2010', 'epskamp2018');
    const what = { lasso: L('correlaciones parciales regularizadas con el lazo gráfico (Friedman, Hastie y Tibshirani, 2008), eligiendo la penalización con el EBIC (Foygel y Drton, 2010)', 'partial correlations regularized with the graphical lasso (Friedman, Hastie and Tibshirani, 2008), choosing the penalty with the EBIC (Foygel and Drton, 2010)'), partial: L('correlaciones parciales significativas', 'significant partial correlations'), marginal: L('correlaciones con |r| sobre un umbral', 'correlations with |r| above a threshold'), msig: L('correlaciones significativas', 'significant correlations') }[Nw.kind];
    P.push({ h: L('Red de correlación', 'Correlation network'), t: L(`Se construyó una red de ${Nw.p} variables con ${what}. La fuerza, la cercanía y la intermediación se calcularon con caminos de longitud 1/|w| (Opsahl, Agneessens y Skvoretz, 2010; Brandes, 2001), y las comunidades maximizando la modularidad (Newman, 2006) con el método de Louvain (Blondel et al., 2008).`,
      `A network of ${Nw.p} variables was built with ${what}. Strength, closeness and betweenness were computed with paths of length 1/|w| (Opsahl, Agneessens and Skvoretz, 2010; Brandes, 2001), and the communities by maximizing modularity (Newman, 2006) with the Louvain method (Blondel et al., 2008).`) });
  }
  const In = state.inference;
  if (In) {
    const bits = [];
    if (In.compare) {
      const d = In.compare.design;
      if (d === 'indep') { cite('fisher1925', 'zou2007'); bits.push(L('las dos correlaciones de grupos independientes se compararon con la z de Fisher (1925) y el intervalo de Zou (2007)', 'the two correlations from independent groups were compared with Fisher’s (1925) z and Zou’s (2007) interval')); }
      else if (d === 'overlap') { cite('williams1959', 'steiger1980', 'hittner2003', 'zou2007'); bits.push(L('las dos correlaciones dependientes con una variable en común se compararon con la t de Williams (1959), la z de Hittner, May y Silver (2003) y el intervalo de Zou (2007)', 'the two dependent correlations with one variable in common were compared with Williams’ (1959) t, Hittner, May and Silver’s (2003) z and Zou’s (2007) interval')); }
      else { cite('raghunathan1996', 'silver2004', 'zou2007'); bits.push(L('las dos correlaciones dependientes sin variable en común se compararon con la z de Silver, Hittner y May (2004) y el intervalo de Zou (2007)', 'the two dependent correlations with no variable in common were compared with Silver, Hittner and May’s (2004) z and Zou’s (2007) interval')); }
      const t = In.compare.out.tests[0], z0 = In.compare.out.zou;
      RES.push(L(`Diferencia entre las correlaciones: ${Fmt.num(In.compare.out.diff, 3)}, IC de Zou [${Fmt.num(z0[0], 3)}, ${Fmt.num(z0[1], 3)}].`, `Difference between the correlations: ${Fmt.num(In.compare.out.diff, 3)}, Zou CI [${Fmt.num(z0[0], 3)}, ${Fmt.num(z0[1], 3)}].`));
      void t;
    }
    if (In.matrices) { cite('jennrich1970'); bits.push(L(`las matrices de los grupos ${esc(In.matrices.a)} y ${esc(In.matrices.b)} se compararon con la prueba de Jennrich (1970)`, `the matrices of groups ${esc(In.matrices.a)} and ${esc(In.matrices.b)} were compared with Jennrich’s (1970) test`)); RES.push(`Jennrich χ²(${In.matrices.jennrich.df}) = ${Fmt.num(In.matrices.jennrich.chi2, 2)}, ${Fmt.p(In.matrices.jennrich.p)}.`); }
    if (In.corrections && In.corrections.attenuation) { cite('spearman1904'); bits.push(L('se corrigió la atenuación por error de medida (Spearman, 1904)', 'attenuation by measurement error was corrected (Spearman, 1904)')); }
    if (In.corrections && In.corrections.restriction) { cite('thorndike1949', 'sackett2000'); bits.push(L(`se corrigió la restricción de rango (caso ${In.corrections.restriction.case} de Thorndike, 1949)`, `range restriction was corrected (Thorndike’s 1949 case ${In.corrections.restriction.case})`)); }
    if (In.plan) { cite('fisher1915', 'hotelling1953', 'bonett2000'); bits.push(L(`el tamaño de muestra se planeó con la distribución exacta de r (Fisher, 1915; Hotelling, 1953): para ρ = ${Fmt.bounded(In.plan.rho, 2)}, α = ${In.plan.alpha} y una potencia de ${Math.round(100 * In.plan.target)} % se necesitan ${In.plan.nExact} casos`, `the sample size was planned with the exact distribution of r (Fisher, 1915; Hotelling, 1953): for ρ = ${Fmt.bounded(In.plan.rho, 2)}, α = ${In.plan.alpha} and ${Math.round(100 * In.plan.target)}% power, ${In.plan.nExact} cases are needed`)); }
    if (In.meta) {
      const m = In.meta.out, A = m[In.meta.model];
      cite('dersimonian1986', 'viechtbauer2005', 'higgins2002', 'higgins2009', 'egger1997', 'hunter2004');
      bits.push(L(`${m.k} estudios se combinaron en la escala z de Fisher con un modelo ${In.meta.model === 'fixed' ? 'de efecto fijo' : `de efectos aleatorios (${In.meta.model === 'dl' ? 'DerSimonian y Laird, 1986' : In.meta.model === 'reml' ? 'REML; Viechtbauer, 2005' : 'Hunter y Schmidt, 2004'})`}, con la heterogeneidad descrita por Q, I² (Higgins y Thompson, 2002) y el intervalo de predicción (Higgins, Thompson y Spiegelhalter, 2009), y la asimetría del embudo probada con la regresión de Egger et al. (1997)`,
        `${m.k} studies were combined on Fisher’s z scale with a ${In.meta.model === 'fixed' ? 'fixed-effect' : `random-effects (${In.meta.model === 'dl' ? 'DerSimonian and Laird, 1986' : In.meta.model === 'reml' ? 'REML; Viechtbauer, 2005' : 'Hunter and Schmidt, 2004'})`} model, with heterogeneity described by Q, I² (Higgins and Thompson, 2002) and the prediction interval (Higgins, Thompson and Spiegelhalter, 2009), and funnel asymmetry tested with Egger et al.’s (1997) regression`));
      RES.push(L(`Correlación combinada: ${Fmt.bounded(A.r, 2)}, ${Fmt.ci(A.rci[0], A.rci[1])}; I² = ${Fmt.num(100 * A.I2, 1)} %.`, `Pooled correlation: ${Fmt.bounded(A.r, 2)}, ${Fmt.ci(A.rci[0], A.rci[1])}; I² = ${Fmt.num(100 * A.I2, 1)}%.`));
    }
    if (bits.length) P.push({ h: L('Comparar, corregir, planear y combinar', 'Compare, correct, plan and combine'), t: list(bits).replace(/^./, s => s.toUpperCase()) + '.' });
  }
  cite('apa2020');
  return { P, RES, refs };
}
/* «Pearson 1896; Ledoit y Wolf 2004» → «Pearson, 1896; Ledoit y Wolf, 2004» */
const apaBy = s => String(s).replace(/ (\d{4})/g, ', $1');
const sortedRefs = refs => [...refs].sort((a, b) => Theory.REFS[a][0].localeCompare(Theory.REFS[b][0], 'es'));
function paintMethods() {
  const W = writeAll();
  S.methods = W;
  clearMessages('b13MMsgs');
  if (!state.data) { el('b13Methods').innerHTML = ''; el('b13Refs').innerHTML = ''; showMessage('b13MMsgs', 'info', L2('Abre unos datos y usa los bloques: los métodos se redactan con lo que corras.', 'Open some data and use the blocks: the methods are written from what you run.')); return; }
  el('b13Methods').innerHTML = W.P.map(p => `<h4>${esc(p.h)}</h4><p>${p.t}</p>`).join('') + (W.RES.length ? `<h4>${esc(L('Resultados principales', 'Main results'))}</h4><ul>${W.RES.map(r => `<li>${r}</li>`).join('')}</ul>` : '') +
    `<p class="hint">${esc(L(`Los cálculos se hicieron con CorrelationPro ${VERSION}.`, `Computations were done with CorrelationPro ${VERSION}.`))}</p>`;
  el('b13Refs').innerHTML = sortedRefs(W.refs).map(k => `<li>${Theory.refText(k, I18N.lang)}</li>`).join('');
}

/* ================= the report ================= */
const STYLE_PROPS = ['fill', 'fill-opacity', 'stroke', 'stroke-width', 'stroke-opacity', 'stroke-dasharray', 'stroke-linecap', 'stroke-linejoin', 'opacity', 'font-family', 'font-size', 'font-weight', 'font-style', 'text-anchor', 'dominant-baseline', 'letter-spacing', 'text-transform', 'display', 'visibility', 'paint-order'];
/* a copy of the figure that carries its own colours (those of the light theme) */
function standalone(svg) {
  const root = document.documentElement, prev = root.getAttribute('data-theme');
  root.setAttribute('data-theme', 'light');
  const copy = svg.cloneNode(true), a = [svg, ...svg.querySelectorAll('*')], b = [copy, ...copy.querySelectorAll('*')];
  a.forEach((n, i) => {
    if (!b[i] || /^(defs|clipPath|title|style|script)$/i.test(n.tagName)) return;
    const cs = getComputedStyle(n);
    b[i].setAttribute('style', STYLE_PROPS.map(p => `${p}:${cs.getPropertyValue(p)}`).join(';'));
  });
  if (prev == null) root.removeAttribute('data-theme'); else root.setAttribute('data-theme', prev);
  copy.removeAttribute('class');
  const vb = (svg.getAttribute('viewBox') || '0 0 600 400').split(/\s+/).map(Number);
  copy.setAttribute('width', vb[2]); copy.setAttribute('height', vb[3]);
  copy.setAttribute('style', 'max-width:100%;height:auto;font-family:system-ui,sans-serif');
  return copy.outerHTML;
}
function reportHTML() {
  const ds = state.data, W = writeAll(), title = el('b13RTitle').value.trim() || L('Análisis de correlación', 'Correlation analysis'), author = el('b13RAuthor').value.trim();
  const date = new Date().toLocaleDateString(I18N.lang === 'en' ? 'en-GB' : 'es-MX', { year: 'numeric', month: 'long', day: 'numeric' });
  const figs = figureList().filter(f => S.include.has(f.id));
  let tableHtml = '';
  if (ds) { const T0 = tableData(); if (T0 && !T0.few) tableHtml = buildTable(T0).html; }
  const vars = ds ? ds.cols.filter(c => c.role !== 'exclude') : [];
  const body = `<header><h1>${esc(title)}</h1>${author ? `<p class="au">${esc(author)}</p>` : ''}<p class="dt">${esc(date)} · CorrelationPro ${VERSION}</p></header>` +
    (ds ? `<h2>${esc(L('Datos', 'Data'))}</h2><p>${esc(ds.title ? L(ds.title.es, ds.title.en) : ds.name)}: ${ds.n} ${esc(L('casos', 'cases'))}.</p><table class="vars"><thead><tr><th>${esc(L('Columna', 'Column'))}</th><th>${esc(L('Tipo', 'Kind'))}</th><th>${esc(L('Papel', 'Role'))}</th></tr></thead><tbody>${vars.map(c => `<tr><td>${esc(label(c))}</td><td>${esc(L(Data.TYPE_NAMES[c.type][0], Data.TYPE_NAMES[c.type][1]))}</td><td>${esc(Data.ROLE_NAMES[c.role] ? L(Data.ROLE_NAMES[c.role][0], Data.ROLE_NAMES[c.role][1]) : c.role)}</td></tr>`).join('')}</tbody></table>` : '') +
    (W.RES.length ? `<h2>${esc(L('Resultados principales', 'Main results'))}</h2><ul>${W.RES.map(r => `<li>${r}</li>`).join('')}</ul>` : '') +
    (tableHtml ? `<div class="tbl">${tableHtml}</div>` : '') +
    figs.map((f, i) => `<figure>${standalone(f.svg)}<figcaption><b>${esc(L('Figura', 'Figure'))} ${i + 1}.</b> ${esc(f.title)} (${esc(L('Bloque', 'Block'))} ${f.n}).</figcaption></figure>`).join('') +
    (W.P.length ? `<h2>${esc(L('Métodos', 'Methods'))}</h2>${W.P.map(p => `<h3>${esc(p.h)}</h3><p>${p.t}</p>`).join('')}<p>${esc(L(`Los cálculos se hicieron con CorrelationPro ${VERSION}, que corre en el navegador sin enviar datos a ningún servidor.`, `Computations were done with CorrelationPro ${VERSION}, which runs in the browser without sending data to any server.`))}</p>` : '') +
    (W.refs.size ? `<h2>${esc(L('Referencias', 'References'))}</h2><ol class="refs">${sortedRefs(W.refs).map(k => `<li>${Theory.refText(k, I18N.lang)}</li>`).join('')}</ol>` : '');
  return `<!DOCTYPE html><html lang="${I18N.lang}"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(title)}</title><style>
body{font-family:ui-serif,Georgia,serif;color:#111;background:#fff;max-width:780px;margin:32px auto;padding:0 18px;line-height:1.5;font-size:11.5pt}
h1{font-size:20pt;margin:0 0 4px}h2{font-size:14pt;margin:28px 0 8px;border-bottom:1px solid #999;padding-bottom:3px}h3{font-size:11.5pt;margin:16px 0 4px}
.au{margin:0;font-style:italic}.dt{margin:2px 0 0;color:#555;font-size:10pt}
table.vars{border-collapse:collapse;font-size:10pt}table.vars td,table.vars th{border-bottom:1px solid #ccc;padding:3px 10px;text-align:left}
.tbl{margin:22px 0;overflow-x:auto}figure{margin:22px 0;page-break-inside:avoid;break-inside:avoid}figure svg{display:block;margin:0 auto}figcaption{font-size:10pt;margin-top:6px}
ol.refs{font-size:10pt;padding-left:22px}ol.refs li{margin:0 0 5px}
@media print{body{margin:0;max-width:none}h2{break-after:avoid}}
</style></head><body>${body}</body></html>`;
}
function paintProject() {
  const ds = state.data;
  if (!el('b13RTitle').value) el('b13RTitle').value = ds ? L(`Análisis de correlación: ${ds.title ? ds.title.es : ds.name}`, `Correlation analysis: ${ds.title ? ds.title.en : ds.name}`) : L('Análisis de correlación', 'Correlation analysis');
  const used = STEPS.filter(s => s.n > 1 && s.n < 13 && state[{ 2: 'data', 3: 'explore', 4: 'pair', 5: 'matrix', 6: 'nonlin', 7: 'partial', 8: 'categorical', 9: 'agreement', 10: 'structure', 11: 'network', 12: 'inference' }[s.n]]);
  const nf = S.include.size;
  el('b13RSummary').innerHTML = `<p class="hint">${L2(`Incluye: ${used.length ? used.map(s => esc(s.es)).join(', ') : 'nada todavía'}; ${nf} figura${nf === 1 ? '' : 's'} marcada${nf === 1 ? '' : 's'} en «Figuras»; la tabla de correlaciones; los métodos y las referencias.`, `Includes: ${used.length ? used.map(s => esc(s.en)).join(', ') : 'nothing yet'}; ${nf} figure${nf === 1 ? '' : 's'} ticked in «Figures»; the correlation table; the methods and the references.`)}</p>`;
}
function openReport() {
  clearMessages('b13RMsgs');
  if (!state.data) { showMessage('b13RMsgs', 'warn', L2('Abre primero unos datos.', 'Open some data first.')); return; }
  const url = URL.createObjectURL(new Blob([reportHTML()], { type: 'text/html;charset=utf-8' }));
  const w = window.open(url, '_blank');
  if (!w) showMessage('b13RMsgs', 'warn', L2('El navegador bloqueó la pestaña nueva: usa «Descargar el informe».', 'The browser blocked the new tab: use «Download the report».'));
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

/* ================= the project package ================= */
function saveProject() {
  const ds = state.data;
  clearMessages('b13PkMsgs');
  if (!ds) { showMessage('b13PkMsgs', 'warn', L2('No hay datos abiertos que guardar.', 'There are no open data to save.')); return; }
  download(JSON.stringify(packProject()), (ds.name || 'proyecto').replace(/[^\w.-]+/g, '_') + '.correlationpro.json', 'application/json');
  showMessage('b13PkMsgs', 'ok', L2('Proyecto guardado.', 'Project saved.'));
}
function packProject() {
  const ds = state.data;
  return {
    format: 'correlationpro-project', version: 1, app: VERSION, saved: new Date().toISOString(),
    data: { name: ds.name, title: ds.title || null, n: ds.n, decimal: ds.decimal, missingCodes: ds.missingCodes || [], missingMode: ds.missingMode,
      cols: ds.cols.map(c => ({ name: c.name, raw: Array.from(c.raw, v => (v == null ? '' : String(v))), type: c.type, role: c.role, unit: c.unit || null, levels: c.levels || null, label: c.label || null })) },
    prefs: { palette: View.palette, invert: View.invert, fmt: { style: Fmt.opts.style, decimal: Fmt.opts.decimal }, customPal: Prefs.get('customPal', null), figFont: Prefs.get('figFont', 'sans') },
    report: { title: el('b13RTitle').value, author: el('b13RAuthor').value },
  };
}
function openProject(file) {
  clearMessages('b13PkMsgs');
  const rd = new FileReader();
  rd.onload = () => {
    try {
      const pk = JSON.parse(rd.result);
      if (!pk || pk.format !== 'correlationpro-project' || !pk.data || !Array.isArray(pk.data.cols)) throw new Error(L('no es un proyecto de esta app', 'it is not a project of this app'));
      const d = pk.data;
      const ds = Data.build(d.cols.map(c => c.name), d.cols.map(c => c.raw), { name: d.name, decimal: d.decimal || '.', missing: d.missingCodes || [], declared: d.cols.map(c => ({ name: c.name, type: c.type, role: c.role, unit: c.unit || undefined, levels: c.levels || undefined, label: c.label || undefined })), source: { project: true } });
      if (d.title) ds.title = d.title;
      if (pk.prefs) {
        if (pk.prefs.customPal) { Prefs.set('customPal', pk.prefs.customPal); Pal.register(paletteFrom(pk.prefs.customPal)); }
        if (pk.prefs.fmt) { Fmt.set(pk.prefs.fmt); Prefs.set('fmt', pk.prefs.fmt); document.dispatchEvent(new CustomEvent('fmtchange')); }
        if (pk.prefs.figFont) setFont(pk.prefs.figFont);
        if (pk.prefs.palette) View.palette = pk.prefs.palette;
        View.setInvert(!!pk.prefs.invert);
        View.setPalette(View.palette);
      }
      B2.useDataset(ds, L2(`Proyecto «${esc(file.name)}» abierto: ${ds.n} filas y ${ds.cols.length} columnas, guardado el ${esc(new Date(pk.saved).toLocaleString())}.`, `Project «${esc(file.name)}» opened: ${ds.n} rows and ${ds.cols.length} columns, saved on ${esc(new Date(pk.saved).toLocaleString())}.`));
      if (d.missingMode && d.missingMode !== state.data.missingMode) { state.data.missingMode = d.missingMode; document.dispatchEvent(new CustomEvent('datachange', { detail: { reason: 'missing' } })); }
      if (pk.report) { el('b13RTitle').value = pk.report.title || ''; el('b13RAuthor').value = pk.report.author || ''; }
      showMessage('b13PkMsgs', 'ok', L2('Proyecto abierto. Los bloques se recalculan al visitarlos.', 'Project opened. The blocks recompute when you visit them.'));
    } catch (e) { showMessage('b13PkMsgs', 'error', L2(`No se pudo abrir: ${esc(e.message)}.`, `It could not be opened: ${esc(e.message)}.`)); }
  };
  rd.readAsText(file);
}
function setFont(f) {
  if (!FONTS[f]) f = 'sans';
  Prefs.set('figFont', f);
  if (f === 'sans') document.documentElement.style.removeProperty('--fig-font'); else document.documentElement.style.setProperty('--fig-font', FONTS[f]);
}

/* ---------------- wiring ---------------- */
document.addEventListener('DOMContentLoaded', () => {
  if (!el('panel-13')) return;
  el('panel-13').querySelector('.b12-bar').addEventListener('click', e => { const b = e.target.closest('[data-sec]'); if (b) showSec(b.dataset.sec); });
  el('b13Gallery').addEventListener('click', onGallery);
  el('b13Gallery').addEventListener('change', onGallery);
  el('b13Font').addEventListener('change', () => { setFont(el('b13Font').value); paintGallery(); });
  ['b13HPos', 'b13HNeg', 'b13L1', 'b13C1'].forEach(id => el(id).addEventListener('input', paintPal));
  el('b13PFrom').addEventListener('change', () => { const p = Pal.get(el('b13PFrom').value); if (el('b13PFrom').value && p.kind === 'div') { setPalInputs({ hPos: p.hPos, hNeg: p.hNeg, L1: p.L1, C: 0.95 }); paintPal(); } });
  el('b13PUse').addEventListener('click', usePal);
  el('b13PAuto').addEventListener('click', autoNeg);
  el('b13PInv').addEventListener('click', () => View.setInvert(!View.invert));
  el('b13TIris').addEventListener('click', () => { B2.loadExample('iris'); goStep(13); showSec('table'); });
  el('b13TVars').addEventListener('click', e => { const b = e.target.closest('[data-k]'); if (!b) return; const k = b.dataset.k, i = S.tKeys.indexOf(k); if (i >= 0) S.tKeys.splice(i, 1); else S.tKeys.push(k); paintTable(); });
  ['b13TCoef', 'b13TSig', 'b13TAdj', 'b13TDig', 'b13TDesc'].forEach(id => el(id).addEventListener('change', paintTable));
  el('b13TStyle').addEventListener('change', () => {
    const v = el('b13TStyle').value, o = { style: v === 'nomc' ? 'nom' : v, decimal: v === 'nomc' ? ',' : '.' };
    Fmt.set(o); Prefs.set('fmt', o);
    document.dispatchEvent(new CustomEvent('fmtchange'));
  });
  el('b13TCopy').addEventListener('click', () => { if (S.table) copyHTML(S.table.B.html, S.table.B.rows.map(r => r.join('\t')).join('\n'), 'b13TMsgs'); });
  el('b13TCsv').addEventListener('click', () => { if (S.table) download('﻿' + S.table.B.rows.map(r => r.map(csvCell).join(',')).join('\r\n'), 'tabla_correlaciones.csv', 'text/csv;charset=utf-8'); });
  el('b13THtml').addEventListener('click', () => { if (S.table) download(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${esc(L('Tabla de correlaciones', 'Correlation table'))}</title></head><body>${S.table.B.html}</body></html>`, 'tabla_correlaciones.html', 'text/html;charset=utf-8'); });
  el('b13MCopy').addEventListener('click', () => { const h = el('b13Methods').innerHTML; copyHTML(h, el('b13Methods').innerText, 'b13MMsgs'); });
  el('b13MRefresh').addEventListener('click', paintMethods);
  el('b13RCopy').addEventListener('click', () => copyHTML(`<ol>${el('b13Refs').innerHTML}</ol>`, el('b13Refs').innerText, 'b13MMsgs'));
  el('b13ROpen').addEventListener('click', openReport);
  el('b13RDown').addEventListener('click', () => { if (!state.data) return; download(reportHTML(), (el('b13RTitle').value.trim() || 'informe').replace(/[^\w.-]+/g, '_').slice(0, 60) + '.html', 'text/html;charset=utf-8'); });
  el('b13PkSave').addEventListener('click', saveProject);
  el('b13PkOpen').addEventListener('change', e => { const f = e.target.files && e.target.files[0]; if (f) openProject(f); e.target.value = ''; });
});
document.addEventListener('datachange', () => { S.tKeys = null; S.include.clear(); el('b13RTitle') && (el('b13RTitle').value = ''); paint(); });
document.addEventListener('stepchange', e => { if (e.detail.step === 13) paint(); });
document.addEventListener('langchange', () => { const f = el('b13PFrom'); if (f) f.innerHTML = ''; paint(); });
document.addEventListener('fmtchange', paint);
document.addEventListener('palettechange', () => { if (S.sec === 'pal' || S.sec === 'figs') paint(); });
window.B13 = { state: S, writeAll, reportHTML, buildTable, tableData, packProject, openProject };
})();
